import uuid
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.models.session import RefreshToken, Session


class SessionRepository:
    """Data access repository for User Sessions and Refresh Tokens."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_session(
        self,
        user_id: uuid.UUID,
        expires_at: datetime,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> Session:
        """Creates an active session for a user."""
        session = Session(
            user_id=user_id,
            expires_at=expires_at,
            ip_address=ip_address,
            user_agent=user_agent,
            is_active=True,
        )
        self.db.add(session)
        await self.db.flush()
        return session

    async def get_session_by_id(self, session_id: uuid.UUID) -> Session | None:
        """Finds a session by primary key ID."""
        stmt = (
            select(Session)
            .where(Session.id == session_id)
            .options(selectinload(Session.refresh_tokens))
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_user_active_sessions(self, user_id: uuid.UUID) -> list[Session]:
        """Returns all non-expired, active sessions for a user."""
        now = datetime.now(timezone.utc)
        stmt = (
            select(Session)
            .where(
                Session.user_id == user_id,
                Session.is_active == True,
                Session.expires_at > now,
            )
            .order_by(Session.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def revoke_session(self, session_id: uuid.UUID) -> None:
        """Marks a session and its associated refresh tokens as inactive/revoked."""
        now = datetime.now(timezone.utc)
        await self.db.execute(
            update(Session).where(Session.id == session_id).values(is_active=False)
        )
        await self.db.execute(
            update(RefreshToken)
            .where(RefreshToken.session_id == session_id)
            .values(is_revoked=True, revoked_at=now)
        )
        await self.db.flush()

    async def revoke_all_user_sessions(
        self, user_id: uuid.UUID, except_session_id: uuid.UUID | None = None
    ) -> None:
        """Revokes all active sessions for a given user."""
        now = datetime.now(timezone.utc)
        stmt = update(Session).where(Session.user_id == user_id)
        if except_session_id:
            stmt = stmt.where(Session.id != except_session_id)
        stmt = stmt.values(is_active=False)
        await self.db.execute(stmt)

        token_stmt = (
            update(RefreshToken)
            .where(
                RefreshToken.session_id.in_(
                    select(Session.id).where(Session.user_id == user_id)
                )
            )
            .values(is_revoked=True, revoked_at=now)
        )
        if except_session_id:
            token_stmt = token_stmt.where(RefreshToken.session_id != except_session_id)
        await self.db.execute(token_stmt)
        await self.db.flush()

    async def create_refresh_token(
        self,
        session_id: uuid.UUID,
        token_hash: str,
        token_family: str,
        expires_at: datetime,
    ) -> RefreshToken:
        """Stores a new hashed refresh token."""
        token = RefreshToken(
            session_id=session_id,
            token_hash=token_hash,
            token_family=token_family,
            expires_at=expires_at,
            is_revoked=False,
        )
        self.db.add(token)
        await self.db.flush()
        return token

    async def get_refresh_token_by_hash(self, token_hash: str) -> RefreshToken | None:
        """Finds a refresh token by exact SHA-256 hash."""
        stmt = (
            select(RefreshToken)
            .where(RefreshToken.token_hash == token_hash)
            .options(selectinload(RefreshToken.session))
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def revoke_refresh_token(
        self, token_id: uuid.UUID, replaced_by_token_id: uuid.UUID | None = None
    ) -> None:
        """Marks a single refresh token as revoked and links the replacement token ID."""
        now = datetime.now(timezone.utc)
        await self.db.execute(
            update(RefreshToken)
            .where(RefreshToken.id == token_id)
            .values(
                is_revoked=True,
                revoked_at=now,
                replaced_by_token_id=replaced_by_token_id,
            )
        )
        await self.db.flush()

    async def revoke_token_family(self, token_family: str) -> None:
        """Revokes all refresh tokens in a family and invalidates associated sessions (Reuse Detection)."""
        now = datetime.now(timezone.utc)
        # 1. Revoke all tokens with this family
        await self.db.execute(
            update(RefreshToken)
            .where(RefreshToken.token_family == token_family)
            .values(is_revoked=True, revoked_at=now)
        )
        # 2. Deactivate any sessions tied to this token family
        session_ids_subquery = select(RefreshToken.session_id).where(
            RefreshToken.token_family == token_family
        )
        await self.db.execute(
            update(Session)
            .where(Session.id.in_(session_ids_subquery))
            .values(is_active=False)
        )
        await self.db.flush()
