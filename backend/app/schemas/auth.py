import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from backend.app.schemas.user import UserResponse


class RegisterRequest(BaseModel):
    """User registration payload."""

    email: EmailStr = Field(..., description="User email address")
    password: str = Field(
        ...,
        min_length=8,
        description="Password (min 8 chars, uppercase, lowercase, digit, special)",
    )
    confirm_password: str = Field(..., description="Password confirmation")
    first_name: str = Field(..., min_length=1, max_length=100, description="First name")
    last_name: str = Field(..., min_length=1, max_length=100, description="Last name")
    organization_slug: str | None = Field(
        None, description="Optional organization slug for multi-tenancy"
    )

    @model_validator(mode="after")
    def check_passwords_match(self) -> "RegisterRequest":
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match.")
        return self


class LoginRequest(BaseModel):
    """User credentials login payload."""

    email: EmailStr = Field(..., description="Registered email address")
    password: str = Field(..., description="Account password")
    remember_me: bool = Field(default=False, description="Extend session lifetime flag")


class ForgotPasswordRequest(BaseModel):
    """Password reset request payload."""

    email: EmailStr = Field(..., description="Registered account email")


class ResetPasswordRequest(BaseModel):
    """Password reset confirmation payload with token."""

    token: str = Field(..., min_length=10, description="One-time password reset token")
    new_password: str = Field(..., min_length=8, description="New account password")
    confirm_password: str = Field(..., description="Confirm new password")

    @model_validator(mode="after")
    def check_passwords_match(self) -> "ResetPasswordRequest":
        if self.new_password != self.confirm_password:
            raise ValueError("Passwords do not match.")
        return self


class ChangePasswordRequest(BaseModel):
    """Authenticated user change password payload."""

    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, description="New password")
    confirm_password: str = Field(..., description="Confirm new password")

    @model_validator(mode="after")
    def check_passwords_match(self) -> "ChangePasswordRequest":
        if self.new_password != self.confirm_password:
            raise ValueError("Passwords do not match.")
        return self


class VerifyEmailRequest(BaseModel):
    """Email verification payload."""

    token: str = Field(..., min_length=10, description="One-time verification token")


class ResendVerificationRequest(BaseModel):
    """Resend email verification token payload."""

    email: EmailStr = Field(..., description="Registered email address")


class AuthResponse(BaseModel):
    """Authentication response payload."""

    success: bool = True
    user: UserResponse
    message: str | None = None


class SessionResponse(BaseModel):
    """User session diagnostic metadata."""

    id: uuid.UUID
    ip_address: str | None = None
    user_agent: str | None = None
    is_active: bool
    is_current: bool = False
    expires_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    """Generic operation confirmation message."""

    success: bool = True
    message: str
