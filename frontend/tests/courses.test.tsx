import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/context/authContextDef";
import { CoursesPage } from "@/pages/CoursesPage";
import { CourseDetailPage } from "@/pages/CourseDetailPage";
import { InstructorCoursesPage } from "@/pages/InstructorCoursesPage";
import { CourseEditorPage } from "@/pages/CourseEditorPage";
import { CourseBuilderPage } from "@/pages/CourseBuilderPage";
import { AdminCategoriesPage } from "@/pages/AdminCategoriesPage";
import { courseService } from "@/services/courseService";
import { Course, CourseCategory, CourseDetail } from "@/types/course";
import { User, SystemRole } from "@/types/auth";

vi.mock("@/services/courseService", () => ({
  courseService: {
    listCourses: vi.fn(),
    getCourseDetail: vi.fn(),
    createCourse: vi.fn(),
    updateCourse: vi.fn(),
    deleteCourse: vi.fn(),
    publishCourse: vi.fn(),
    archiveCourse: vi.fn(),
    listCategories: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
    createModule: vi.fn(),
    updateModule: vi.fn(),
    deleteModule: vi.fn(),
    reorderModule: vi.fn(),
    createLesson: vi.fn(),
    updateLesson: vi.fn(),
    deleteLesson: vi.fn(),
    reorderLesson: vi.fn(),
  },
}));

const mockUser: User = {
  id: "inst-123",
  email: "instructor@learnova.ai",
  first_name: "Instructor",
  last_name: "User",
  full_name: "Instructor User",
  avatar_url: null,
  roles: ["INSTRUCTOR"],
  permissions: ["COURSE_CREATE", "COURSE_UPDATE", "COURSE_PUBLISH"],
  organization_id: null,
  last_login_at: null,
  is_active: true,
  is_verified: true,
  created_at: new Date().toISOString(),
};

const mockAdminUser: User = {
  id: "admin-123",
  email: "admin@learnova.ai",
  first_name: "Admin",
  last_name: "User",
  full_name: "Admin User",
  avatar_url: null,
  roles: ["ADMIN", "SUPER_ADMIN"],
  permissions: ["COURSE_CREATE", "COURSE_UPDATE", "COURSE_DELETE", "COURSE_PUBLISH"],
  organization_id: null,
  last_login_at: null,
  is_active: true,
  is_verified: true,
  created_at: new Date().toISOString(),
};

const mockCategory: CourseCategory = {
  id: "cat-1",
  name: "Computer Science",
  slug: "computer-science",
  description: "CS fundamental topics",
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockCourse: Course = {
  id: "course-1",
  instructor_id: "inst-123",
  instructor: {
    id: "inst-123",
    first_name: "Instructor",
    last_name: "User",
    email: "instructor@learnova.ai",
  },
  category_id: "cat-1",
  category: mockCategory,
  title: "FastAPI & Microservices Architecture",
  slug: "fastapi-microservices",
  short_description: "Build robust cloud microservices.",
  description: "Comprehensive backend architecture syllabus covering async engines.",
  difficulty: "intermediate",
  duration_minutes: 180,
  learning_objectives: ["Build async APIs", "Deploy with Docker"],
  prerequisites: ["Python fundamentals"],
  status: "published",
  language: "en",
  modules_count: 1,
  lessons_count: 2,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockCourseDetail: CourseDetail = {
  ...mockCourse,
  modules: [
    {
      id: "mod-1",
      course_id: "course-1",
      title: "Foundations",
      description: "Introductory module",
      order_index: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      lessons: [
        {
          id: "les-1",
          module_id: "mod-1",
          title: "Lesson 1: ASGI Overview",
          description: "Understanding ASGI specification",
          content_type: "text",
          text_content: "ASGI provides an interface between async servers and applications.",
          duration_minutes: 20,
          order_index: 0,
          is_preview: true,
          text_extraction_status: "completed",
          content_processing_status: "completed",
          metadata_json: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    },
  ],
};

function renderWithAuth(
  ui: React.ReactElement,
  currentUser: User | null = mockUser,
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

describe("Phase 3 Course Management Frontend Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("CoursesPage (Catalog)", () => {
    it("renders course list and allows searching", async () => {
      vi.mocked(courseService.listCategories).mockResolvedValue([mockCategory]);
      vi.mocked(courseService.listCourses).mockResolvedValue({
        items: [mockCourse],
        total: 1,
        page: 1,
        page_size: 9,
        total_pages: 1,
      });

      renderWithAuth(<CoursesPage />);

      await waitFor(() => {
        expect(
          screen.getByText("FastAPI & Microservices Architecture")
        ).toBeInTheDocument();
      });

      expect(screen.getAllByText("Computer Science").length).toBeGreaterThan(0);
      expect(screen.getByText("Build robust cloud microservices.")).toBeInTheDocument();

      // Type in search bar
      const searchInput = screen.getByPlaceholderText(/Search by course title/i);
      fireEvent.change(searchInput, { target: { value: "FastAPI" } });

      await waitFor(() => {
        expect(courseService.listCourses).toHaveBeenCalledWith(
          expect.objectContaining({ search: "FastAPI" })
        );
      });
    });

    it("displays empty state when no courses match", async () => {
      vi.mocked(courseService.listCategories).mockResolvedValue([]);
      vi.mocked(courseService.listCourses).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        page_size: 9,
        total_pages: 0,
      });

      renderWithAuth(<CoursesPage />);

      await waitFor(() => {
        expect(screen.getByText("No Courses Found")).toBeInTheDocument();
      });
    });
  });

  describe("CourseDetailPage", () => {
    it("renders syllabus hierarchy and allows opening lesson preview", async () => {
      vi.mocked(courseService.getCourseDetail).mockResolvedValue(mockCourseDetail);

      renderWithAuth(
        <Routes>
          <Route path="/courses/:courseId" element={<CourseDetailPage />} />
        </Routes>,
        mockUser,
        "/courses/course-1"
      );

      await waitFor(() => {
        expect(
          screen.getByText("FastAPI & Microservices Architecture")
        ).toBeInTheDocument();
      });

      expect(screen.getByText(/Foundations/i)).toBeInTheDocument();
      expect(screen.getByText("Lesson 1: ASGI Overview")).toBeInTheDocument();

      // Click on Preview button
      const previewBtn = screen.getByRole("button", { name: /Preview/i });
      fireEvent.click(previewBtn);

      await waitFor(() => {
        expect(
          screen.getByText(/ASGI provides an interface between async servers/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("InstructorCoursesPage", () => {
    it("lists instructor courses and displays publishing completeness error if rules fail", async () => {
      vi.mocked(courseService.listCourses).mockResolvedValue({
        items: [{ ...mockCourse, status: "draft" }],
        total: 1,
        page: 1,
        page_size: 50,
        total_pages: 1,
      });

      // Mock publication failure with structured reasons
      const validationError = Object.assign(new Error("Validation failed"), {
        details: {
          errors: [
            "Course must contain at least one instructional module.",
            "A course category must be assigned.",
          ],
        },
      });
      vi.mocked(courseService.publishCourse).mockRejectedValue(validationError);

      renderWithAuth(<InstructorCoursesPage />, mockUser);

      await waitFor(() => {
        expect(
          screen.getByText("FastAPI & Microservices Architecture")
        ).toBeInTheDocument();
      });

      // Click Publish
      const publishBtn = screen.getByRole("button", { name: /^Publish$/i });
      fireEvent.click(publishBtn);

      await waitFor(() => {
        expect(
          screen.getByText(/Publication Completeness Requirements Not Met/i)
        ).toBeInTheDocument();
        expect(
          screen.getByText(/Course must contain at least one instructional module/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("CourseEditorPage", () => {
    it("validates mandatory fields and creates course", async () => {
      vi.mocked(courseService.listCategories).mockResolvedValue([mockCategory]);
      vi.mocked(courseService.createCourse).mockResolvedValue(mockCourseDetail);

      renderWithAuth(<CourseEditorPage />, mockUser);

      const submitBtn = screen.getByRole("button", { name: /Create & Open Builder/i });
      fireEvent.click(submitBtn);

      // Validation errors should show
      await waitFor(() => {
        expect(
          screen.getByText("Title must be at least 3 characters long.")
        ).toBeInTheDocument();
      });

      // Fill in valid fields
      fireEvent.change(screen.getByPlaceholderText(/e.g. Distributed Systems/i), {
        target: { value: "Advanced System Design" },
      });
      fireEvent.change(
        screen.getByPlaceholderText(/Concise 1-2 sentence overview/i),
        { target: { value: "Deep dive into distributed systems design." } }
      );
      fireEvent.change(
        screen.getByPlaceholderText(/Detailed curriculum overview/i),
        {
          target: {
            value: "Comprehensive overview of consensus algorithms and sharding.",
          },
        }
      );
      // Wait for categories to finish loading
      await waitFor(() => {
        expect(screen.getByText("Computer Science")).toBeInTheDocument();
      });
      fireEvent.change(screen.getByLabelText(/Course Category/i), {
        target: { value: "cat-1" },
      });

      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(courseService.createCourse).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Advanced System Design",
            category_id: "cat-1",
          })
        );
      });
    });
  });

  describe("CourseBuilderPage", () => {
    it("renders curriculum structure and opens module creation modal", async () => {
      vi.mocked(courseService.getCourseDetail).mockResolvedValue(mockCourseDetail);

      renderWithAuth(
        <Routes>
          <Route
            path="/instructor/courses/:courseId/builder"
            element={<CourseBuilderPage />}
          />
        </Routes>,
        mockUser,
        "/instructor/courses/course-1/builder"
      );

      await waitFor(() => {
        expect(screen.getByText("Curriculum Modules")).toBeInTheDocument();
        expect(screen.getByText(/Foundations/i)).toBeInTheDocument();
      });

      // Open Add Module modal
      const addModuleBtn = screen.getByRole("button", { name: /Add Module/i });
      fireEvent.click(addModuleBtn);

      await waitFor(() => {
        expect(screen.getByText("Add New Module")).toBeInTheDocument();
      });
    });
  });

  describe("AdminCategoriesPage", () => {
    it("renders categories table and triggers category creation", async () => {
      vi.mocked(courseService.listCategories).mockResolvedValue([mockCategory]);
      vi.mocked(courseService.createCategory).mockResolvedValue(mockCategory);

      renderWithAuth(<AdminCategoriesPage />, mockAdminUser);

      await waitFor(() => {
        expect(screen.getByText("Computer Science")).toBeInTheDocument();
        expect(screen.getByText("computer-science")).toBeInTheDocument();
      });

      // Open modal
      const addCatBtn = screen.getByRole("button", { name: /Add Category/i });
      fireEvent.click(addCatBtn);

      await waitFor(() => {
        expect(screen.getByText("New Course Category")).toBeInTheDocument();
      });

      // Fill and submit
      fireEvent.change(screen.getByPlaceholderText(/e.g. Artificial Intelligence/i), {
        target: { value: "Cloud Engineering" },
      });

      const saveBtn = screen.getByRole("button", { name: /Create Category/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(courseService.createCategory).toHaveBeenCalledWith(
          expect.objectContaining({ name: "Cloud Engineering" })
        );
      });
    });
  });
});
