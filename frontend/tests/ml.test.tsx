import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CourseRecommendationsCard } from "@/components/ml/CourseRecommendationsCard";
import { LearningPathCard } from "@/components/ml/LearningPathCard";
import { LearningInsightsCard } from "@/components/ml/LearningInsightsCard";
import { mlService } from "@/services/mlService";
import {
  CourseRecommendationsResponse,
  LearningInsightsResponse,
  LearningPathResponse,
} from "@/types/ml";

vi.mock("@/services/mlService", () => ({
  mlService: {
    getCourseRecommendations: vi.fn(),
    getLearningInsights: vi.fn(),
    getLearningPath: vi.fn(),
    getModelStatus: vi.fn(),
  },
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

describe("Phase 8: Machine Learning, Learning Analytics & Recommendations Frontend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. Course Recommendations Tests
  // =========================================================================

  describe("CourseRecommendationsCard", () => {
    it("renders personalized recommendations with strategy badges and reasons", async () => {
      const mockRecs: CourseRecommendationsResponse = {
        recommendations: [
          {
            course_id: "rec-1",
            title: "Advanced Data Analysis in Python",
            slug: "adv-data-python",
            short_description: "Master pandas and exploratory analysis.",
            category_name: "Computer Science",
            difficulty: "intermediate",
            duration_minutes: 180,
            score: 0.92,
            strategy: "content_based",
            reason: "Builds directly on your progress in 'Python Basics'.",
            matching_topics: ["pandas", "dataframes"],
          },
          {
            course_id: "rec-2",
            title: "Introductory Web Design",
            slug: "intro-web-design",
            short_description: "Learn modern CSS and responsive layouts.",
            category_name: "Design",
            difficulty: "beginner",
            duration_minutes: 90,
            score: 0.85,
            strategy: "popularity_fallback",
            reason: "Popular foundational course for new learners.",
            matching_topics: ["css", "html"],
          },
        ],
        total_evaluated: 5,
        applied_strategy: "content_based",
        is_fallback: false,
      };

      vi.mocked(mlService.getCourseRecommendations).mockResolvedValue(mockRecs);

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <MemoryRouter>
            <CourseRecommendationsCard limit={3} />
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Wait for async course items to appear
      const courseTitle = await screen.findByText("Advanced Data Analysis in Python");
      expect(courseTitle).toBeInTheDocument();

      expect(screen.getByText("Content Match")).toBeInTheDocument();
      expect(screen.getByText("Builds directly on your progress in 'Python Basics'.")).toBeInTheDocument();

      expect(screen.getByText("Introductory Web Design")).toBeInTheDocument();
      expect(screen.getByText("Popular Choice")).toBeInTheDocument();
    });

    it("renders empty state when no eligible recommendations exist", async () => {
      vi.mocked(mlService.getCourseRecommendations).mockResolvedValue({
        recommendations: [],
        total_evaluated: 0,
        applied_strategy: "none",
        is_fallback: false,
      });

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <MemoryRouter>
            <CourseRecommendationsCard limit={3} />
          </MemoryRouter>
        </QueryClientProvider>
      );

      const emptyTitle = await screen.findByText("All caught up!");
      expect(emptyTitle).toBeInTheDocument();
      expect(screen.getByText("Browse Full Catalog")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 2. Learning Path Suggestions Tests
  // =========================================================================

  describe("LearningPathCard", () => {
    it("renders next sequential lesson step with skill gap alerts and prerequisites", async () => {
      const mockPath: LearningPathResponse = {
        student_id: "std-1",
        current_focus: "Active Course: 'Fullstack TypeScript'",
        next_step: {
          step_type: "lesson_completion",
          title: "Complete 'Generics in Depth'",
          description: "Continue where you left off in 'Fullstack TypeScript'.",
          course_id: "course-123",
          course_title: "Fullstack TypeScript",
          lesson_id: "lesson-456",
          lesson_title: "Generics in Depth",
          estimated_minutes: 20,
          confidence_level: "high",
        },
        prerequisite_checks: [
          {
            prerequisite_name: "JavaScript Basics",
            is_met: true,
            evidence: "Verified via prior completion",
          },
          {
            prerequisite_name: "Async Programming",
            is_met: false,
            evidence: "Pending verification",
          },
        ],
        skill_gaps: [
          {
            topic: "TypeScript Fundamentals",
            assessment_title: "Types & Interfaces Quiz",
            score: 55.0,
            recommendation: "Review interface merging before attempting complex generics.",
          },
        ],
        rationale: "Sequential lesson progression reinforces foundational type syntax.",
      };

      vi.mocked(mlService.getLearningPath).mockResolvedValue(mockPath);

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <MemoryRouter>
            <LearningPathCard />
          </MemoryRouter>
        </QueryClientProvider>
      );

      const nextLesson = await screen.findByText("Complete 'Generics in Depth'");
      expect(nextLesson).toBeInTheDocument();
      expect(screen.getByText("Continue Lesson")).toBeInTheDocument();

      // Skill Gap
      expect(screen.getByText("Targeted Skill Reinforcement")).toBeInTheDocument();
      expect(screen.getByText(/Types & Interfaces Quiz/)).toBeInTheDocument();

      // Prerequisites
      expect(screen.getByText("JavaScript Basics")).toBeInTheDocument();
      expect(screen.getByText("Met")).toBeInTheDocument();
      expect(screen.getByText("Pending")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 3. Learning Momentum & Insights Tests
  // =========================================================================

  describe("LearningInsightsCard", () => {
    it("renders supportive pacing guidance and contributing factors", async () => {
      const mockInsights: LearningInsightsResponse = {
        student_id: "std-2",
        risk_level: "low",
        risk_score: 0.15,
        confidence_score: 0.90,
        momentum_status: "accelerating",
        contributing_factors: [
          {
            factor_name: "Consistent Study Pace",
            impact: "positive",
            description: "Completed 3 lessons this week.",
            weight: 0.35,
          },
          {
            factor_name: "Quiz Performance",
            impact: "positive",
            description: "90% pass rate on first attempts.",
            weight: 0.40,
          },
        ],
        supportive_guidance: [
          "Keep up the great study continuity!",
          "Consider attempting the chapter summary quiz next.",
        ],
        model_version: "v1.0.0",
        is_insufficient_data: false,
      };

      vi.mocked(mlService.getLearningInsights).mockResolvedValue(mockInsights);

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <MemoryRouter>
            <LearningInsightsCard />
          </MemoryRouter>
        </QueryClientProvider>
      );

      const momentumBadge = await screen.findByText("Accelerating Momentum");
      expect(momentumBadge).toBeInTheDocument();

      expect(screen.getByText("Consistent Study Pace")).toBeInTheDocument();
      expect(screen.getByText("Keep up the great study continuity!")).toBeInTheDocument();
      expect(screen.getByText(/These insights are supportive estimations/)).toBeInTheDocument();
    });

    it("renders encouraging state for new learner without alarming colors", async () => {
      const mockColdStart: LearningInsightsResponse = {
        student_id: "std-new",
        risk_level: "insufficient_data",
        risk_score: 0.0,
        confidence_score: 0.0,
        momentum_status: "insufficient_data",
        contributing_factors: [
          {
            factor_name: "New Learner",
            impact: "neutral",
            description: "Not enough learning activity recorded yet to estimate study pace.",
            weight: 0.0,
          },
        ],
        supportive_guidance: [
          "Welcome to Learnova! Begin with your first lesson to start tracking your momentum.",
        ],
        model_version: "baseline",
        is_insufficient_data: true,
      };

      vi.mocked(mlService.getLearningInsights).mockResolvedValue(mockColdStart);

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <MemoryRouter>
            <LearningInsightsCard />
          </MemoryRouter>
        </QueryClientProvider>
      );

      const tipText = await screen.findByText(
        "Welcome to Learnova! Begin with your first lesson to start tracking your momentum."
      );
      expect(tipText).toBeInTheDocument();

      const newLearnerBadges = screen.getAllByText("New Learner");
      expect(newLearnerBadges.length).toBeGreaterThan(0);
    });
  });
});
