from enum import Enum


class SystemRole(str, Enum):
    """System-defined standard user roles."""

    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    INSTRUCTOR = "INSTRUCTOR"
    STUDENT = "STUDENT"


class SystemPermission(str, Enum):
    """Granular system permissions."""

    USER_READ = "USER_READ"
    USER_CREATE = "USER_CREATE"
    USER_UPDATE = "USER_UPDATE"
    USER_DELETE = "USER_DELETE"

    COURSE_READ = "COURSE_READ"
    COURSE_CREATE = "COURSE_CREATE"
    COURSE_UPDATE = "COURSE_UPDATE"
    COURSE_DELETE = "COURSE_DELETE"
    COURSE_PUBLISH = "COURSE_PUBLISH"

    QUIZ_READ = "QUIZ_READ"
    QUIZ_CREATE = "QUIZ_CREATE"
    QUIZ_UPDATE = "QUIZ_UPDATE"
    QUIZ_DELETE = "QUIZ_DELETE"
    QUIZ_PUBLISH = "QUIZ_PUBLISH"
    QUIZ_TAKE = "QUIZ_TAKE"

    STUDENT_READ = "STUDENT_READ"
    STUDENT_MANAGE = "STUDENT_MANAGE"

    ANALYTICS_READ = "ANALYTICS_READ"
    SYSTEM_MANAGE = "SYSTEM_MANAGE"

    AI_USE = "AI_USE"
    ML_READ = "ML_READ"


# Default Role -> Permissions mapping
DEFAULT_ROLE_PERMISSIONS: dict[str, list[str]] = {
    SystemRole.SUPER_ADMIN.value: [p.value for p in SystemPermission],
    SystemRole.ADMIN.value: [
        SystemPermission.USER_READ.value,
        SystemPermission.USER_CREATE.value,
        SystemPermission.USER_UPDATE.value,
        SystemPermission.USER_DELETE.value,
        SystemPermission.COURSE_READ.value,
        SystemPermission.COURSE_CREATE.value,
        SystemPermission.COURSE_UPDATE.value,
        SystemPermission.COURSE_DELETE.value,
        SystemPermission.COURSE_PUBLISH.value,
        SystemPermission.QUIZ_READ.value,
        SystemPermission.QUIZ_CREATE.value,
        SystemPermission.QUIZ_UPDATE.value,
        SystemPermission.QUIZ_DELETE.value,
        SystemPermission.QUIZ_PUBLISH.value,
        SystemPermission.QUIZ_TAKE.value,
        SystemPermission.STUDENT_READ.value,
        SystemPermission.STUDENT_MANAGE.value,
        SystemPermission.ANALYTICS_READ.value,
        SystemPermission.SYSTEM_MANAGE.value,
        SystemPermission.AI_USE.value,
        SystemPermission.ML_READ.value,
    ],
    SystemRole.INSTRUCTOR.value: [
        SystemPermission.COURSE_READ.value,
        SystemPermission.COURSE_CREATE.value,
        SystemPermission.COURSE_UPDATE.value,
        SystemPermission.COURSE_DELETE.value,
        SystemPermission.COURSE_PUBLISH.value,
        SystemPermission.QUIZ_READ.value,
        SystemPermission.QUIZ_CREATE.value,
        SystemPermission.QUIZ_UPDATE.value,
        SystemPermission.QUIZ_DELETE.value,
        SystemPermission.QUIZ_PUBLISH.value,
        SystemPermission.QUIZ_TAKE.value,
        SystemPermission.STUDENT_READ.value,
        SystemPermission.ANALYTICS_READ.value,
        SystemPermission.AI_USE.value,
        SystemPermission.ML_READ.value,
    ],
    SystemRole.STUDENT.value: [
        SystemPermission.COURSE_READ.value,
        SystemPermission.QUIZ_READ.value,
        SystemPermission.QUIZ_TAKE.value,
        SystemPermission.AI_USE.value,
    ],
}

