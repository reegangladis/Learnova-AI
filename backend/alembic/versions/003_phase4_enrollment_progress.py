"""Phase 4: Student Learning System & Progress Tracking Schema Migration.

Revision ID: 003_phase4_enrollment_progress
Revises: 002_phase3_courses
Create Date: 2026-10-11 15:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "003_phase4_enrollment_progress"
down_revision: str | None = "002_phase3_courses"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Enrollments table
    op.create_table(
        "enrollments",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("course_id", sa.UUID(), nullable=False),
        sa.Column(
            "status",
            sa.String(length=50),
            nullable=False,
            server_default="active",
        ),
        sa.Column(
            "enrolled_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "completed_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["course_id"],
            ["courses.id"],
            name="fk_enrollments_course_id_courses",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_enrollments_user_id_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "course_id", name="uq_enrollments_user_course"),
    )
    op.create_index(op.f("ix_enrollments_id"), "enrollments", ["id"], unique=False)
    op.create_index(op.f("ix_enrollments_user_id"), "enrollments", ["user_id"], unique=False)
    op.create_index(op.f("ix_enrollments_course_id"), "enrollments", ["course_id"], unique=False)
    op.create_index(op.f("ix_enrollments_status"), "enrollments", ["status"], unique=False)

    # 2. Lesson Progress table
    op.create_table(
        "lesson_progress",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("lesson_id", sa.UUID(), nullable=False),
        sa.Column("course_id", sa.UUID(), nullable=False),
        sa.Column(
            "is_completed",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "completed_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["course_id"],
            ["courses.id"],
            name="fk_lesson_progress_course_id_courses",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["lesson_id"],
            ["lessons.id"],
            name="fk_lesson_progress_lesson_id_lessons",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_lesson_progress_user_id_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "lesson_id", name="uq_lesson_progress_user_lesson"),
    )
    op.create_index(op.f("ix_lesson_progress_id"), "lesson_progress", ["id"], unique=False)
    op.create_index(op.f("ix_lesson_progress_user_id"), "lesson_progress", ["user_id"], unique=False)
    op.create_index(op.f("ix_lesson_progress_lesson_id"), "lesson_progress", ["lesson_id"], unique=False)
    op.create_index(op.f("ix_lesson_progress_course_id"), "lesson_progress", ["course_id"], unique=False)
    op.create_index(op.f("ix_lesson_progress_is_completed"), "lesson_progress", ["is_completed"], unique=False)


def downgrade() -> None:
    # 2. Drop Lesson Progress
    op.drop_index(op.f("ix_lesson_progress_is_completed"), table_name="lesson_progress")
    op.drop_index(op.f("ix_lesson_progress_course_id"), table_name="lesson_progress")
    op.drop_index(op.f("ix_lesson_progress_lesson_id"), table_name="lesson_progress")
    op.drop_index(op.f("ix_lesson_progress_user_id"), table_name="lesson_progress")
    op.drop_index(op.f("ix_lesson_progress_id"), table_name="lesson_progress")
    op.drop_table("lesson_progress")

    # 1. Drop Enrollments
    op.drop_index(op.f("ix_enrollments_status"), table_name="enrollments")
    op.drop_index(op.f("ix_enrollments_course_id"), table_name="enrollments")
    op.drop_index(op.f("ix_enrollments_user_id"), table_name="enrollments")
    op.drop_index(op.f("ix_enrollments_id"), table_name="enrollments")
    op.drop_table("enrollments")
