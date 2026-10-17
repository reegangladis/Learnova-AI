"""Phase 3: Course Management & Content Authoring Schema Migration.

Revision ID: 002_phase3_courses
Revises: 001_phase2_auth_models
Create Date: 2026-10-11 12:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "002_phase3_courses"
down_revision: str | None = "001_phase2_auth_models"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Course Categories table
    op.create_table(
        "course_categories",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")
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
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_course_categories_id"), "course_categories", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_course_categories_slug"), "course_categories", ["slug"], unique=True
    )

    # 2. Courses table
    op.create_table(
        "courses",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("organization_id", sa.UUID(), nullable=True),
        sa.Column("instructor_id", sa.UUID(), nullable=False),
        sa.Column("category_id", sa.UUID(), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=255), nullable=False),
        sa.Column("short_description", sa.String(length=500), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("thumbnail_url", sa.String(length=500), nullable=True),
        sa.Column(
            "difficulty",
            sa.String(length=50),
            nullable=False,
            server_default="beginner",
        ),
        sa.Column(
            "duration_minutes",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "learning_objectives",
            sa.JSON(),
            nullable=False,
            server_default=sa.text("'[]'"),
        ),
        sa.Column(
            "prerequisites",
            sa.JSON(),
            nullable=False,
            server_default=sa.text("'[]'"),
        ),
        sa.Column(
            "status",
            sa.String(length=50),
            nullable=False,
            server_default="draft",
        ),
        sa.Column(
            "language",
            sa.String(length=50),
            nullable=False,
            server_default="en",
        ),
        sa.Column(
            "published_at",
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
            ["category_id"],
            ["course_categories.id"],
            name="fk_courses_category_id_course_categories",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["instructor_id"],
            ["users.id"],
            name="fk_courses_instructor_id_users",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name="fk_courses_organization_id_organizations",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_courses_id"), "courses", ["id"], unique=False)
    op.create_index(op.f("ix_courses_slug"), "courses", ["slug"], unique=True)
    op.create_index(
        op.f("ix_courses_organization_id"), "courses", ["organization_id"], unique=False
    )
    op.create_index(
        op.f("ix_courses_instructor_id"), "courses", ["instructor_id"], unique=False
    )
    op.create_index(
        op.f("ix_courses_category_id"), "courses", ["category_id"], unique=False
    )
    op.create_index(op.f("ix_courses_status"), "courses", ["status"], unique=False)

    # 3. Course Modules table
    op.create_table(
        "course_modules",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("course_id", sa.UUID(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "order_index",
            sa.Integer(),
            nullable=False,
            server_default="0",
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
            name="fk_course_modules_course_id_courses",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_course_modules_id"), "course_modules", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_course_modules_course_id"),
        "course_modules",
        ["course_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_course_modules_order_index"),
        "course_modules",
        ["order_index"],
        unique=False,
    )

    # 4. Lessons table
    op.create_table(
        "lessons",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("module_id", sa.UUID(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "content_type",
            sa.String(length=50),
            nullable=False,
            server_default="text",
        ),
        sa.Column("text_content", sa.Text(), nullable=True),
        sa.Column("resource_url", sa.String(length=1000), nullable=True),
        sa.Column(
            "duration_minutes",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "order_index",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "is_preview",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "text_extraction_status",
            sa.String(length=50),
            nullable=False,
            server_default="pending",
        ),
        sa.Column(
            "content_processing_status",
            sa.String(length=50),
            nullable=False,
            server_default="pending",
        ),
        sa.Column(
            "last_processed_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "metadata_json",
            sa.JSON(),
            nullable=False,
            server_default=sa.text("'{}'"),
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
            ["module_id"],
            ["course_modules.id"],
            name="fk_lessons_module_id_course_modules",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_lessons_id"), "lessons", ["id"], unique=False)
    op.create_index(
        op.f("ix_lessons_module_id"), "lessons", ["module_id"], unique=False
    )
    op.create_index(
        op.f("ix_lessons_order_index"), "lessons", ["order_index"], unique=False
    )


def downgrade() -> None:
    op.drop_table("lessons")
    op.drop_table("course_modules")
    op.drop_table("courses")
    op.drop_table("course_categories")
