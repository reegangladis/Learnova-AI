import uuid
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.models.token import EmailVerificationToken, PasswordResetToken


class TokenRepository:
    """Data access repository for Password Reset and Email Verification Tokens."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_password_reset_token(
        self, user_id: uuid.UUID, token_hash: str, expires_at: datetime
    ) -> PasswordResetToken:
        """Stores a new hashed password reset token."""
        token = PasswordResetToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
            is_used=False,
        )
        self.db.add(token)
        await self.db.flush()
        return token

    async def get_password_reset_token(
        self, token_hash: str
    ) -> PasswordResetToken | None:
        """Finds an unused password reset token by hash with user loaded."""
        stmt = (
            select(PasswordResetToken)
            .where(PasswordResetToken.token_hash == token_hash)
            .options(selectinload(PasswordResetToken.user))
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def mark_password_reset_token_used(self, token_id: uuid.UUID) -> None:
        """Marks a password reset token as used."""
        now = datetime.now(timezone.utc)
        await self.db.execute(
            update(PasswordResetToken)
            .where(PasswordResetToken.id == token_id)
            .values(is_used=True, used_at=now)
        )
        await self.db.flush()

    async def create_email_verification_token(
        self, user_id: uuid.UUID, token_hash: str, expires_at: datetime
    ) -> EmailVerificationToken:
        """Stores a new hashed email verification token."""
        token = EmailVerificationToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
            is_used=False,
        )
        self.db.add(token)
        await self.db.flush()
        return token

    async def get_email_verification_token(
        self, token_hash: str
    ) -> EmailVerificationToken | None:
        """Finds an email verification token by hash with user loaded."""
        stmt = (
            select(EmailVerificationToken)
            .where(EmailVerificationToken.token_hash == token_hash)
            .options(selectinload(EmailVerificationToken.user))
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def mark_email_verification_token_used(self, token_id: uuid.UUID) -> None:
        """Marks an email verification token as used."""
        now = datetime.now(timezone.utc)
        await self.db.execute(
            update(EmailVerificationToken)
            .where(EmailVerificationToken.id == token_id)
            .values(is_used=True, used_at=now)
        )
        await self.db.flush()
