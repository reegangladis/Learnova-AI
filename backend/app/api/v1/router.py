from fastapi import APIRouter

from backend.app.api.v1.endpoints import (
    ai,
    analytics,
    auth,
    course_categories,
    courses,
    enrollments,
    health,
    learning,
    ml,
    quizzes,
    system,
    track360,
    users,
)

api_router = APIRouter()

# Include version 1 endpoint routers
api_router.include_router(health.router)
api_router.include_router(system.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(courses.router)
api_router.include_router(courses.modules_router)
api_router.include_router(courses.lessons_router)
api_router.include_router(course_categories.router)
api_router.include_router(enrollments.router)
api_router.include_router(learning.router)
api_router.include_router(quizzes.router)
api_router.include_router(quizzes.attempts_router)
api_router.include_router(analytics.router)
api_router.include_router(track360.router, tags=["ExcelR Track360 Integration"])
api_router.include_router(ai.router)
api_router.include_router(ml.router)



