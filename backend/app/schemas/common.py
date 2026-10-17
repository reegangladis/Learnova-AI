from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class APIErrorDetails(BaseModel):
    """Structured error payload schema."""

    code: str = Field(..., description="Machine-readable error identifier")
    message: str = Field(..., description="Human-readable error description")
    details: Any | None = Field(
        None, description="Supplemental context or validation issues"
    )


class APIResponse(BaseModel, Generic[T]):
    """Standardized API response envelope for successful operations."""

    success: bool = Field(default=True, description="Success flag")
    data: T | None = Field(None, description="Payload data")
    message: str | None = Field(None, description="Optional informational message")


class ErrorResponse(BaseModel):
    """Standardized API response envelope for error scenarios."""

    success: bool = Field(default=False, description="Failure flag")
    error: APIErrorDetails = Field(..., description="Error descriptor")


class PaginationMeta(BaseModel):
    """Pagination metadata descriptor."""

    total: int = Field(..., description="Total available records")
    page: int = Field(..., description="Current page number (1-indexed)")
    page_size: int = Field(..., description="Number of records per page")
    total_pages: int = Field(..., description="Total calculated pages")


class PaginatedResponse(BaseModel, Generic[T]):
    """Standardized paginated API envelope."""

    success: bool = Field(default=True, description="Success flag")
    data: list[T] = Field(..., description="List of items for current page")
    pagination: PaginationMeta = Field(..., description="Pagination metadata")
