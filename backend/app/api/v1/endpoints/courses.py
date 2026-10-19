import math
import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, status

from backend.app.api.deps import (
    get_course_service,
    get_current_user,
    get_current_user_optional,
)
from backend.app.models.course import Course
from backend.app.models.user import User
from backend.app.schemas.course import (
    CourseCreate,
    CourseDetailResponse,
    CourseListResponse,
    CourseResponse,
    CourseUpdate,
    LessonCreate,
    LessonReorderRequest,
    LessonResponse,
    LessonUpdate,
    ModuleCreate,
    ModuleReorderRequest,
    ModuleResponse,
    ModuleUpdate,
)
from backend.app.services.course_service import CourseService

router = APIRouter(prefix="/courses", tags=["Courses & Authoring"])
modules_router = APIRouter(prefix="/modules", tags=["Course Modules"])
lessons_router = APIRouter(prefix="/lessons", tags=["Course Lessons"])


def to_course_response(course: Course) -> CourseResponse:
    modules_count = len(course.modules) if "modules" in course.__dict__ and course.modules else 0
    lessons_count = 0
    if "modules" in course.__dict__ and course.modules:
        for m in course.modules:
            if "lessons" in m.__dict__ and m.lessons:
                lessons_count += len(m.lessons)

    return CourseResponse(
        id=course.id,
        organization_id=course.organization_id,
        instructor_id=course.instructor_id,
        instructor=course.instructor,
        category_id=course.category_id,
        category=course.category,
        title=course.title,
        slug=course.slug,
        short_description=course.short_description,
        description=course.description,
        thumbnail_url=course.thumbnail_url,
        difficulty=course.difficulty,
        duration_minutes=course.duration_minutes,
        learning_objectives=course.learning_objectives,
        prerequisites=course.prerequisites,
        status=course.status,
        language=course.language,
        published_at=course.published_at,
        created_at=course.created_at,
        updated_at=course.updated_at,
        modules_count=modules_count,
        lessons_count=lessons_count,
    )


def to_course_detail_response(
    course: Course, current_user: User | None
) -> CourseDetailResponse:
    base = to_course_response(course)
    modules: list[ModuleResponse] = []

    # Check if user is instructor or admin or has full view
    is_owner_or_staff = False
    if current_user:
        user_roles = {r.upper() for r in current_user.role_names}
        is_owner_or_staff = (
            "SUPER_ADMIN" in user_roles
            or "ADMIN" in user_roles
            or current_user.id == course.instructor_id
        )

    if "modules" in course.__dict__ and course.modules:
        for mod in course.modules:
            lessons_list: list[LessonResponse] = []
            if "lessons" in mod.__dict__ and mod.lessons:
                for les in mod.lessons:
                    # If not preview and not owner/staff, sanitize sensitive text/url for visitors
                    text_content = les.text_content
                    resource_url = les.resource_url
                    if not is_owner_or_staff and not les.is_preview:
                        text_content = None
                        resource_url = None

                    lessons_list.append(
                        LessonResponse(
                            id=les.id,
                            module_id=les.module_id,
                            title=les.title,
                            description=les.description,
                            content_type=les.content_type,
                            text_content=text_content,
                            resource_url=resource_url,
                            duration_minutes=les.duration_minutes,
                            order_index=les.order_index,
                            is_preview=les.is_preview,
                            text_extraction_status=les.text_extraction_status,
                            content_processing_status=les.content_processing_status,
                            last_processed_at=les.last_processed_at,
                            metadata_json=les.metadata_json,
                            created_at=les.created_at,
                            updated_at=les.updated_at,
                        )
                    )
            modules.append(
                ModuleResponse(
                    id=mod.id,
                    course_id=mod.course_id,
                    title=mod.title,
                    description=mod.description,
                    order_index=mod.order_index,
                    lessons=lessons_list,
                    created_at=mod.created_at,
                    updated_at=mod.updated_at,
                )
            )

    return CourseDetailResponse(
        **base.model_dump(),
        modules=modules,
    )


# ==============================================================================
# Course Endpoints
# ==============================================================================


@router.get(
    "",
    response_model=CourseListResponse,
    summary="List courses with search, filtering, and pagination",
)
async def list_courses(
    course_service: Annotated[CourseService, Depends(get_course_service)],
    current_user: Annotated[User | None, Depends(get_current_user_optional)] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    search: Annotated[str | None, Query(max_length=100)] = None,
    category_id: Annotated[uuid.UUID | None, Query()] = None,
    difficulty: Annotated[str | None, Query()] = None,
    status: Annotated[str | None, Query()] = None,
    instructor_id: Annotated[uuid.UUID | None, Query()] = None,
    sort_by: Annotated[str, Query()] = "created_at",
    sort_order: Annotated[Literal["asc", "desc"], Query()] = "desc",
) -> CourseListResponse:
    courses, total = await course_service.list_courses(
        current_user=current_user,
        page=page,
        page_size=page_size,
        search=search,
        category_id=category_id,
        difficulty=difficulty,
        status=status,
        instructor_id=instructor_id,
        sort_by=sort_by,
        sort_order=sort_order,
    )

    total_pages = math.ceil(total / page_size) if total > 0 else 0
    items = [to_course_response(c) for c in courses]

    return CourseListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post(
    "",
    response_model=CourseDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new course",
)
async def create_course(
    payload: CourseCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    course_service: Annotated[CourseService, Depends(get_course_service)],
) -> CourseDetailResponse:
    course = await course_service.create_course(payload, current_user)
    return to_course_detail_response(course, current_user)


@router.get(
    "/{course_id}",
    response_model=CourseDetailResponse,
    summary="Get course details with modules and lessons",
)
async def get_course_detail(
    course_id: uuid.UUID,
    course_service: Annotated[CourseService, Depends(get_course_service)],
    current_user: Annotated[User | None, Depends(get_current_user_optional)] = None,
) -> CourseDetailResponse:
    course = await course_service.get_course_detail(course_id, current_user)
    return to_course_detail_response(course, current_user)


@router.patch(
    "/{course_id}",
    response_model=CourseDetailResponse,
    summary="Update course metadata and syllabus",
)
async def update_course(
    course_id: uuid.UUID,
    payload: CourseUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    course_service: Annotated[CourseService, Depends(get_course_service)],
) -> CourseDetailResponse:
    course = await course_service.update_course(course_id, payload, current_user)
    return to_course_detail_response(course, current_user)


@router.delete(
    "/{course_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a course",
)
async def delete_course(
    course_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    course_service: Annotated[CourseService, Depends(get_course_service)],
) -> None:
    await course_service.delete_course(course_id, current_user)


@router.post(
    "/{course_id}/publish",
    response_model=CourseDetailResponse,
    summary="Validate completeness and publish course",
)
async def publish_course(
    course_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    course_service: Annotated[CourseService, Depends(get_course_service)],
) -> CourseDetailResponse:
    course = await course_service.publish_course(course_id, current_user)
    return to_course_detail_response(course, current_user)


@router.post(
    "/{course_id}/archive",
    response_model=CourseDetailResponse,
    summary="Archive a course",
)
async def archive_course(
    course_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    course_service: Annotated[CourseService, Depends(get_course_service)],
) -> CourseDetailResponse:
    course = await course_service.archive_course(course_id, current_user)
    return to_course_detail_response(course, current_user)


@router.post(
    "/{course_id}/unpublish",
    response_model=CourseDetailResponse,
    summary="Revert published course back to draft status",
)
async def unpublish_course(
    course_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    course_service: Annotated[CourseService, Depends(get_course_service)],
) -> CourseDetailResponse:
    course = await course_service.unpublish_course(course_id, current_user)
    return to_course_detail_response(course, current_user)


@router.post(
    "/{course_id}/unarchive",
    response_model=CourseDetailResponse,
    summary="Restore archived course back to draft status",
)
async def unarchive_course(
    course_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    course_service: Annotated[CourseService, Depends(get_course_service)],
) -> CourseDetailResponse:
    course = await course_service.unarchive_course(course_id, current_user)
    return to_course_detail_response(course, current_user)


@router.get(
    "/{course_id}/modules",
    response_model=list[ModuleResponse],
    summary="Get all modules for a course",
)
async def get_course_modules(
    course_id: uuid.UUID,
    course_service: Annotated[CourseService, Depends(get_course_service)],
    current_user: Annotated[User | None, Depends(get_current_user_optional)] = None,
) -> list[ModuleResponse]:
    modules = await course_service.get_course_modules(course_id, current_user)
    return [ModuleResponse.model_validate(m) for m in modules]


@router.post(
    "/{course_id}/modules",
    response_model=ModuleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a module in a course",
)
async def create_module(
    course_id: uuid.UUID,
    payload: ModuleCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    course_service: Annotated[CourseService, Depends(get_course_service)],
) -> ModuleResponse:
    module = await course_service.create_module(course_id, payload, current_user)
    return ModuleResponse.model_validate(module)


# ==============================================================================
# Module Endpoints
# ==============================================================================


@modules_router.patch(
    "/{module_id}",
    response_model=ModuleResponse,
    summary="Update a course module",
)
async def update_module(
    module_id: uuid.UUID,
    payload: ModuleUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    course_service: Annotated[CourseService, Depends(get_course_service)],
) -> ModuleResponse:
    module = await course_service.update_module(module_id, payload, current_user)
    return ModuleResponse.model_validate(module)


@modules_router.delete(
    "/{module_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a course module",
)
async def delete_module(
    module_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    course_service: Annotated[CourseService, Depends(get_course_service)],
) -> None:
    await course_service.delete_module(module_id, current_user)


@modules_router.post(
    "/{module_id}/reorder",
    response_model=ModuleResponse,
    summary="Reorder a course module",
)
async def reorder_module(
    module_id: uuid.UUID,
    payload: ModuleReorderRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    course_service: Annotated[CourseService, Depends(get_course_service)],
) -> ModuleResponse:
    module = await course_service.reorder_module(
        module_id, payload.order_index, current_user
    )
    return ModuleResponse.model_validate(module)


@modules_router.post(
    "/{module_id}/lessons",
    response_model=LessonResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a lesson inside a module",
)
async def create_lesson(
    module_id: uuid.UUID,
    payload: LessonCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    course_service: Annotated[CourseService, Depends(get_course_service)],
) -> LessonResponse:
    lesson = await course_service.create_lesson(module_id, payload, current_user)
    return LessonResponse.model_validate(lesson)


# ==============================================================================
# Lesson Endpoints
# ==============================================================================


@lessons_router.patch(
    "/{lesson_id}",
    response_model=LessonResponse,
    summary="Update a lesson",
)
async def update_lesson(
    lesson_id: uuid.UUID,
    payload: LessonUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    course_service: Annotated[CourseService, Depends(get_course_service)],
) -> LessonResponse:
    lesson = await course_service.update_lesson(lesson_id, payload, current_user)
    return LessonResponse.model_validate(lesson)


@lessons_router.delete(
    "/{lesson_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a lesson",
)
async def delete_lesson(
    lesson_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    course_service: Annotated[CourseService, Depends(get_course_service)],
) -> None:
    await course_service.delete_lesson(lesson_id, current_user)


@lessons_router.post(
    "/{lesson_id}/reorder",
    response_model=LessonResponse,
    summary="Reorder a lesson within its module",
)
async def reorder_lesson(
    lesson_id: uuid.UUID,
    payload: LessonReorderRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    course_service: Annotated[CourseService, Depends(get_course_service)],
) -> LessonResponse:
    lesson = await course_service.reorder_lesson(
        lesson_id, payload.order_index, current_user
    )
    return LessonResponse.model_validate(lesson)


@lessons_router.get(
    "/{lesson_id}",
    response_model=LessonResponse,
    summary="Get single lesson details with preview / enrollment validation",
)
async def get_lesson(
    lesson_id: uuid.UUID,
    course_service: Annotated[CourseService, Depends(get_course_service)],
    current_user: Annotated[User | None, Depends(get_current_user_optional)] = None,
) -> LessonResponse:
    lesson = await course_service.get_lesson_detail(lesson_id, current_user)
    return LessonResponse.model_validate(lesson)

