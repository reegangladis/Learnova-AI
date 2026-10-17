import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import get_settings
from backend.app.core.errors import AppExceptions
from backend.app.core.rbac import SystemRole
from backend.app.core.security import (
    create_access_token,
    generate_secure_random_token,
    hash_password,
    hash_token,
    validate_password_strength,
    verify_password,
)
from backend.app.models.session import Session
from backend.app.models.user import User
from backend.app.repositories.audit_repo import AuditRepository
from backend.app.repositories.role_repo import RoleRepository
from backend.app.repositories.session_repo import SessionRepository
from backend.app.repositories.token_repo import TokenRepository
from backend.app.repositories.user_repo import UserRepository
from backend.app.schemas.auth import RegisterRequest
from backend.app.services.email import get_email_service

settings = get_settings()


def ensure_utc(dt: datetime | None) -> datetime | None:
    """Ensures datetime is timezone-aware in UTC for safe comparisons across all database dialects."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


class AuthService:
    """Core domain service orchestrating authentication, sessions, tokens, and verification."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
        self.role_repo = RoleRepository(db)
        self.session_repo = SessionRepository(db)
        self.token_repo = TokenRepository(db)
        self.audit_repo = AuditRepository(db)
        self.email_service = get_email_service()

    async def register_user(
        self,
        data: RegisterRequest,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> tuple[User, str]:
        """Registers a new user, assigns default STUDENT role, generates verification token, and audits."""
        # 1. Validate password strength
        is_valid, error_msg = validate_password_strength(data.password)
        if not is_valid:
            raise AppExceptions.ValidationException(
                message=error_msg or "Password does not meet requirements."
            )

        # 2. Check for duplicate email
        existing_user = await self.user_repo.get_by_email(data.email)
        if existing_user:
            raise AppExceptions.ConflictException(
                message="An account with this email address already exists."
            )

        # 3. Handle optional organization
        org_id = None
        if data.organization_slug:
            org = await self.user_repo.get_or_create_organization(
                name=data.organization_slug.replace("-", " ").title(),
                slug=data.organization_slug,
            )
            org_id = org.id

        # 4. Hash password and create user
        pwd_hash = hash_password(data.password)
        user = await self.user_repo.create(
            email=data.email,
            password_hash=pwd_hash,
            first_name=data.first_name,
            last_name=data.last_name,
            organization_id=org_id,
            is_active=True,
            is_verified=False,
        )

        # 5. Ensure roles exist and assign default STUDENT role
        await self.role_repo.ensure_default_roles_and_permissions()
        student_role = await self.role_repo.get_role_by_name(SystemRole.STUDENT.value)
        if student_role:
            await self.role_repo.assign_role_to_user(user, student_role)

        # 6. Generate one-time email verification token
        raw_verification_token = generate_secure_random_token(32)
        token_hash = hash_token(raw_verification_token)
        expires_at = datetime.now(timezone.utc) + timedelta(
            hours=settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS
        )
        await self.token_repo.create_email_verification_token(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
        )

        # 7. Audit log
        await self.audit_repo.record_audit_event(
            event_type="USER_REGISTERED",
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={"email": user.email, "role": SystemRole.STUDENT.value},
        )

        # 8. Send verification email
        await self.email_service.send_verification_email(
            email=user.email,
            token=raw_verification_token,
            recipient_name=user.first_name,
        )

        # Refresh user entity with loaded relationships
        loaded_user = await self.user_repo.get_by_id(user.id)
        return loaded_user or user, raw_verification_token

    async def authenticate_user(
        self,
        email: str,
        password: str,
        remember_me: bool = False,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> tuple[User, Session, str, str]:
        """Authenticates credentials, manages lockout, creates session, and issues access + refresh tokens."""
        now = datetime.now(timezone.utc)
        user = await self.user_repo.get_by_email(email)

        # Generic authentication failure helper to avoid user enumeration
        async def fail_auth(reason: str, audit_reason: str):
            await self.audit_repo.record_login_attempt(
                email_attempted=email,
                success=False,
                user_id=user.id if user else None,
                ip_address=ip_address,
                user_agent=user_agent,
                failure_reason=audit_reason,
            )
            if user:
                await self.audit_repo.record_audit_event(
                    event_type="LOGIN_FAILURE",
                    user_id=user.id,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    metadata={"reason": audit_reason},
                )
            await self.db.commit()
            raise AppExceptions.UnauthorizedException(
                message="Invalid email or password."
            )

        if not user:
            await fail_auth("User not found", "USER_NOT_FOUND")

        # Check if account is locked
        locked_until = ensure_utc(user.locked_until)
        if locked_until and locked_until > now:
            lockout_remaining = int((locked_until - now).total_seconds() // 60) + 1
            await self.audit_repo.record_login_attempt(
                email_attempted=email,
                success=False,
                user_id=user.id,
                ip_address=ip_address,
                user_agent=user_agent,
                failure_reason="ACCOUNT_LOCKED",
            )
            await self.db.commit()
            raise AppExceptions.AccountLockedException(
                message=(
                    f"Account is temporarily locked due to consecutive failed login attempts. "
                    f"Please try again in {lockout_remaining} minute(s)."
                ),
                details={"locked_until": locked_until.isoformat()},
            )

        # Check if account is active
        if not user.is_active:
            await fail_auth("Account inactive", "ACCOUNT_DISABLED")

        # Verify password
        if not verify_password(password, user.password_hash):
            attempts = await self.user_repo.increment_failed_login(
                user=user,
                max_attempts=settings.MAX_FAILED_LOGIN_ATTEMPTS,
                lockout_minutes=settings.ACCOUNT_LOCKOUT_MINUTES,
            )
            if attempts >= settings.MAX_FAILED_LOGIN_ATTEMPTS:
                await self.audit_repo.record_audit_event(
                    event_type="ACCOUNT_LOCKED",
                    user_id=user.id,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    metadata={"failed_attempts": attempts},
                )
            await self.db.commit()
            await fail_auth("Password incorrect", "INVALID_CREDENTIALS")

        # Successful authentication: reset failed attempts & update last login
        await self.user_repo.update_last_login(user)

        # Create Session
        session_duration = (
            timedelta(days=settings.SESSION_EXPIRE_DAYS * 2)
            if remember_me
            else timedelta(days=settings.SESSION_EXPIRE_DAYS)
        )
        session_expires_at = now + session_duration
        session = await self.session_repo.create_session(
            user_id=user.id,
            expires_at=session_expires_at,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        # Create Refresh Token with a unique rotation family
        raw_refresh_token = generate_secure_random_token(48)
        refresh_token_hash = hash_token(raw_refresh_token)
        token_family = str(uuid.uuid4())
        refresh_expires_at = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        await self.session_repo.create_refresh_token(
            session_id=session.id,
            token_hash=refresh_token_hash,
            token_family=token_family,
            expires_at=refresh_expires_at,
        )

        # Create Access Token
        access_token = create_access_token(
            user_id=user.id,
            email=user.email,
            roles=user.role_names,
            permissions=user.permission_codes,
            session_id=session.id,
        )

        # Record login history & audit log
        await self.audit_repo.record_login_attempt(
            email_attempted=email,
            success=True,
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await self.audit_repo.record_audit_event(
            event_type="LOGIN_SUCCESS",
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={"session_id": str(session.id)},
        )

        return user, session, access_token, raw_refresh_token

    async def refresh_session(
        self,
        raw_refresh_token: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> tuple[User, Session, str, str]:
        """Validates refresh token, executes rotation, detects reuse, and generates new token pair."""
        now = datetime.now(timezone.utc)
        token_hash = hash_token(raw_refresh_token)

        refresh_token_record = await self.session_repo.get_refresh_token_by_hash(
            token_hash
        )
        if not refresh_token_record:
            raise AppExceptions.UnauthorizedException(message="Invalid refresh token.")

        session = await self.session_repo.get_session_by_id(
            refresh_token_record.session_id
        )
        session_expires_at = ensure_utc(session.expires_at) if session else None
        if (
            not session
            or not session.is_active
            or not session_expires_at
            or session_expires_at <= now
        ):
            raise AppExceptions.UnauthorizedException(
                message="Session has expired or is invalid."
            )

        user = await self.user_repo.get_by_id(session.user_id)
        if not user or not user.is_active:
            raise AppExceptions.UnauthorizedException(
                message="User account is inactive or not found."
            )

        # REFRESH TOKEN REUSE DETECTION
        if refresh_token_record.is_revoked:
            # A revoked token was presented again! Invalidate the entire token family & session immediately.
            await self.session_repo.revoke_token_family(
                refresh_token_record.token_family
            )
            await self.audit_repo.record_audit_event(
                event_type="REFRESH_TOKEN_REUSE_DETECTED",
                user_id=user.id,
                ip_address=ip_address,
                user_agent=user_agent,
                metadata={
                    "token_family": refresh_token_record.token_family,
                    "session_id": str(session.id),
                },
            )
            await self.db.commit()
            raise AppExceptions.UnauthorizedException(
                message="Security alert: Refresh token reuse detected. All sessions revoked."
            )

        # Check if refresh token itself has expired
        token_expires_at = ensure_utc(refresh_token_record.expires_at)
        if token_expires_at and token_expires_at <= now:
            await self.session_repo.revoke_refresh_token(refresh_token_record.id)
            raise AppExceptions.UnauthorizedException(
                message="Refresh token has expired."
            )

        # TOKEN ROTATION: Generate new refresh token in the same family
        new_raw_refresh_token = generate_secure_random_token(48)
        new_token_hash = hash_token(new_raw_refresh_token)
        new_refresh_expires_at = now + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )

        new_refresh_token_record = await self.session_repo.create_refresh_token(
            session_id=session.id,
            token_hash=new_token_hash,
            token_family=refresh_token_record.token_family,
            expires_at=new_refresh_expires_at,
        )

        # Revoke the old refresh token and link replacement
        await self.session_repo.revoke_refresh_token(
            token_id=refresh_token_record.id,
            replaced_by_token_id=new_refresh_token_record.id,
        )

        # Create new Access Token
        access_token = create_access_token(
            user_id=user.id,
            email=user.email,
            roles=user.role_names,
            permissions=user.permission_codes,
            session_id=session.id,
        )

        await self.audit_repo.record_audit_event(
            event_type="REFRESH_TOKEN_ROTATED",
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={"session_id": str(session.id)},
        )

        return user, session, access_token, new_raw_refresh_token

    async def logout_session(
        self,
        raw_refresh_token: str | None = None,
        session_id: uuid.UUID | None = None,
        user_id: uuid.UUID | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> None:
        """Revokes the current active session and associated refresh tokens."""
        target_session_id = session_id
        if not target_session_id and raw_refresh_token:
            token_hash = hash_token(raw_refresh_token)
            token_rec = await self.session_repo.get_refresh_token_by_hash(token_hash)
            if token_rec:
                target_session_id = token_rec.session_id

        if target_session_id:
            await self.session_repo.revoke_session(target_session_id)
            await self.audit_repo.record_audit_event(
                event_type="LOGOUT",
                user_id=user_id,
                ip_address=ip_address,
                user_agent=user_agent,
                metadata={"session_id": str(target_session_id)},
            )

    async def logout_all_sessions(
        self,
        user_id: uuid.UUID,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> None:
        """Revokes all active sessions for the user across all devices."""
        await self.session_repo.revoke_all_user_sessions(user_id=user_id)
        await self.audit_repo.record_audit_event(
            event_type="SESSION_REVOKED",
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={"scope": "ALL_SESSIONS"},
        )

    async def request_password_reset(
        self,
        email: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> bool:
        """Generates a one-time password reset token and dispatches reset instructions."""
        user = await self.user_repo.get_by_email(email)
        if not user or not user.is_active:
            # Do not reveal email non-existence
            return True

        raw_reset_token = generate_secure_random_token(32)
        token_hash = hash_token(raw_reset_token)
        expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES
        )

        await self.token_repo.create_password_reset_token(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
        )

        await self.audit_repo.record_audit_event(
            event_type="PASSWORD_RESET_REQUESTED",
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        await self.email_service.send_password_reset_email(
            email=user.email,
            token=raw_reset_token,
            recipient_name=user.first_name,
        )
        return True

    async def reset_password(
        self,
        token: str,
        new_password: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> None:
        """Validates reset token, updates password hash, revokes existing sessions and token."""
        is_valid, error_msg = validate_password_strength(new_password)
        if not is_valid:
            raise AppExceptions.ValidationException(
                message=error_msg or "Password does not meet requirements."
            )

        token_hash = hash_token(token)
        token_rec = await self.token_repo.get_password_reset_token(token_hash)
        now = datetime.now(timezone.utc)
        reset_expires_at = ensure_utc(token_rec.expires_at) if token_rec else None

        if (
            not token_rec
            or token_rec.is_used
            or not reset_expires_at
            or reset_expires_at <= now
        ):
            raise AppExceptions.ValidationException(
                message="Password reset token is invalid or has expired."
            )

        user = token_rec.user
        if not user or not user.is_active:
            raise AppExceptions.ValidationException(
                message="Account is inactive or not found."
            )

        # Update password
        user.password_hash = hash_password(new_password)
        user.failed_login_attempts = 0
        user.locked_until = None

        # Mark token as used
        await self.token_repo.mark_password_reset_token_used(token_rec.id)

        # Invalidate all existing sessions for security
        await self.session_repo.revoke_all_user_sessions(user.id)

        await self.audit_repo.record_audit_event(
            event_type="PASSWORD_RESET_COMPLETED",
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
        )

    async def change_password(
        self,
        user: User,
        current_password: str,
        new_password: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> None:
        """Allows an authenticated user to update their account password."""
        if not verify_password(current_password, user.password_hash):
            raise AppExceptions.ValidationException(
                message="Current password is incorrect."
            )

        is_valid, error_msg = validate_password_strength(new_password)
        if not is_valid:
            raise AppExceptions.ValidationException(
                message=error_msg or "New password does not meet requirements."
            )

        user.password_hash = hash_password(new_password)
        await self.db.flush()

        await self.audit_repo.record_audit_event(
            event_type="PASSWORD_CHANGED",
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
        )

    async def verify_email(
        self,
        token: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> None:
        """Validates verification token and marks account as verified."""
        token_hash = hash_token(token)
        token_rec = await self.token_repo.get_email_verification_token(token_hash)
        now = datetime.now(timezone.utc)
        verify_expires_at = ensure_utc(token_rec.expires_at) if token_rec else None

        if (
            not token_rec
            or token_rec.is_used
            or not verify_expires_at
            or verify_expires_at <= now
        ):
            raise AppExceptions.ValidationException(
                message="Email verification token is invalid or has expired."
            )

        user = token_rec.user
        if not user:
            raise AppExceptions.ValidationException(message="User account not found.")

        user.is_verified = True
        await self.token_repo.mark_email_verification_token_used(token_rec.id)

        await self.audit_repo.record_audit_event(
            event_type="EMAIL_VERIFIED",
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
        )

    async def resend_verification_email(
        self,
        email: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> None:
        """Issues a new email verification token if the account is not already verified."""
        user = await self.user_repo.get_by_email(email)
        if not user or user.is_verified or not user.is_active:
            # Do not reveal email non-existence or already verified status
            return

        raw_token = generate_secure_random_token(32)
        token_hash = hash_token(raw_token)
        expires_at = datetime.now(timezone.utc) + timedelta(
            hours=settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS
        )

        await self.token_repo.create_email_verification_token(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
        )

        await self.email_service.send_verification_email(
            email=user.email,
            token=raw_token,
            recipient_name=user.first_name,
        )
