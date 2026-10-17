import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/context/authContextDef";
import { StudentAnalyticsDashboard } from "@/pages/StudentAnalyticsDashboard";
import { InstructorAnalyticsDashboard } from "@/pages/InstructorAnalyticsDashboard";
import { AdminAnalyticsDashboard } from "@/pages/AdminAnalyticsDashboard";
import { DashboardPage } from "@/pages/DashboardPage";
import { MetricCard } from "@/components/analytics/MetricCard";
import { analyticsService } from "@/services/analyticsService";
import { User } from "@/types/auth";
import {
  StudentOverview,
  StudentActivityResponse,
  StudentAssessmentsResponse,
  InstructorOverview,
  InstructorCoursesResponse,
  InstructorAssessmentsResponse,
  AdminOverview,
  AdminUsersResponse,
  AdminCoursesResponse,
  AdminEnrollmentsResponse,
} from "@/types/analytics";

// Mock analytics service
vi.mock("@/services/analyticsService", () => ({
  analyticsService: {
    getStudentOverview: vi.fn(),
    getStudentActivity: vi.fn(),
    getStudentAssessments: vi.fn(),
    getInstructorOverview: vi.fn(),
    getInstructorCourses: vi.fn(),
    getInstructorAssessments: vi.fn(),
    getAdminOverview: vi.fn(),
    getAdminUsers: vi.fn(),
    getAdminCourses: vi.fn(),
    getAdminEnrollments: vi.fn(),
  },
}));

// Test users
const mockStudentUser: User = {
  id: "student-1",
  email: "student@learnova.ai",
  first_name: "Alex",
  last_name: "Student",
  full_name: "Alex Student",
  avatar_url: null,
  roles: ["STUDENT"],
  permissions: ["COURSE_VIEW", "LESSON_VIEW"],
  organization_id: "org-1",
  last_login_at: null,
  is_active: true,
  is_verified: true,
  created_at: new Date().toISOString(),
};

const mockInstructorUser: User = {
  id: "instructor-1",
  email: "instructor@learnova.ai",
  first_name: "Sarah",
  last_name: "Instructor",
  full_name: "Sarah Instructor",
  avatar_url: null,
  roles: ["INSTRUCTOR"],
  permissions: ["COURSE_CREATE", "QUIZ_CREATE"],
  organization_id: "org-1",
  last_login_at: null,
  is_active: true,
  is_verified: true,
  created_at: new Date().toISOString(),
};

const mockAdminUser: User = {
  id: "admin-1",
  email: "admin@learnova.ai",
  first_name: "Eleanor",
  last_name: "Admin",
  full_name: "Eleanor Admin",
  avatar_url: null,
  roles: ["ADMIN"],
  permissions: ["USER_VIEW", "COURSE_VIEW", "ORG_VIEW"],
  organization_id: "org-1",
  last_login_at: null,
  is_active: true,
  is_verified: true,
  created_at: new Date().toISOString(),
};

const mockMultiRoleUser: User = {
  id: "multi-1",
  email: "super@learnova.ai",
  first_name: "Jordan",
  last_name: "Lead",
  full_name: "Jordan Lead",
  avatar_url: null,
  roles: ["INSTRUCTOR", "ADMIN"],
  permissions: ["USER_VIEW", "COURSE_CREATE"],
  organization_id: "org-1",
  last_login_at: null,
  is_active: true,
  is_verified: true,
  created_at: new Date().toISOString(),
};

// Mock data fixtures typed according to types/analytics.ts
const mockStudentOverviewData: StudentOverview = {
  total_enrolled_courses: 3,
  courses_in_progress: 2,
  courses_completed: 1,
  courses_dropped: 0,
  overall_learning_progress: 65.5,
  total_lessons_count: 28,
  completed_lessons_count: 18,
  remaining_lessons_count: 10,
  total_quiz_attempts: 5,
  passed_quiz_attempts: 4,
  average_quiz_score: 84.0,
  quiz_pass_rate: 80.0,
  total_time_spent_minutes: 120,
  resume_courses: [
    {
      course_id: "c-101",
      course_title: "Deep Learning Foundations",
      thumbnail_url: null,
      progress_percentage: 75.0,
      completed_lessons: 6,
      total_lessons: 8,
      next_lesson_id: "l-7",
      next_lesson_title: "Backpropagation Math",
    },
  ],
};

const mockStudentActivityData: StudentActivityResponse = {
  recent_activities: [
    {
      id: "prog-1",
      activity_type: "lesson_completion",
      title: "Completed lesson 'Backpropagation Math'",
      subtitle: "Course: Deep Learning Foundations",
      timestamp: new Date().toISOString(),
      status: "COMPLETED",
      score: null,
      course_id: "c-101",
      course_title: "Deep Learning Foundations",
    },
  ],
  progress_trends: [
    { date: "2026-10-01", lessons_completed: 2, quizzes_completed: 1 },
    { date: "2026-10-02", lessons_completed: 3, quizzes_completed: 0 },
  ],
};

const mockStudentAssessmentsData: StudentAssessmentsResponse = {
  total_attempts: 1,
  passed_attempts: 1,
  average_score: 90.0,
  pass_rate: 100.0,
  results: [
    {
      attempt_id: "att-1",
      quiz_id: "q-1",
      quiz_title: "Neural Networks Fundamentals Quiz",
      course_id: "c-101",
      course_title: "Deep Learning Foundations",
      attempt_number: 1,
      score: 18,
      max_score: 20,
      percentage_score: 90.0,
      passed: true,
      time_spent_seconds: 450,
      submitted_at: new Date().toISOString(),
    },
  ],
  total: 1,
  page: 1,
  page_size: 10,
};

const mockInstructorOverviewData: InstructorOverview = {
  total_courses: 4,
  published_courses: 3,
  draft_courses: 1,
  archived_courses: 0,
  total_enrollments: 120,
  active_enrollments: 85,
  completed_enrollments: 30,
  dropped_enrollments: 5,
  unique_students: 95,
  course_completion_rate: 25.0,
  total_lessons: 40,
  total_lesson_completions: 540,
  student_lesson_progress_rate: 68.0,
  total_quizzes: 5,
  total_quiz_attempts: 95,
  average_quiz_score: 82.5,
  quiz_pass_rate: 78.9,
  trends: [
    { date: "2026-10-01", enrollments: 12, completions: 2, quiz_attempts: 5 },
    { date: "2026-10-02", enrollments: 8, completions: 3, quiz_attempts: 4 },
  ],
};

const mockInstructorCoursesData: InstructorCoursesResponse = {
  courses: [
    {
      course_id: "c-1",
      title: "Advanced PyTorch Architectures",
      status: "PUBLISHED",
      difficulty: "ADVANCED",
      total_lessons: 15,
      total_enrollments: 80,
      active_enrollments: 60,
      completed_enrollments: 18,
      dropped_enrollments: 2,
      completion_rate: 22.5,
      total_quiz_attempts: 50,
      average_quiz_score: 85.0,
      quiz_pass_rate: 82.0,
      created_at: new Date().toISOString(),
      published_at: new Date().toISOString(),
    },
  ],
  total: 1,
  page: 1,
  page_size: 10,
};

const mockInstructorAssessmentsData: InstructorAssessmentsResponse = {
  assessments: [
    {
      quiz_id: "q-1",
      title: "PyTorch Attention Quiz",
      course_id: "c-1",
      course_title: "Advanced PyTorch Architectures",
      passing_score_percentage: 70.0,
      status: "PUBLISHED",
      total_attempts: 50,
      unique_participants: 45,
      passed_attempts: 41,
      pass_rate: 82.0,
      average_score: 85.0,
      highest_score: 100.0,
      lowest_score: 45.0,
      average_time_spent_seconds: 600,
      score_distribution: {
        range_0_50: 4,
        range_51_70: 5,
        range_71_85: 18,
        range_86_100: 23,
      },
    },
  ],
  total: 1,
  page: 1,
  page_size: 10,
};

const mockAdminOverviewData: AdminOverview = {
  organization_id: "org-1",
  organization_name: "Learnova Global",
  total_users: 250,
  active_users: 180,
  inactive_users: 70,
  users_by_role: [
    { role: "STUDENT", count: 210 },
    { role: "INSTRUCTOR", count: 30 },
    { role: "ADMIN", count: 10 },
  ],
  total_courses: 20,
  published_courses: 16,
  draft_courses: 3,
  archived_courses: 1,
  total_enrollments: 450,
  active_enrollments: 300,
  completed_enrollments: 110,
  dropped_enrollments: 40,
  overall_completion_rate: 24.4,
  total_quiz_attempts: 320,
  average_quiz_score: 79.4,
  quiz_pass_rate: 76.2,
  recent_activity: [
    {
      id: "audit-1",
      event_type: "USER_REGISTERED",
      description: "New student account registered: user@test.com",
      user_id: "u-99",
      user_email: "user@test.com",
      timestamp: new Date().toISOString(),
      metadata_json: {},
    },
  ],
  trends: [
    { date: "2026-10-01", new_users: 5, new_enrollments: 12, completions: 3 },
    { date: "2026-10-02", new_users: 7, new_enrollments: 15, completions: 4 },
  ],
};

const mockAdminUsersData: AdminUsersResponse = {
  total_users: 250,
  active_users: 180,
  inactive_users: 70,
  users_by_role: [
    { role: "STUDENT", count: 210 },
    { role: "INSTRUCTOR", count: 30 },
    { role: "ADMIN", count: 10 },
  ],
  users: [
    {
      user_id: "u-1",
      email: "learner@org.com",
      first_name: "Jane",
      last_name: "Learner",
      roles: ["STUDENT"],
      is_active: true,
      is_verified: true,
      enrolled_courses_count: 4,
      completed_courses_count: 2,
      created_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
    },
  ],
  total: 1,
  page: 1,
  page_size: 10,
};

const mockAdminCoursesData: AdminCoursesResponse = {
  total_courses: 20,
  published_courses: 16,
  draft_courses: 3,
  archived_courses: 1,
  courses: [
    {
      course_id: "c-1",
      title: "Cloud Infrastructure 101",
      instructor_name: "Sarah Instructor",
      instructor_email: "instructor@learnova.ai",
      category_name: "DevOps",
      status: "PUBLISHED",
      difficulty: "BEGINNER",
      total_enrollments: 75,
      completed_enrollments: 20,
      completion_rate: 26.6,
      total_lessons: 12,
      average_quiz_score: 82.0,
      created_at: new Date().toISOString(),
    },
  ],
  total: 1,
  page: 1,
  page_size: 10,
};

const mockAdminEnrollmentsData: AdminEnrollmentsResponse = {
  total_enrollments: 1,
  active_enrollments: 1,
  completed_enrollments: 0,
  dropped_enrollments: 0,
  completion_rate: 0.0,
  trends: [],
  enrollments: [
    {
      enrollment_id: "e-1",
      user_id: "u-1",
      user_name: "Jane Learner",
      user_email: "learner@org.com",
      course_id: "c-1",
      course_title: "Cloud Infrastructure 101",
      status: "active",
      progress_percentage: 60.0,
      enrolled_at: new Date().toISOString(),
      completed_at: null,
    },
  ],
  total: 1,
  page: 1,
  page_size: 10,
};

function renderComponent(
  component: React.ReactNode,
  user: User | null = mockStudentUser
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthContext.Provider
          value={{
            user,
            isLoading: false,
            isAuthenticated: Boolean(user),
            error: null,
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn(),
            clearError: vi.fn(),
            refreshUser: vi.fn(),
            hasRole: (...roles) =>
              Boolean(user?.roles?.some((r) => roles.map(String).includes(String(r)))),
            hasPermission: (...permissions) =>
              Boolean(user?.permissions?.some((p) => permissions.map(String).includes(String(p)))),
          }}
        >
          {component}
        </AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Learnova AI — Phase 6 Analytics Dashboards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("MetricCard component", () => {
    it("renders value, title, and subtitle correctly", () => {
      render(
        <MetricCard
          id="test-card"
          title="Total Enrollments"
          value={42}
          subtitle="12 active students"
          variant="primary"
        />
      );
      expect(screen.getByText("Total Enrollments")).toBeInTheDocument();
      expect(screen.getByText("42")).toBeInTheDocument();
      expect(screen.getByText("12 active students")).toBeInTheDocument();
    });

    it("renders loading skeleton state when isLoading is true", () => {
      const { container } = render(
        <MetricCard
          id="loading-card"
          title="Loading Metric"
          value={100}
          isLoading={true}
        />
      );
      expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    });
  });

  describe("Student Analytics Dashboard", () => {
    beforeEach(() => {
      vi.mocked(analyticsService.getStudentOverview).mockResolvedValue(mockStudentOverviewData);
      vi.mocked(analyticsService.getStudentActivity).mockResolvedValue(mockStudentActivityData);
      vi.mocked(analyticsService.getStudentAssessments).mockResolvedValue(mockStudentAssessmentsData);
    });

    it("renders top KPIs, course progress, and quiz mastery", async () => {
      renderComponent(<StudentAnalyticsDashboard />, mockStudentUser);

      // Verify Header
      expect(await screen.findByText(/Student Learning Analytics/i)).toBeInTheDocument();
      expect(screen.getByText(/Alex/i)).toBeInTheDocument();

      // Verify KPI Metric Cards
      expect(await screen.findByText("Enrolled Courses")).toBeInTheDocument();
      expect(screen.getByText("Curriculum Progress")).toBeInTheDocument();
      expect(screen.getByText("65.5%")).toBeInTheDocument();
      expect(screen.getByText("Quiz Pass Rate")).toBeInTheDocument();
      expect(screen.getByText("80.0%")).toBeInTheDocument();
      expect(screen.getByText("Average Quiz Score")).toBeInTheDocument();
      expect(screen.getByText("84.0%")).toBeInTheDocument();

      // Verify Resume Learning Action card
      expect(screen.getByText("Deep Learning Foundations")).toBeInTheDocument();
      expect(screen.getAllByText(/Backpropagation Math/i).length).toBeGreaterThan(0);
      expect(screen.getByRole("button", { name: /Continue Course/i })).toBeInTheDocument();

      // Verify Recent Activity Stream
      expect(
        screen.getByText(/Completed lesson 'Backpropagation Math'/i)
      ).toBeInTheDocument();

      // Verify Recent Quiz Results
      expect(screen.getByText("Neural Networks Fundamentals Quiz")).toBeInTheDocument();
      expect(screen.getByText("Passed")).toBeInTheDocument();
    });

    it("handles empty student learning datasets gracefully", async () => {
      vi.mocked(analyticsService.getStudentOverview).mockResolvedValue({
        total_enrolled_courses: 0,
        courses_in_progress: 0,
        courses_completed: 0,
        courses_dropped: 0,
        overall_learning_progress: 0.0,
        total_lessons_count: 0,
        completed_lessons_count: 0,
        remaining_lessons_count: 0,
        total_quiz_attempts: 0,
        passed_quiz_attempts: 0,
        average_quiz_score: 0.0,
        quiz_pass_rate: 0.0,
        total_time_spent_minutes: 0,
        resume_courses: [],
      });
      vi.mocked(analyticsService.getStudentActivity).mockResolvedValue({
        recent_activities: [],
        progress_trends: [],
      });
      vi.mocked(analyticsService.getStudentAssessments).mockResolvedValue({
        total_attempts: 0,
        passed_attempts: 0,
        average_score: 0.0,
        pass_rate: 0.0,
        results: [],
        total: 0,
        page: 1,
        page_size: 10,
      });

      renderComponent(<StudentAnalyticsDashboard />, mockStudentUser);

      expect(
        await screen.findByText(/No recent activity recorded yet\. Start a lesson to build your momentum!/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/No finalized quiz attempts recorded yet\. Take a quiz to test your knowledge!/i)
      ).toBeInTheDocument();
    });

    it("triggers refetch when changing date range filter", async () => {
      renderComponent(<StudentAnalyticsDashboard />, mockStudentUser);
      expect(await screen.findByText(/Student Learning Analytics/i)).toBeInTheDocument();

      // Click "7 Days" button using aria-label
      const sevenDaysBtn = screen.getByRole("button", { name: "Time range 7 Days" });
      fireEvent.click(sevenDaysBtn);

      await waitFor(() => {
        expect(analyticsService.getStudentOverview).toHaveBeenCalledWith(7);
        expect(analyticsService.getStudentActivity).toHaveBeenCalledWith(7, 15);
      });
    });
  });

  describe("Instructor Analytics Dashboard", () => {
    beforeEach(() => {
      vi.mocked(analyticsService.getInstructorOverview).mockResolvedValue(mockInstructorOverviewData);
      vi.mocked(analyticsService.getInstructorCourses).mockResolvedValue(mockInstructorCoursesData);
      vi.mocked(analyticsService.getInstructorAssessments).mockResolvedValue(mockInstructorAssessmentsData);
    });

    it("renders studio KPIs, course comparison matrix, and assessment distribution", async () => {
      renderComponent(<InstructorAnalyticsDashboard />, mockInstructorUser);

      // Verify Header
      expect(await screen.findByText(/Instructor Studio Analytics/i)).toBeInTheDocument();

      // Verify Studio KPIs
      expect(await screen.findByText("Authored Courses")).toBeInTheDocument();
      expect(screen.getByText("Student Enrollments")).toBeInTheDocument();
      expect(screen.getByText("Course Completion Rate")).toBeInTheDocument();
      expect(screen.getByText("25.0%")).toBeInTheDocument();
      expect(screen.getAllByText("Quiz Pass Rate").length).toBeGreaterThan(0);
      expect(screen.getByText("78.9%")).toBeInTheDocument();

      // Verify Course Matrix Table
      expect((await screen.findAllByText("Advanced PyTorch Architectures")).length).toBeGreaterThan(0);
      expect(screen.getAllByText("22.5%").length).toBeGreaterThan(0); // course completion

      // Verify Quiz Diagnostics
      expect(screen.getAllByText("PyTorch Attention Quiz").length).toBeGreaterThan(0);
      expect(screen.getByText(/50 total finalized attempts/i)).toBeInTheDocument();
    });

    it("filters courses when instructor enters search query", async () => {
      vi.mocked(analyticsService.getInstructorCourses).mockImplementation(async (_p, _ps, search) => {
        if (search && search.includes("Nonexistent")) {
          return { courses: [], total: 0, page: 1, page_size: 10 };
        }
        return mockInstructorCoursesData;
      });

      renderComponent(<InstructorAnalyticsDashboard />, mockInstructorUser);
      expect((await screen.findAllByText("Advanced PyTorch Architectures")).length).toBeGreaterThan(0);

      const searchInput = screen.getByPlaceholderText(/Search course title\.\.\./i);
      fireEvent.change(searchInput, { target: { value: "Nonexistent Course" } });

      expect(await screen.findByText(/No authored courses match your criteria/i)).toBeInTheDocument();
    });

    it("handles empty course dataset for new instructors", async () => {
      vi.mocked(analyticsService.getInstructorOverview).mockResolvedValue({
        total_courses: 0,
        published_courses: 0,
        draft_courses: 0,
        archived_courses: 0,
        total_enrollments: 0,
        active_enrollments: 0,
        completed_enrollments: 0,
        dropped_enrollments: 0,
        unique_students: 0,
        course_completion_rate: 0.0,
        total_lessons: 0,
        total_lesson_completions: 0,
        student_lesson_progress_rate: 0.0,
        total_quizzes: 0,
        total_quiz_attempts: 0,
        average_quiz_score: 0.0,
        quiz_pass_rate: 0.0,
        trends: [],
      });
      vi.mocked(analyticsService.getInstructorCourses).mockResolvedValue({
        courses: [],
        total: 0,
        page: 1,
        page_size: 10,
      });
      vi.mocked(analyticsService.getInstructorAssessments).mockResolvedValue({
        assessments: [],
        total: 0,
        page: 1,
        page_size: 10,
      });

      renderComponent(<InstructorAnalyticsDashboard />, mockInstructorUser);

      expect(await screen.findByText(/No authored courses match your criteria/i)).toBeInTheDocument();
      expect(screen.getByText(/No published quizzes found for the selected course filter/i)).toBeInTheDocument();
    });
  });

  describe("Administrator Analytics Dashboard", () => {
    beforeEach(() => {
      vi.mocked(analyticsService.getAdminOverview).mockResolvedValue(mockAdminOverviewData);
      vi.mocked(analyticsService.getAdminUsers).mockResolvedValue(mockAdminUsersData);
      vi.mocked(analyticsService.getAdminCourses).mockResolvedValue(mockAdminCoursesData);
      vi.mocked(analyticsService.getAdminEnrollments).mockResolvedValue(mockAdminEnrollmentsData);
    });

    it("renders tenant overview KPIs and recent audit log events", async () => {
      renderComponent(<AdminAnalyticsDashboard />, mockAdminUser);

      // Header
      expect(await screen.findByText(/Administrator Platform Analytics/i)).toBeInTheDocument();

      // KPIs
      expect(await screen.findByText("Total Users")).toBeInTheDocument();
      expect(screen.getByText("Courses in Scope")).toBeInTheDocument();
      expect(screen.getByText("Platform Completion Rate")).toBeInTheDocument();
      expect(screen.getByText("24.4%")).toBeInTheDocument();

      // Recent Platform Activity audit stream
      expect(screen.getByText("USER_REGISTERED")).toBeInTheDocument();
      expect(screen.getByText(/User: user@test\.com/i)).toBeInTheDocument();
    });

    it("switches to Users Management tab and displays tenant users", async () => {
      renderComponent(<AdminAnalyticsDashboard />, mockAdminUser);
      expect(await screen.findByText(/Administrator Platform Analytics/i)).toBeInTheDocument();

      // Switch to "User Demographics" tab
      const usersTab = screen.getByRole("button", { name: /User Demographics/i });
      fireEvent.click(usersTab);

      // Verify user table rendered
      expect(await screen.findByText("Jane Learner")).toBeInTheDocument();
      expect(screen.getByText("learner@org.com")).toBeInTheDocument();
    });

    it("switches to Courses and Enrollments tabs", async () => {
      renderComponent(<AdminAnalyticsDashboard />, mockAdminUser);
      expect(await screen.findByText(/Administrator Platform Analytics/i)).toBeInTheDocument();

      // Switch to Courses
      const coursesTab = screen.getByRole("button", { name: /Course Catalog Metrics/i });
      fireEvent.click(coursesTab);
      expect(await screen.findByText("Cloud Infrastructure 101")).toBeInTheDocument();

      // Switch to Enrollments
      const enrollmentsTab = screen.getByRole("button", { name: /Enrollment Telemetry/i });
      fireEvent.click(enrollmentsTab);
      expect(await screen.findByText("learner@org.com")).toBeInTheDocument();
    });
  });

  describe("DashboardPage Role Switching", () => {
    beforeEach(() => {
      vi.mocked(analyticsService.getStudentOverview).mockResolvedValue(mockStudentOverviewData);
      vi.mocked(analyticsService.getStudentActivity).mockResolvedValue(mockStudentActivityData);
      vi.mocked(analyticsService.getStudentAssessments).mockResolvedValue(mockStudentAssessmentsData);
      vi.mocked(analyticsService.getInstructorOverview).mockResolvedValue(mockInstructorOverviewData);
      vi.mocked(analyticsService.getInstructorCourses).mockResolvedValue(mockInstructorCoursesData);
      vi.mocked(analyticsService.getInstructorAssessments).mockResolvedValue(mockInstructorAssessmentsData);
      vi.mocked(analyticsService.getAdminOverview).mockResolvedValue(mockAdminOverviewData);
      vi.mocked(analyticsService.getAdminUsers).mockResolvedValue(mockAdminUsersData);
      vi.mocked(analyticsService.getAdminCourses).mockResolvedValue(mockAdminCoursesData);
      vi.mocked(analyticsService.getAdminEnrollments).mockResolvedValue(mockAdminEnrollmentsData);
    });

    it("renders student analytics by default for a student account", async () => {
      renderComponent(<DashboardPage />, mockStudentUser);
      expect(await screen.findByText(/Student Learning Analytics/i)).toBeInTheDocument();
      // Role switcher toolbar should not be shown for single-role student
      expect(screen.queryByText(/Viewing Dashboard as:/i)).not.toBeInTheDocument();
    });

    it("renders role switcher buttons and toggles views for multi-role accounts", async () => {
      renderComponent(<DashboardPage />, mockMultiRoleUser);

      // Should show role switcher toolbar
      expect(await screen.findByText(/Viewing Dashboard as:/i)).toBeInTheDocument();
      const adminBtn = screen.getByRole("tab", { name: /Admin/i });
      const instructorBtn = screen.getByRole("tab", { name: /Instructor/i });

      expect(adminBtn).toBeInTheDocument();
      expect(instructorBtn).toBeInTheDocument();

      // Default for multi-role with ADMIN is Admin view
      expect(await screen.findByText(/Administrator Platform Analytics/i)).toBeInTheDocument();

      // Click to switch to Instructor Studio
      fireEvent.click(instructorBtn);
      expect(await screen.findByText(/Instructor Studio Analytics/i)).toBeInTheDocument();
    });
  });
});
