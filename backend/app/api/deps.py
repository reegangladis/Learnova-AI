import uuid
from collections.abc import Callable
from typing import Annotated

from fastapi import Cookie, Depends, Header, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import get_settings
from backend.app.core.errors import AppExceptions
from backend.app.core.security import decode_access_token
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.repositories.user_repo import UserRepository
from backend.app.services.analytics_service import AnalyticsService
from backend.app.services.auth_service import AuthService
from backend.app.services.course_service import CourseService
from backend.app.services.learning_service import LearningService
from backend.app.services.ml_service import MLService
from backend.app.services.quiz_service import QuizService
from backend.app.services.user_service import UserService

settings = get_settings()


def set_auth_cookies(
    response: Response,
    access_token: str,
    refresh_token: str,
    remember_me: bool = False,
) -> None:
    """Sets HttpOnly, Secure (in production), SameSite cookies for authentication."""
    access_max_age = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    refresh_days = (
        settings.REFRESH_TOKEN_EXPIRE_DAYS * 2
        if remember_me
        else settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    refresh_max_age = refresh_days * 24 * 60 * 60

    # 1. Access Token Cookie
    response.set_cookie(
        key=settings.ACCESS_TOKEN_COOKIE_NAME,
        value=access_token,
        max_age=access_max_age,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
        path="/",
    )

    # 2. Refresh Token Cookie
    response.set_cookie(
        key=settings.REFRESH_TOKEN_COOKIE_NAME,
        value=refresh_token,
        max_age=refresh_max_age,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
        path="/api/v1/auth",  # Restricted path for refresh token cookie
    )


def clear_auth_cookies(response: Response) -> None:
    """Clears authentication cookies on logout."""
    response.delete_cookie(
        key=settings.ACCESS_TOKEN_COOKIE_NAME,
        path="/",
        domain=settings.COOKIE_DOMAIN,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
    )
    response.delete_cookie(
        key=settings.REFRESH_TOKEN_COOKIE_NAME,
        path="/api/v1/auth",
        domain=settings.COOKIE_DOMAIN,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
    )


from datetime import datetime, timezone
from fastapi.security import OAuth2PasswordBearer
from backend.app.redis.session_service import get_redis_session_service
from backend.app.repositories.session_repo import SessionRepository

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_PREFIX}/auth/token",
    auto_error=False,
)


def _ensure_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


async def get_current_user_optional(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    learnova_access_token: Annotated[str | None, Cookie()] = None,
    authorization: Annotated[str | None, Header()] = None,
    bearer_token: Annotated[str | None, Depends(oauth2_scheme)] = None,
) -> User | None:
    """Extracts authenticated user from HttpOnly cookie or Authorization Bearer header,

    validating active session status against Redis with database fallback.
    """
    token: str | None = (
        learnova_access_token
        or request.cookies.get(settings.ACCESS_TOKEN_COOKIE_NAME)
        or request.cookies.get("learnova_access_token")
        or bearer_token
    )
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]

    if not token:
        return None

    try:
        payload = decode_access_token(token)
        user_id_str = payload.get("sub")
        session_id_str = payload.get("sid")
        if not user_id_str:
            return None

        # 1. Validate session against Redis if session_id is in payload
        if session_id_str:
            redis_svc = get_redis_session_service()
            if await redis_svc.is_session_revoked(session_id_str):
                return None

            redis_session = await redis_svc.get_session(session_id_str)
            if redis_session:
                if not redis_session.get("is_active", True):
                    return None
            else:
                # Fallback: query PostgreSQL sessions table
                session_repo = SessionRepository(db)
                try:
                    db_sess = await session_repo.get_session_by_id(
                        uuid.UUID(session_id_str)
                    )
                    now_utc = datetime.now(timezone.utc)
                    sess_exp = _ensure_utc(db_sess.expires_at) if db_sess else None
                    if (
                        not db_sess
                        or not db_sess.is_active
                        or (sess_exp and sess_exp <= now_utc)
                    ):
                        return None
                except Exception:
                    pass

        # 2. Retrieve user
        user_repo = UserRepository(db)
        user = await user_repo.get_by_id(uuid.UUID(user_id_str))
        if not user or not user.is_active:
            return None
        return user
    except Exception:  # noqa: BLE001
        return None


async def get_current_user(
    user: Annotated[User | None, Depends(get_current_user_optional)],
) -> User:
    """Requires an authenticated active user."""
    if not user:
        raise AppExceptions.UnauthorizedException(
            message="Authentication credentials were not provided or are invalid."
        )
    return user


def require_role(*allowed_roles: str) -> Callable[[User], User]:
    """Dependency factory restricting access to users with at least one matching role."""
    normalized_allowed = {r.upper().strip() for r in allowed_roles}

    def role_checker(current_user: Annotated[User, Depends(get_current_user)]) -> User:
        user_roles = {r.upper() for r in current_user.role_names}
        # SUPER_ADMIN has platform-wide access
        if "SUPER_ADMIN" in user_roles:
            return current_user

        if not user_roles.intersection(normalized_allowed):
            raise AppExceptions.ForbiddenException(
                message=f"Access forbidden: Requires one of roles: {', '.join(allowed_roles)}"
            )
        return current_user

    return role_checker


def require_permission(*required_permissions: str) -> Callable[[User], User]:
    """Dependency factory restricting access to users possessing the specified permissions."""
    normalized_required = {p.upper().strip() for p in required_permissions}

    def permission_checker(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        user_roles = {r.upper() for r in current_user.role_names}
        if "SUPER_ADMIN" in user_roles:
            return current_user

        user_perms = {p.upper() for p in current_user.permission_codes}
        if not normalized_required.issubset(user_perms):
            missing = normalized_required - user_perms
            raise AppExceptions.ForbiddenException(
                message=f"Access forbidden: Missing required permissions: {', '.join(missing)}"
            )
        return current_user

    return permission_checker


def get_auth_service(db: Annotated[AsyncSession, Depends(get_db)]) -> AuthService:
    return AuthService(db)


def get_user_service(db: Annotated[AsyncSession, Depends(get_db)]) -> UserService:
    return UserService(db)


def get_course_service(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CourseService:
    return CourseService(db)


def get_learning_service(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> LearningService:
    return LearningService(db)


def get_quiz_service(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> QuizService:
    return QuizService(db)


def get_analytics_service(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AnalyticsService:
    return AnalyticsService(db)


def get_ml_service(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MLService:
    return MLService(db)



