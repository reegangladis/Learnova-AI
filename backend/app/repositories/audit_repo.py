import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.audit import AuditLog, LoginHistory


class AuditRepository:
    """Data access repository for recording security audit events and login history."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def record_login_attempt(
        self,
        email_attempted: str,
        success: bool,
        user_id: uuid.UUID | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
        failure_reason: str | None = None,
    ) -> LoginHistory:
        """Records an attempt to authenticate."""
        record = LoginHistory(
            user_id=user_id,
            email_attempted=email_attempted.lower().strip(),
            success=success,
            ip_address=ip_address,
            user_agent=user_agent,
            failure_reason=failure_reason,
        )
        self.db.add(record)
        await self.db.flush()
        return record

    async def record_audit_event(
        self,
        event_type: str,
        user_id: uuid.UUID | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> AuditLog:
        """Appends an immutable security audit event."""
        log = AuditLog(
            user_id=user_id,
            event_type=event_type,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata_json=metadata or {},
        )
        self.db.add(log)
        await self.db.flush()
        return log
