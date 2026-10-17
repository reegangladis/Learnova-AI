import uuid
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, Request, Response, status

from backend.app.api.deps import (
    clear_auth_cookies,
    get_auth_service,
    get_current_user,
    set_auth_cookies,
)
from backend.app.core.config import get_settings
from backend.app.core.errors import AppExceptions
from backend.app.models.user import User
from backend.app.schemas.auth import (
    AuthResponse,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    SessionResponse,
    VerifyEmailRequest,
)
from backend.app.schemas.user import UserResponse
from backend.app.services.auth_service import AuthService
from backend.app.services.rate_limiter import RateLimiter, rate_limit

settings = get_settings()
router = APIRouter(prefix="/auth", tags=["Authentication & Identity"])


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description="Registers an account, assigns default STUDENT role, generates verification token.",
    dependencies=[
        Depends(
            rate_limit(
                "auth_register", max_requests=settings.RATE_LIMIT_REGISTER_MAX_REQUESTS
            )
        )
    ],
)
async def register(
    payload: RegisterRequest,
    request: Request,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> AuthResponse:
    ip = RateLimiter.get_client_ip(request)
    ua = request.headers.get("user-agent")

    user, _ = await auth_service.register_user(
        data=payload,
        ip_address=ip,
        user_agent=ua,
    )

    return AuthResponse(
        success=True,
        user=UserResponse.model_validate(user),
        message="Account registered successfully. Please verify your email.",
    )


@router.post(
    "/login",
    response_model=AuthResponse,
    summary="Authenticate user and obtain session",
    description="Validates credentials, creates server session, sets secure HttpOnly cookies.",
    dependencies=[
        Depends(
            rate_limit(
                "auth_login", max_requests=settings.RATE_LIMIT_LOGIN_MAX_REQUESTS
            )
        )
    ],
)
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> AuthResponse:
    ip = RateLimiter.get_client_ip(request)
    ua = request.headers.get("user-agent")

    user, _session, access_token, refresh_token = await auth_service.authenticate_user(
        email=payload.email,
        password=payload.password,
        remember_me=payload.remember_me,
        ip_address=ip,
        user_agent=ua,
    )

    set_auth_cookies(
        response=response,
        access_token=access_token,
        refresh_token=refresh_token,
        remember_me=payload.remember_me,
    )

    return AuthResponse(
        success=True,
        user=UserResponse.model_validate(user),
        message="Authentication successful.",
    )


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Logout current session",
    description="Revokes current session and clears authentication cookies.",
)
async def logout(
    request: Request,
    response: Response,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
    current_user: Annotated[User | None, Depends(get_current_user)] = None,
    learnova_refresh_token: Annotated[str | None, Cookie()] = None,
) -> MessageResponse:
    ip = RateLimiter.get_client_ip(request)
    ua = request.headers.get("user-agent")
    token_val = (
        learnova_refresh_token
        or request.cookies.get(settings.REFRESH_TOKEN_COOKIE_NAME)
        or request.cookies.get("learnova_refresh_token")
    )

    await auth_service.logout_session(
        raw_refresh_token=token_val,
        user_id=current_user.id if current_user else None,
        ip_address=ip,
        user_agent=ua,
    )
    clear_auth_cookies(response)
    return MessageResponse(success=True, message="Logged out successfully.")


@router.post(
    "/refresh",
    response_model=AuthResponse,
    summary="Rotate refresh token and issue new session tokens",
    description="Validates HttpOnly refresh token cookie, rotates token family, issues new cookies.",
    dependencies=[Depends(rate_limit("auth_refresh", max_requests=20))],
)
async def refresh_token(
    request: Request,
    response: Response,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
    learnova_refresh_token: Annotated[str | None, Cookie()] = None,
) -> AuthResponse:
    token_val = (
        learnova_refresh_token
        or request.cookies.get(settings.REFRESH_TOKEN_COOKIE_NAME)
        or request.cookies.get("learnova_refresh_token")
    )
    if not token_val:
        raise AppExceptions.UnauthorizedException(
            message="Refresh token cookie missing."
        )

    ip = RateLimiter.get_client_ip(request)
    ua = request.headers.get("user-agent")

    (
        user,
        _session,
        access_token,
        new_refresh_token,
    ) = await auth_service.refresh_session(
        raw_refresh_token=token_val,
        ip_address=ip,
        user_agent=ua,
    )

    set_auth_cookies(
        response=response,
        access_token=access_token,
        refresh_token=new_refresh_token,
    )

    return AuthResponse(
        success=True,
        user=UserResponse.model_validate(user),
        message="Session refreshed successfully.",
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current authenticated user profile and roles",
)
async def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    summary="Request password reset link",
    description="Dispatches a password reset email if account exists.",
    dependencies=[Depends(rate_limit("auth_forgot_pwd", max_requests=5))],
)
async def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> MessageResponse:
    ip = RateLimiter.get_client_ip(request)
    ua = request.headers.get("user-agent")

    await auth_service.request_password_reset(
        email=payload.email,
        ip_address=ip,
        user_agent=ua,
    )
    return MessageResponse(
        success=True,
        message="If an account exists for this email, password reset instructions have been sent.",
    )


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    summary="Reset password using one-time token",
    dependencies=[Depends(rate_limit("auth_reset_pwd", max_requests=5))],
)
async def reset_password(
    payload: ResetPasswordRequest,
    request: Request,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> MessageResponse:
    ip = RateLimiter.get_client_ip(request)
    ua = request.headers.get("user-agent")

    await auth_service.reset_password(
        token=payload.token,
        new_password=payload.new_password,
        ip_address=ip,
        user_agent=ua,
    )
    return MessageResponse(
        success=True,
        message="Password has been reset successfully. Please sign in with your new password.",
    )


@router.post(
    "/change-password",
    response_model=MessageResponse,
    summary="Change password for authenticated user",
)
async def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> MessageResponse:
    ip = RateLimiter.get_client_ip(request)
    ua = request.headers.get("user-agent")

    await auth_service.change_password(
        user=current_user,
        current_password=payload.current_password,
        new_password=payload.new_password,
        ip_address=ip,
        user_agent=ua,
    )
    return MessageResponse(success=True, message="Password changed successfully.")


@router.post(
    "/verify-email",
    response_model=MessageResponse,
    summary="Verify user email address",
)
async def verify_email(
    payload: VerifyEmailRequest,
    request: Request,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> MessageResponse:
    ip = RateLimiter.get_client_ip(request)
    ua = request.headers.get("user-agent")

    await auth_service.verify_email(
        token=payload.token,
        ip_address=ip,
        user_agent=ua,
    )
    return MessageResponse(success=True, message="Email verified successfully.")


@router.post(
    "/resend-verification",
    response_model=MessageResponse,
    summary="Resend email verification token",
    dependencies=[Depends(rate_limit("auth_resend_verify", max_requests=5))],
)
async def resend_verification(
    payload: ResendVerificationRequest,
    request: Request,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> MessageResponse:
    ip = RateLimiter.get_client_ip(request)
    ua = request.headers.get("user-agent")

    await auth_service.resend_verification_email(
        email=payload.email,
        ip_address=ip,
        user_agent=ua,
    )
    return MessageResponse(
        success=True,
        message="If an unverified account exists for this email, a verification link has been resent.",
    )


@router.get(
    "/sessions",
    response_model=list[SessionResponse],
    summary="List active sessions for current user",
)
async def list_sessions(
    current_user: Annotated[User, Depends(get_current_user)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> list[SessionResponse]:
    sessions = await auth_service.session_repo.get_user_active_sessions(current_user.id)
    return [
        SessionResponse(
            id=s.id,
            ip_address=s.ip_address,
            user_agent=s.user_agent,
            is_active=s.is_active,
            expires_at=s.expires_at,
            created_at=s.created_at,
        )
        for s in sessions
    ]


@router.delete(
    "/sessions/{session_id}",
    response_model=MessageResponse,
    summary="Revoke a specific session",
)
async def revoke_session(
    session_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> MessageResponse:
    target_session = await auth_service.session_repo.get_session_by_id(session_id)
    if not target_session or target_session.user_id != current_user.id:
        raise AppExceptions.NotFoundException(message="Session not found.")

    await auth_service.session_repo.revoke_session(session_id)
    return MessageResponse(success=True, message="Session revoked successfully.")


@router.post(
    "/logout-all",
    response_model=MessageResponse,
    summary="Revoke all active sessions for current user",
)
async def logout_all(
    request: Request,
    response: Response,
    current_user: Annotated[User, Depends(get_current_user)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> MessageResponse:
    ip = RateLimiter.get_client_ip(request)
    ua = request.headers.get("user-agent")

    await auth_service.logout_all_sessions(
        user_id=current_user.id,
        ip_address=ip,
        user_agent=ua,
    )
    clear_auth_cookies(response)
    return MessageResponse(success=True, message="All sessions revoked successfully.")
