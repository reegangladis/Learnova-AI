import logging
from abc import ABC, abstractmethod

from backend.app.core.config import get_settings

logger = logging.getLogger("learnova.email")
settings = get_settings()


class BaseEmailService(ABC):
    """Abstract interface for application transactional email delivery."""

    @abstractmethod
    async def send_verification_email(
        self, email: str, token: str, recipient_name: str
    ) -> bool:
        """Sends account email verification link containing one-time token."""

    @abstractmethod
    async def send_password_reset_email(
        self, email: str, token: str, recipient_name: str
    ) -> bool:
        """Sends password reset link containing one-time token."""


class DevelopmentEmailService(BaseEmailService):
    """Development and testing email service logger.

    Safely logs simulated transactional emails in development/test mode without
    external dependencies.
    """

    async def send_verification_email(
        self, email: str, token: str, recipient_name: str
    ) -> bool:
        frontend_url = "http://localhost:5173"
        verification_link = f"{frontend_url}/verify-email?token={token}"
        logger.info(
            f"[DEV EMAIL] Verification email to {recipient_name} <{email}>: {verification_link}"
        )
        return True

    async def send_password_reset_email(
        self, email: str, token: str, recipient_name: str
    ) -> bool:
        frontend_url = "http://localhost:5173"
        reset_link = f"{frontend_url}/reset-password?token={token}"
        logger.info(
            f"[DEV EMAIL] Password reset email to {recipient_name} <{email}>: {reset_link}"
        )
        return True


_email_service_instance: BaseEmailService | None = None


def get_email_service() -> BaseEmailService:
    """Returns the singleton email service instance."""
    global _email_service_instance
    if _email_service_instance is None:
        _email_service_instance = DevelopmentEmailService()
    return _email_service_instance
