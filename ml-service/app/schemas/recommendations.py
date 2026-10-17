from pydantic import BaseModel, Field


class CourseCandidate(BaseModel):
    """Descriptor of an eligible course available in the catalog."""

    id: str = Field(..., description="Course UUID string")
    title: str = Field(..., description="Course title")
    slug: str = Field(..., description="Course slug")
    short_description: str = Field(default="", description="Course summary")
    category_id: str | None = Field(default=None, description="Category UUID string")
    category_name: str | None = Field(default=None, description="Category name")
    difficulty: str = Field(default="beginner", description="Difficulty level")
    duration_minutes: int = Field(default=0, description="Total duration in minutes")
    learning_objectives: list[str] = Field(default_factory=list, description="Target objectives")
    prerequisites: list[str] = Field(default_factory=list, description="Required prerequisites")
    enrollment_count: int = Field(default=0, description="Total current enrollments")
    rating: float = Field(default=4.5, description="Course average rating")


class StudentProfile(BaseModel):
    """Summary of student's past learning interactions and interests."""

    student_id: str = Field(..., description="Student UUID string")
    enrolled_course_ids: list[str] = Field(default_factory=list, description="Currently enrolled course IDs")
    completed_course_ids: list[str] = Field(default_factory=list, description="Completed course IDs")
    completed_category_ids: list[str] = Field(default_factory=list, description="Categories of completed courses")
    completed_category_names: list[str] = Field(default_factory=list, description="Names of completed categories")
    completed_course_titles: list[str] = Field(default_factory=list, description="Titles of completed courses")
    recent_quiz_scores: list[float] = Field(default_factory=list, description="Recent quiz percentages")
    preferred_difficulty: str | None = Field(default=None, description="Inferred or declared difficulty preference")


class RecommendationRequest(BaseModel):
    """Payload sent to ML service to compute course recommendations."""

    student: StudentProfile
    candidate_courses: list[CourseCandidate]
    limit: int = Field(default=5, ge=1, le=20, description="Maximum number of recommendations")


class RecommendedCourseItem(BaseModel):
    """A single recommended course with transparent rationale and confidence."""

    course_id: str
    title: str
    slug: str
    short_description: str
    category_name: str | None = None
    difficulty: str
    duration_minutes: int
    score: float = Field(..., description="Calculated recommendation score [0.0 - 1.0]")
    strategy: str = Field(..., description="Recommendation strategy: 'content_based', 'category_matching', 'popularity_fallback'")
    reason: str = Field(..., description="Student-facing justification for recommendation")
    matching_topics: list[str] = Field(default_factory=list, description="Specific matching keywords or skills")


class RecommendationResponse(BaseModel):
    """Output containing ranked course recommendations."""

    recommendations: list[RecommendedCourseItem]
    total_evaluated: int
    applied_strategy: str
    is_fallback: bool
