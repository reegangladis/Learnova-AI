"""Phase 4: Video Playback Progress & Session Tracking Schema Migration.

Revision ID: 006_phase4_video_progress
Revises: 005_phase7_ai_tutor_rag
Create Date: 2026-10-21 10:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "006_phase4_video_progress"
down_revision: str | None = "005_phase7_ai_tutor_rag"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Add video playback progress and last accessed timestamp columns to lesson_progress
    op.add_column(
        "lesson_progress",
        sa.Column(
            "playback_position_seconds",
            sa.Float(),
            nullable=False,
            server_default="0.0",
        ),
    )
    op.add_column(
        "lesson_progress",
        sa.Column(
            "playback_duration_seconds",
            sa.Float(),
            nullable=False,
            server_default="0.0",
        ),
    )
    op.add_column(
        "lesson_progress",
        sa.Column(
            "last_accessed_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("lesson_progress", "last_accessed_at")
    op.drop_column("lesson_progress", "playback_duration_seconds")
    op.drop_column("lesson_progress", "playback_position_seconds")
