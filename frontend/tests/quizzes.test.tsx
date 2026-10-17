import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/context/authContextDef";
import { InstructorQuizzesPage } from "@/pages/InstructorQuizzesPage";
import { QuizBuilderPage } from "@/pages/QuizBuilderPage";
import { QuizTakingPage } from "@/pages/QuizTakingPage";
import { QuizResultPage } from "@/pages/QuizResultPage";
import { quizService } from "@/services/quizService";
import { courseService } from "@/services/courseService";
import {
  QuizDetail,
  StudentQuizTakeResponse,
  QuizAttemptStart,
  QuizResult,
} from "@/types/quiz";
import { User } from "@/types/auth";

vi.mock("@/services/quizService", () => ({
  quizService: {
    listInstructorQuizzes: vi.fn(),
    createQuiz: vi.fn(),
    getQuiz: vi.fn(),
    updateQuiz: vi.fn(),
    deleteQuiz: vi.fn(),
    publishQuiz: vi.fn(),
    archiveQuiz: vi.fn(),
    addQuestion: vi.fn(),
    updateQuestion: vi.fn(),
    deleteQuestion: vi.fn(),
    reorderQuestions: vi.fn(),
    listCourseQuizzes: vi.fn(),
    getQuizForTaking: vi.fn(),
    startQuizAttempt: vi.fn(),
    saveAnswer: vi.fn(),
    submitQuizAttempt: vi.fn(),
    getQuizResult: vi.fn(),
    listMyQuizAttempts: vi.fn(),
  },
}));

vi.mock("@/services/courseService", () => ({
  courseService: {
    listCourses: vi.fn(),
  },
}));

const mockInstructorUser: User = {
  id: "inst-1",
  email: "instructor@learnova.ai",
  first_name: "Instructor",
  last_name: "One",
  full_name: "Instructor One",
  avatar_url: null,
  roles: ["INSTRUCTOR"],
  permissions: ["QUIZ_CREATE", "QUIZ_UPDATE", "QUIZ_PUBLISH"],
  organization_id: null,
  last_login_at: null,
  is_active: true,
  is_verified: true,
  created_at: new Date().toISOString(),
};

const mockStudentUser: User = {
  id: "student-1",
  email: "student@learnova.ai",
  first_name: "Student",
  last_name: "One",
  full_name: "Student One",
  avatar_url: null,
  roles: ["STUDENT"],
  permissions: ["QUIZ_TAKE"],
  organization_id: null,
  last_login_at: null,
  is_active: true,
  is_verified: true,
  created_at: new Date().toISOString(),
};

const mockQuizDetail: QuizDetail = {
  id: "quiz-101",
  course_id: "course-1",
  lesson_id: null,
  instructor_id: "inst-1",
  organization_id: null,
  title: "Python Data Structures Mastery",
  description: "Test your knowledge of lists, sets, and dicts.",
  instructions: "Answer all questions to the best of your ability.",
  status: "published",
  duration_minutes: 20,
  passing_score_percentage: 70,
  max_attempts: 3,
  shuffle_questions: false,
  shuffle_options: false,
  published_at: new Date().toISOString(),
  archived_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  total_points: 20,
  question_count: 2,
  questions: [
    {
      id: "q-1",
      quiz_id: "quiz-101",
      question_text: "What is the time complexity of searching a key in a Python dict on average?",
      question_type: "single_choice",
      points: 10,
      order_index: 0,
      explanation: "Dicts use hash tables providing O(1) average lookup.",
      is_required: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      options: [
        {
          id: "opt-1",
          question_id: "q-1",
          option_text: "O(1)",
          is_correct: true,
          order_index: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "opt-2",
          question_id: "q-1",
          option_text: "O(N)",
          is_correct: false,
          order_index: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    },
    {
      id: "q-2",
      quiz_id: "quiz-101",
      question_text: "Lists in Python are immutable.",
      question_type: "true_false",
      points: 10,
      order_index: 1,
      explanation: "Lists are mutable sequences.",
      is_required: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      options: [
        {
          id: "opt-3",
          question_id: "q-2",
          option_text: "True",
          is_correct: false,
          order_index: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "opt-4",
          question_id: "q-2",
          option_text: "False",
          is_correct: true,
          order_index: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    },
  ],
};

const mockTakeResponse: StudentQuizTakeResponse = {
  id: "quiz-101",
  course_id: "course-1",
  lesson_id: null,
  title: "Python Data Structures Mastery",
  description: "Test your knowledge of lists, sets, and dicts.",
  instructions: "Answer all questions to the best of your ability.",
  duration_minutes: 20,
  passing_score_percentage: 70,
  max_attempts: 3,
  total_points: 20,
  question_count: 2,
  active_attempt_id: null,
  time_remaining_seconds: 1200,
  questions: [
    {
      id: "q-1",
      quiz_id: "quiz-101",
      question_text: "What is the time complexity of searching a key in a Python dict on average?",
      question_type: "single_choice",
      order_index: 0,
      points: 10,
      is_required: true,
      options: [
        { id: "opt-1", option_text: "O(1)", order_index: 0 },
        { id: "opt-2", option_text: "O(N)", order_index: 1 },
      ],
    },
    {
      id: "q-2",
      quiz_id: "quiz-101",
      question_type: "true_false",
      question_text: "Lists in Python are immutable.",
      points: 10,
      order_index: 1,
      is_required: true,
      options: [
        { id: "opt-3", option_text: "True", order_index: 0 },
        { id: "opt-4", option_text: "False", order_index: 1 },
      ],
    },
  ],
};

const mockAttemptStart: QuizAttemptStart = {
  id: "att-1",
  quiz_id: "quiz-101",
  attempt_number: 1,
  status: "in_progress",
  started_at: new Date().toISOString(),
  duration_minutes: 20,
  time_remaining_seconds: 1200,
};

const mockQuizResult: QuizResult = {
  attempt_id: "att-1",
  quiz_id: "quiz-101",
  quiz_title: "Python Data Structures Mastery",
  attempt_number: 1,
  status: "completed",
  started_at: new Date().toISOString(),
  submitted_at: new Date().toISOString(),
  time_spent_seconds: 145,
  score: 20,
  max_score: 20,
  percentage_score: 100,
  passed: true,
  passing_score_percentage: 70,
  can_retake: true,
  attempts_remaining: 2,
  question_results: [
    {
      question_id: "q-1",
      question_text: "What is the time complexity of searching a key in a Python dict on average?",
      question_type: "single_choice",
      order_index: 0,
      points_possible: 10,
      points_awarded: 10,
      is_correct: true,
      selected_option_ids: ["opt-1"],
      correct_option_ids: ["opt-1"],
      explanation: "Dicts use hash tables providing O(1) average lookup.",
      options: [
        {
          id: "opt-1",
          question_id: "q-1",
          option_text: "O(1)",
          order_index: 0,
          is_correct: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "opt-2",
          question_id: "q-1",
          option_text: "O(N)",
          order_index: 1,
          is_correct: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    },
  ],
};

function renderWithProviders(
  ui: React.ReactElement,
  {
    user = mockInstructorUser,
    route = "/",
  }: { user?: User | null; route?: string } = {}
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  const authValue = {
    user,
    isAuthenticated: !!user,
    isLoading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    refreshUser: vi.fn(),
    clearError: vi.fn(),
    hasRole: (role: string) => user?.roles?.includes(role as any) ?? false,
    hasPermission: (p: string) => user?.permissions?.includes(p) ?? false,
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe("Phase 5: Quiz & Assessment System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Instructor Quiz Management", () => {
    it("renders instructor quiz listing and allows status filtering", async () => {
      vi.mocked(quizService.listInstructorQuizzes).mockResolvedValue({
        items: [mockQuizDetail],
        total: 1,
        page: 1,
        page_size: 20,
        total_pages: 1,
      });
      vi.mocked(courseService.listCourses).mockResolvedValue({
        items: [{ id: "course-1", title: "Python Advanced" } as any],
        total: 1,
        page: 1,
        page_size: 100,
        total_pages: 1,
      });

      renderWithProviders(<InstructorQuizzesPage />);

      await waitFor(() => {
        expect(screen.getByText("Python Data Structures Mastery")).toBeInTheDocument();
      });

      expect(screen.getByText("Quiz & Assessment Management")).toBeInTheDocument();
      expect(screen.getByText(/Pass: 70%/)).toBeInTheDocument();
    });

    it("opens create quiz modal and invokes createQuiz mutation", async () => {
      vi.mocked(quizService.listInstructorQuizzes).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        page_size: 20,
        total_pages: 0,
      });
      vi.mocked(courseService.listCourses).mockResolvedValue({
        items: [{ id: "course-1", title: "Python Advanced" } as any],
        total: 1,
        page: 1,
        page_size: 100,
        total_pages: 1,
      });
      vi.mocked(quizService.createQuiz).mockResolvedValue(mockQuizDetail);

      renderWithProviders(<InstructorQuizzesPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Create New Quiz/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /Create New Quiz/i }));

      expect(screen.getByText("Create New Quiz", { selector: "h2" })).toBeInTheDocument();

      const courseSelect = screen.getByRole("combobox");
      fireEvent.change(courseSelect, { target: { value: "course-1" } });

      const titleInput = screen.getByPlaceholderText(/e\.g\. Midterm Assessment/i);
      fireEvent.change(titleInput, { target: { value: "Algorithms Assessment" } });

      const submitBtn = screen.getByRole("button", { name: "Create Draft Quiz" });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(quizService.createQuiz).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Algorithms Assessment",
            course_id: "course-1",
          })
        );
      });
    });

    it("handles publish and archive actions on quiz items", async () => {
      const draftQuiz: QuizDetail = {
        ...mockQuizDetail,
        id: "quiz-draft",
        status: "draft",
        title: "Draft Quiz Item",
      };
      vi.mocked(quizService.listInstructorQuizzes).mockResolvedValue({
        items: [draftQuiz],
        total: 1,
        page: 1,
        page_size: 20,
        total_pages: 1,
      });
      vi.mocked(courseService.listCourses).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        page_size: 100,
        total_pages: 0,
      });
      vi.mocked(quizService.publishQuiz).mockResolvedValue(mockQuizDetail);

      renderWithProviders(<InstructorQuizzesPage />);

      await waitFor(() => {
        expect(screen.getByText("Draft Quiz Item")).toBeInTheDocument();
      });

      const publishBtn = screen.getByRole("button", { name: /^Publish$/i });
      fireEvent.click(publishBtn);

      await waitFor(() => {
        expect(quizService.publishQuiz).toHaveBeenCalledWith("quiz-draft");
      });
    });
  });

  describe("Quiz Builder & Question Authoring", () => {
    it("renders quiz builder with questions and allows adding questions", async () => {
      vi.mocked(quizService.getQuiz).mockResolvedValue(mockQuizDetail);
      vi.mocked(quizService.addQuestion).mockResolvedValue(mockQuizDetail.questions[0]);

      renderWithProviders(
        <Routes>
          <Route path="/instructor/quizzes/:quizId/builder" element={<QuizBuilderPage />} />
        </Routes>,
        { route: "/instructor/quizzes/quiz-101/builder" }
      );

      await waitFor(() => {
        expect(screen.getByText("Python Data Structures Mastery")).toBeInTheDocument();
        expect(screen.getByText(/What is the time complexity/)).toBeInTheDocument();
        expect(screen.getByText(/Lists in Python are immutable/)).toBeInTheDocument();
      });

      const addBtn = screen.getByRole("button", { name: /Add Question/i });
      fireEvent.click(addBtn);

      expect(screen.getByText("Add New Question")).toBeInTheDocument();

      const questionTextInput = screen.getByPlaceholderText("Enter the question text...");
      fireEvent.change(questionTextInput, {
        target: { value: "Which of the following are mutable in Python?" },
      });

      const optionA = screen.getByPlaceholderText("Option A text");
      fireEvent.change(optionA, { target: { value: "Lists" } });

      const optionB = screen.getByPlaceholderText("Option B text");
      fireEvent.change(optionB, { target: { value: "Tuples" } });

      const saveBtn = screen.getByRole("button", { name: /Save Question/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(quizService.addQuestion).toHaveBeenCalledWith(
          "quiz-101",
          expect.objectContaining({
            question_text: "Which of the following are mutable in Python?",
          })
        );
      });
    });
  });

  describe("Student Quiz-Taking Flow & Lifecycle", () => {
    it("renders instructions overview before starting attempt and starts assessment", async () => {
      vi.mocked(quizService.getQuizForTaking).mockResolvedValue(mockTakeResponse);
      vi.mocked(quizService.listMyQuizAttempts).mockResolvedValue([]);
      vi.mocked(quizService.startQuizAttempt).mockResolvedValue(mockAttemptStart);

      renderWithProviders(
        <Routes>
          <Route path="/learning/quizzes/:quizId" element={<QuizTakingPage />} />
        </Routes>,
        { user: mockStudentUser, route: "/learning/quizzes/quiz-101" }
      );

      await waitFor(() => {
        expect(screen.getByText("Python Data Structures Mastery")).toBeInTheDocument();
        expect(screen.getByText("Assessment Guidelines")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Start Assessment/i })).toBeInTheDocument();
      });

      const startBtn = screen.getByRole("button", { name: /Start Assessment/i });
      fireEvent.click(startBtn);

      await waitFor(() => {
        expect(quizService.startQuizAttempt).toHaveBeenCalledWith("quiz-101");
      });
    });

    it("displays active assessment, saves student answers, and handles submission", async () => {
      const activeTakeResponse: StudentQuizTakeResponse = {
        ...mockTakeResponse,
        active_attempt_id: "att-1",
      };
      vi.mocked(quizService.getQuizForTaking).mockResolvedValue(activeTakeResponse);
      vi.mocked(quizService.listMyQuizAttempts).mockResolvedValue([]);
      vi.mocked(quizService.saveAnswer).mockResolvedValue({
        question_id: "q-1",
        selected_option_ids: ["opt-1"],
        saved: true,
      });
      vi.mocked(quizService.submitQuizAttempt).mockResolvedValue(mockQuizResult);

      renderWithProviders(
        <Routes>
          <Route path="/learning/quizzes/:quizId" element={<QuizTakingPage />} />
        </Routes>,
        { user: mockStudentUser, route: "/learning/quizzes/quiz-101" }
      );

      await waitFor(() => {
        expect(screen.getByText(/What is the time complexity/)).toBeInTheDocument();
        expect(screen.getByText("O(1)")).toBeInTheDocument();
      });

      const optionBtn = screen.getByText("O(1)");
      fireEvent.click(optionBtn);

      await waitFor(() => {
        expect(quizService.saveAnswer).toHaveBeenCalledWith("att-1", "q-1", ["opt-1"]);
      });

      const submitBtn = screen.getByRole("button", { name: /^Submit$/i });
      fireEvent.click(submitBtn);

      expect(screen.getByText("Ready to Submit?")).toBeInTheDocument();

      const confirmSubmitBtn = screen.getByRole("button", { name: "Confirm & Grade Quiz" });
      fireEvent.click(confirmSubmitBtn);

      await waitFor(() => {
        expect(quizService.submitQuizAttempt).toHaveBeenCalledWith("att-1");
      });
    });
  });

  describe("Quiz Results & Feedback", () => {
    it("displays completed result with score, pass status, and feedback", async () => {
      vi.mocked(quizService.getQuizResult).mockResolvedValue(mockQuizResult);

      renderWithProviders(
        <Routes>
          <Route
            path="/learning/quizzes/:quizId/results/:attemptId"
            element={<QuizResultPage />}
          />
        </Routes>,
        {
          user: mockStudentUser,
          route: "/learning/quizzes/quiz-101/results/att-1",
        }
      );

      await waitFor(() => {
        expect(screen.getByText("Assessment Passed!")).toBeInTheDocument();
        expect(screen.getByText("100%")).toBeInTheDocument();
        expect(screen.getByText("20 / 20 pts")).toBeInTheDocument();
        expect(screen.getByText("Dicts use hash tables providing O(1) average lookup.")).toBeInTheDocument();
      });

      expect(screen.getByText("Detailed Question Review")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Retake Assessment/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Return to My Learning/i })).toBeInTheDocument();
    });
  });
});
