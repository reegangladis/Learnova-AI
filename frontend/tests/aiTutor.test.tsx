import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AITutorPanel } from "@/components/ai/AITutorPanel";
import { CourseLearningPage } from "@/pages/CourseLearningPage";
import { aiService } from "@/services/aiService";
import { learningService } from "@/services/learningService";
import { quizService } from "@/services/quizService";
import { AIChatResponse, AIConversation } from "@/types/ai";
import { LearningCourse } from "@/types/learning";

vi.mock("@/services/aiService", () => ({
  aiService: {
    chat: vi.fn(),
    listConversations: vi.fn(),
    getConversation: vi.fn(),
    deleteConversation: vi.fn(),
    getCourseIngestionStatus: vi.fn(),
    triggerCourseIngestion: vi.fn(),
    triggerLessonIngestion: vi.fn(),
  },
}));

vi.mock("@/services/learningService", () => ({
  learningService: {
    getCourseLearningView: vi.fn(),
    updateLessonProgress: vi.fn(),
  },
}));

vi.mock("@/services/quizService", () => ({
  quizService: {
    listCourseQuizzes: vi.fn(),
  },
}));

const mockCourseData: LearningCourse = {
  id: "course-101",
  title: "Cloud Native System Architecture",
  slug: "cloud-native-system-architecture",
  short_description: "Cloud architecture guide",
  description: "Comprehensive guide to distributed systems and cloud architecture",
  thumbnail_url: null,
  difficulty: "intermediate",
  duration_minutes: 50,
  learning_objectives: ["Understand distributed architecture"],
  prerequisites: [],
  modules: [
    {
      id: "mod-1",
      course_id: "course-101",
      title: "Core Distributed Patterns",
      description: "Fundamental patterns",
      order_index: 1,
      total_lessons_count: 2,
      completed_lessons_count: 1,
      lessons: [
        {
          id: "les-1",
          module_id: "mod-1",
          title: "Introduction to Microservices & RPC",
          description: "Overview of microservices",
          order_index: 1,
          content_type: "text",
          text_content: "Microservices split systems into decoupled domain services communicating via gRPC or HTTP.",
          resource_url: null,
          duration_minutes: 20,
          is_preview: true,
          is_completed: true,
          completed_at: new Date().toISOString(),
        },
        {
          id: "les-2",
          module_id: "mod-1",
          title: "CAP Theorem and Consistency Models",
          description: "Deep dive into CAP theorem",
          order_index: 2,
          content_type: "text",
          text_content: "Brewer's theorem states any distributed data store can only guarantee 2 of 3: Consistency, Availability, Partition tolerance.",
          resource_url: null,
          duration_minutes: 30,
          is_preview: false,
          is_completed: false,
          completed_at: null,
        },
      ],
    },
  ],
  progress: {
    course_id: "course-101",
    total_lessons: 2,
    completed_lessons: 1,
    progress_percentage: 50,
    completed_lesson_ids: ["les-1"],
    is_course_completed: false,
  },
  enrollment_status: "active",
  enrolled_at: new Date().toISOString(),
  completed_at: null,
};

const mockChatGroundedResponse: AIChatResponse = {
  conversation_id: "conv-abc",
  message_id: "msg-1",
  role: "assistant",
  content: "According to the course material, the CAP theorem states that a distributed system can only provide two of Consistency, Availability, and Partition tolerance simultaneously.",
  grounded_in_sources: true,
  citations: [
    {
      chunk_id: "chk-1",
      course_id: "course-101",
      lesson_id: "les-2",
      lesson_title: "CAP Theorem and Consistency Models",
      similarity_score: 0.94,
      snippet: "Brewer's theorem states any distributed data store can only guarantee 2 of 3...",
    },
  ],
  follow_up_suggestions: [
    "How does PACELC expand upon CAP?",
    "Give an example of a CP system.",
  ],
};

const mockChatUngroundedResponse: AIChatResponse = {
  conversation_id: "conv-abc",
  message_id: "msg-2",
  role: "assistant",
  content: "Quantum computing utilizes qubits and superposition. This topic is not covered in your course syllabus, but here is a general explanation.",
  grounded_in_sources: false,
  citations: [],
  follow_up_suggestions: [
    "What course topics relate to distributed computing?",
  ],
};

const mockConversationsList: AIConversation[] = [
  {
    id: "conv-1",
    title: "CAP Theorem Discussion",
    course_id: "course-101",
    lesson_id: "les-2",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

describe("Phase 7: AI Tutor Frontend Experience", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.mocked(learningService.getCourseLearningView).mockResolvedValue(mockCourseData);
    vi.mocked(quizService.listCourseQuizzes).mockResolvedValue([]);
    vi.mocked(aiService.listConversations).mockResolvedValue(mockConversationsList);
    vi.mocked(aiService.chat).mockResolvedValue(mockChatGroundedResponse);
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/learning/courses/course-101"]}>
          {ui}
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it("renders the AI Tutor standalone panel with starter prompts and context", async () => {
    renderWithProviders(
      <AITutorPanel
        courseId="course-101"
        activeLessonId="les-2"
        courseTitle="Cloud Native System Architecture"
        activeLessonTitle="CAP Theorem and Consistency Models"
      />
    );

    expect(screen.getByTestId("ai-tutor-panel")).toBeInTheDocument();
    expect(screen.getByText("AI Tutor")).toBeInTheDocument();
    expect(screen.getByText("Lesson: CAP Theorem and Consistency Models")).toBeInTheDocument();
    expect(screen.getByTestId("tutor-welcome-view")).toBeInTheDocument();

    // Check starter prompts
    expect(screen.getByTestId("starter-prompt-0")).toBeInTheDocument();
  });

  it("submits a question, renders grounded answer, citations, and follow-up chips", async () => {
    const handleNavigate = vi.fn();
    renderWithProviders(
      <AITutorPanel
        courseId="course-101"
        activeLessonId="les-2"
        courseTitle="Cloud Native System Architecture"
        activeLessonTitle="CAP Theorem and Consistency Models"
        onNavigateLesson={handleNavigate}
      />
    );

    // Click starter prompt
    const starterBtn = screen.getByTestId("starter-prompt-0");
    fireEvent.click(starterBtn);

    // Verify chat mutation was called
    await waitFor(() => {
      expect(aiService.chat).toHaveBeenCalledWith(
        expect.objectContaining({
          course_id: "course-101",
          lesson_id: "les-2",
        })
      );
    });

    // Verify response content and grounded badge
    await waitFor(() => {
      expect(screen.getByTestId("grounded-badge")).toBeInTheDocument();
      expect(screen.getByText(/According to the course material/)).toBeInTheDocument();
    });

    // Verify citations
    const citationChip = screen.getByTestId("citation-chip-0");
    expect(citationChip).toBeInTheDocument();
    expect(citationChip).toHaveTextContent("CAP Theorem and Consistency Models");

    // Click citation to test navigation callback
    fireEvent.click(citationChip);
    expect(handleNavigate).toHaveBeenCalledWith("les-2");

    // Verify follow-up chips
    expect(screen.getByTestId("followup-chip-0")).toHaveTextContent("How does PACELC expand upon CAP?");
  });

  it("renders ungrounded indicator when course content does not cover the question", async () => {
    vi.mocked(aiService.chat).mockResolvedValue(mockChatUngroundedResponse);

    renderWithProviders(
      <AITutorPanel
        courseId="course-101"
        courseTitle="Cloud Native System Architecture"
      />
    );

    const input = screen.getByTestId("ai-tutor-input");
    fireEvent.change(input, { target: { value: "Tell me about quantum computing" } });
    fireEvent.click(screen.getByTestId("send-question-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("ungrounded-badge")).toBeInTheDocument();
      expect(screen.getByText(/Quantum computing utilizes qubits/)).toBeInTheDocument();
    });
  });

  it("handles network/provider errors gracefully and enables retry", async () => {
    vi.mocked(aiService.chat).mockRejectedValueOnce(new Error("AI Gateway Timeout"));

    renderWithProviders(
      <AITutorPanel
        courseId="course-101"
        courseTitle="Cloud Native System Architecture"
      />
    );

    const input = screen.getByTestId("ai-tutor-input");
    fireEvent.change(input, { target: { value: "What is eventual consistency?" } });
    fireEvent.click(screen.getByTestId("send-question-btn"));

    await waitFor(() => {
      expect(
        screen.getByText(/I ran into an issue connecting to the AI learning service/)
      ).toBeInTheDocument();
    });

    const retryBtn = screen.getByTestId("retry-query-btn");
    expect(retryBtn).toBeInTheDocument();

    // Now mock success for retry
    vi.mocked(aiService.chat).mockResolvedValueOnce(mockChatGroundedResponse);
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(aiService.chat).toHaveBeenCalledTimes(2);
    });
  });

  it("integrates seamlessly into CourseLearningPage via toggle and drawer", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/learning/courses/course-101"]}>
          <Routes>
            <Route path="/learning/courses/:courseId" element={<CourseLearningPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Initial classroom view loads
    await waitFor(() => {
      expect(screen.getByText("Cloud Native System Architecture")).toBeInTheDocument();
    });

    // AI Tutor toggle button is present
    const toggleBtn = screen.getByTestId("toggle-ai-tutor-btn");
    expect(toggleBtn).toBeInTheDocument();

    // Floating action button is present initially
    expect(screen.getByTestId("floating-ai-tutor-btn")).toBeInTheDocument();

    // Drawer is closed initially
    expect(screen.queryByTestId("classroom-ai-tutor-drawer")).not.toBeInTheDocument();

    // Click toggle button to open drawer
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(screen.getByTestId("classroom-ai-tutor-drawer")).toBeInTheDocument();
    });

    // Close button closes the drawer
    const closeBtn = screen.getByTestId("close-tutor-btn");
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByTestId("classroom-ai-tutor-drawer")).not.toBeInTheDocument();
    });
  });
});
