import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/context/authContextDef";
import { MyLearningPage } from "@/pages/MyLearningPage";
import { CourseDetailPage } from "@/pages/CourseDetailPage";
import { CourseLearningPage } from "@/pages/CourseLearningPage";
import { learningService } from "@/services/learningService";
import { courseService } from "@/services/courseService";
import { Course, CourseDetail } from "@/types/course";
import { Enrollment, LearningCourse } from "@/types/learning";
import { User, SystemRole } from "@/types/auth";

vi.mock("@/services/learningService", () => ({
  learningService: {
    listMyEnrollments: vi.fn(),
    enrollCourse: vi.fn(),
    getEnrollment: vi.fn(),
    unenroll: vi.fn(),
    getCourseLearningView: vi.fn(),
    getCourseProgress: vi.fn(),
    resumeCourse: vi.fn(),
    updateLessonProgress: vi.fn(),
    getLessonProgress: vi.fn(),
  },
}));

vi.mock("@/services/courseService", () => ({
  courseService: {
    getCourseDetail: vi.fn(),
  },
}));

const mockStudentUser: User = {
  id: "student-123",
  email: "student@learnova.ai",
  first_name: "Student",
  last_name: "User",
  full_name: "Student User",
  avatar_url: null,
  roles: ["STUDENT"],
  permissions: ["COURSE_READ"],
  organization_id: null,
  last_login_at: null,
  is_active: true,
  is_verified: true,
  created_at: new Date().toISOString(),
};

const mockEnrolledCourse: Course = {
  id: "c-1",
  organization_id: null,
  instructor_id: "inst-1",
  category_id: "cat-1",
  title: "TypeScript Professional",
  slug: "typescript-professional",
  short_description: "Learn professional TypeScript programming",
  description: "Detailed description of TypeScript",
  thumbnail_url: null,
  difficulty: "intermediate",
  duration_minutes: 120,
  learning_objectives: ["Master Generics"],
  prerequisites: ["Basic JavaScript"],
  status: "published",
  language: "en",
  published_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  modules_count: 1,
  lessons_count: 2,
};

const mockEnrollment: Enrollment = {
  id: "enr-1",
  user_id: "student-123",
  course_id: "c-1",
  status: "active",
  enrolled_at: new Date().toISOString(),
  completed_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  course: mockEnrolledCourse,
  progress_percentage: 50.0,
  completed_lessons_count: 1,
  total_lessons_count: 2,
  next_lesson_id: "les-2",
};

const mockCourseDetail: CourseDetail = {
  ...mockEnrolledCourse,
  modules: [
    {
      id: "mod-1",
      course_id: "c-1",
      title: "Module 1: Foundations",
      description: null,
      order_index: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      lessons: [
        {
          id: "les-1",
          module_id: "mod-1",
          title: "Lesson 1: Introduction",
          description: null,
          content_type: "text",
          text_content: "Welcome to TypeScript",
          resource_url: null,
          duration_minutes: 10,
          order_index: 0,
          is_preview: true,
          text_extraction_status: "pending",
          content_processing_status: "pending",
          metadata_json: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    },
  ],
};

const mockLearningCourse: LearningCourse = {
  id: "c-1",
  title: "TypeScript Professional",
  slug: "typescript-professional",
  short_description: "Learn professional TypeScript programming",
  description: "Detailed description of TypeScript",
  thumbnail_url: null,
  difficulty: "intermediate",
  duration_minutes: 120,
  learning_objectives: ["Master Generics"],
  prerequisites: ["Basic JavaScript"],
  modules: [
    {
      id: "mod-1",
      course_id: "c-1",
      title: "Module 1: Foundations",
      description: null,
      order_index: 0,
      completed_lessons_count: 1,
      total_lessons_count: 2,
      lessons: [
        {
          id: "les-1",
          module_id: "mod-1",
          title: "Lesson 1: Introduction",
          description: "Getting started with TypeScript",
          content_type: "text",
          text_content: "Welcome to the interactive TypeScript classroom.",
          resource_url: null,
          duration_minutes: 10,
          order_index: 0,
          is_preview: true,
          is_completed: true,
          completed_at: new Date().toISOString(),
        },
        {
          id: "les-2",
          module_id: "mod-1",
          title: "Lesson 2: Video Walkthrough",
          description: "Video lecture on type assertions",
          content_type: "video",
          text_content: null,
          resource_url: "https://example.com/video.mp4",
          duration_minutes: 20,
          order_index: 1,
          is_preview: false,
          is_completed: false,
          completed_at: null,
        },
      ],
    },
  ],
  progress: {
    course_id: "c-1",
    total_lessons: 2,
    completed_lessons: 1,
    progress_percentage: 50.0,
    completed_lesson_ids: ["les-1"],
    is_course_completed: false,
  },
  enrollment_status: "active",
  enrolled_at: new Date().toISOString(),
  completed_at: null,
};

function renderWithProviders(
  ui: React.ReactElement,
  currentUser: User | null = mockStudentUser,
  initialRoute = "/"
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const authValue = {
    user: currentUser,
    isLoading: false,
    error: null,
    isAuthenticated: !!currentUser,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    clearError: vi.fn(),
    hasRole: (...roles: (SystemRole | string)[]) => {
      if (!currentUser) return false;
      const userRoles = currentUser.roles.map((r) => r.toUpperCase());
      if (userRoles.includes("SUPER_ADMIN")) return true;
      return roles.some((r) => userRoles.includes(r.toUpperCase()));
    },
    hasPermission: () => true,
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={[initialRoute]}>{ui}</MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe("Phase 4 Student Learning System & Progress Tracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. My Learning page rendering
  it("MyLearningPage renders enrolled courses and progress percentage", async () => {
    vi.mocked(learningService.listMyEnrollments).mockResolvedValue({
      items: [mockEnrollment],
      total: 1,
    });

    renderWithProviders(<MyLearningPage />);

    expect(await screen.findByText("My Learning")).toBeInTheDocument();
    expect(await screen.findByText("TypeScript Professional")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText(/1 of 2 lessons/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Resume Learning/i })).toBeInTheDocument();
  });

  // 2. Empty state on My Learning page
  it("MyLearningPage renders empty state when no courses are enrolled", async () => {
    vi.mocked(learningService.listMyEnrollments).mockResolvedValue({
      items: [],
      total: 0,
    });

    renderWithProviders(<MyLearningPage />);

    expect(await screen.findByText(/No Enrolled Courses Yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Explore Catalog/i })).toBeInTheDocument();
  });

  // 3. Course detail enrollment interaction
  it("CourseDetailPage allows enrolling in a published course when not enrolled", async () => {
    vi.mocked(courseService.getCourseDetail).mockResolvedValue(mockCourseDetail);
    vi.mocked(learningService.listMyEnrollments).mockResolvedValue({
      items: [], // Not enrolled
      total: 0,
    });
    vi.mocked(learningService.enrollCourse).mockResolvedValue(mockEnrollment);

    renderWithProviders(
      <Routes>
        <Route path="/courses/:courseId" element={<CourseDetailPage />} />
      </Routes>,
      mockStudentUser,
      "/courses/c-1"
    );

    expect(await screen.findByText("TypeScript Professional")).toBeInTheDocument();
    const enrollBtn = await screen.findByRole("button", { name: /Enroll in Course/i });
    expect(enrollBtn).toBeInTheDocument();

    fireEvent.click(enrollBtn);

    await waitFor(() => {
      expect(learningService.enrollCourse).toHaveBeenCalledWith("c-1");
    });
  });

  // 4. Course detail shows Active Learner badge and Resume Learning if already enrolled
  it("CourseDetailPage shows active learner status and resume button if already enrolled", async () => {
    vi.mocked(courseService.getCourseDetail).mockResolvedValue(mockCourseDetail);
    vi.mocked(learningService.listMyEnrollments).mockResolvedValue({
      items: [mockEnrollment], // Enrolled!
      total: 1,
    });

    renderWithProviders(
      <Routes>
        <Route path="/courses/:courseId" element={<CourseDetailPage />} />
      </Routes>,
      mockStudentUser,
      "/courses/c-1"
    );

    expect(await screen.findByText("Active Learner")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Resume Learning/i })).toBeInTheDocument();
  });

  // 5. Course learning classroom view renders curriculum and active lesson content
  it("CourseLearningPage renders curriculum and instructional lesson text", async () => {
    vi.mocked(learningService.getCourseLearningView).mockResolvedValue(mockLearningCourse);

    renderWithProviders(
      <Routes>
        <Route path="/learning/courses/:courseId" element={<CourseLearningPage />} />
      </Routes>,
      mockStudentUser,
      "/learning/courses/c-1"
    );

    expect(await screen.findByText("TypeScript Professional")).toBeInTheDocument();
    expect(screen.getByText("50% Completed")).toBeInTheDocument();

    // Incomplete lesson 2 is default active
    const lessonElements = await screen.findAllByText("Lesson 2: Video Walkthrough");
    expect(lessonElements.length).toBeGreaterThan(0);
    expect(screen.getByTitle("Lesson 2: Video Walkthrough")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Mark as Complete/i })).toBeInTheDocument();
  });

  // 6. Toggling lesson completion
  it("CourseLearningPage allows marking a lesson complete", async () => {
    vi.mocked(learningService.getCourseLearningView).mockResolvedValue(mockLearningCourse);
    vi.mocked(learningService.updateLessonProgress).mockResolvedValue({
      id: "prog-1",
      user_id: "student-123",
      lesson_id: "les-2",
      course_id: "c-1",
      is_completed: true,
      completed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    renderWithProviders(
      <Routes>
        <Route path="/learning/courses/:courseId" element={<CourseLearningPage />} />
      </Routes>,
      mockStudentUser,
      "/learning/courses/c-1"
    );

    const markBtn = await screen.findByRole("button", { name: /Mark as Complete/i });
    fireEvent.click(markBtn);

    await waitFor(() => {
      expect(learningService.updateLessonProgress).toHaveBeenCalledWith("les-2", true);
    });
  });

  // 7. Role-Based restrictions: student does not see instructor authoring controls on Course Detail
  it("Student role does not see instructor editing or curriculum builder controls", async () => {
    vi.mocked(courseService.getCourseDetail).mockResolvedValue(mockCourseDetail);
    vi.mocked(learningService.listMyEnrollments).mockResolvedValue({
      items: [],
      total: 0,
    });

    renderWithProviders(
      <Routes>
        <Route path="/courses/:courseId" element={<CourseDetailPage />} />
      </Routes>,
      mockStudentUser,
      "/courses/c-1"
    );

    expect(await screen.findByText("TypeScript Professional")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Edit Metadata/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Curriculum Builder/i })).not.toBeInTheDocument();
  });

  // 8. Video lesson playback and previous/next navigation
  it("CourseLearningPage displays video player for video content and enables previous/next navigation", async () => {
    vi.mocked(learningService.getCourseLearningView).mockResolvedValue(mockLearningCourse);

    renderWithProviders(
      <Routes>
        <Route path="/learning/courses/:courseId" element={<CourseLearningPage />} />
      </Routes>,
      mockStudentUser,
      "/learning/courses/c-1"
    );

    // Default active lesson is Lesson 2 (video)
    expect(await screen.findByTestId("video-lesson-player")).toBeInTheDocument();
    expect(screen.getByText("Interactive Video Lesson")).toBeInTheDocument();

    // Click Previous Lesson button to navigate to Lesson 1
    const prevBtn = screen.getByRole("button", { name: /Previous Lesson/i });
    expect(prevBtn).toBeInTheDocument();
    fireEvent.click(prevBtn);

    // Now Lesson 1 is active (text lesson)
    expect(await screen.findByText("Welcome to the interactive TypeScript classroom.")).toBeInTheDocument();

    // Click Next Lesson button to navigate back to Lesson 2
    const nextBtn = screen.getByRole("button", { name: /Next Lesson/i });
    expect(nextBtn).toBeInTheDocument();
    fireEvent.click(nextBtn);

    expect(await screen.findByTestId("video-lesson-player")).toBeInTheDocument();
  });
});

