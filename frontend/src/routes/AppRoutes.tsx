import { Routes, Route } from "react-router-dom";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { LandingPage } from "@/pages/LandingPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { CoursesPage } from "@/pages/CoursesPage";
import { CourseDetailPage } from "@/pages/CourseDetailPage";
import { InstructorCoursesPage } from "@/pages/InstructorCoursesPage";
import { CourseEditorPage } from "@/pages/CourseEditorPage";
import { CourseBuilderPage } from "@/pages/CourseBuilderPage";
import { InstructorQuizzesPage } from "@/pages/InstructorQuizzesPage";
import { QuizBuilderPage } from "@/pages/QuizBuilderPage";
import { QuizTakingPage } from "@/pages/QuizTakingPage";
import { QuizResultPage } from "@/pages/QuizResultPage";
import { AdminCategoriesPage } from "@/pages/AdminCategoriesPage";
import { MyLearningPage } from "@/pages/MyLearningPage";
import { CourseLearningPage } from "@/pages/CourseLearningPage";
import { SystemStatusPage } from "@/pages/SystemStatusPage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { VerifyEmailPage } from "@/pages/VerifyEmailPage";
import { UnauthorizedPage } from "@/pages/UnauthorizedPage";
import { SessionExpiredPage } from "@/pages/SessionExpiredPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { SecuritySessionsPage } from "@/pages/SecuritySessionsPage";
import { AdminUsersPage } from "@/pages/AdminUsersPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { StudentAnalyticsDashboard } from "@/pages/StudentAnalyticsDashboard";
import { InstructorAnalyticsDashboard } from "@/pages/InstructorAnalyticsDashboard";
import { AdminAnalyticsDashboard } from "@/pages/AdminAnalyticsDashboard";
import { LearnersPage } from "@/pages/LearnersPage";
import { LearnerProfilePage } from "@/pages/LearnerProfilePage";
import { AssignmentsPage } from "@/pages/AssignmentsPage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { CertificatesPage } from "@/pages/CertificatesPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { IntegrationHealthPage } from "@/pages/IntegrationHealthPage";
import { ProtectedRoute, RoleProtectedRoute } from "@/routes/RouteGuards";

export function AppRoutes() {
  return (
    <Routes>
      {/* Platform Layout Routes */}
      <Route element={<DashboardLayout />}>
        {/* Public Overview & Showcase */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/status" element={<SystemStatusPage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/courses/:courseId" element={<CourseDetailPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/session-expired" element={<SessionExpiredPage />} />

        {/* Protected User Dashboard & Profile */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        {/* ExcelR Track360 Operational Pages */}
        <Route
          path="/learners"
          element={
            <ProtectedRoute>
              <LearnersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/learners/:candidateId"
          element={
            <ProtectedRoute>
              <LearnerProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assignments"
          element={
            <ProtectedRoute>
              <AssignmentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <ProjectsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/certificates"
          element={
            <ProtectedRoute>
              <CertificatesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/integration-health" element={<IntegrationHealthPage />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/security"
          element={
            <ProtectedRoute>
              <SecuritySessionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sessions"
          element={
            <ProtectedRoute>
              <SecuritySessionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-learning"
          element={
            <ProtectedRoute>
              <MyLearningPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/learning/courses/:courseId"
          element={
            <ProtectedRoute>
              <CourseLearningPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/learning/quizzes/:quizId"
          element={
            <ProtectedRoute>
              <QuizTakingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/learning/quizzes/:quizId/results/:attemptId"
          element={
            <ProtectedRoute>
              <QuizResultPage />
            </ProtectedRoute>
          }
        />

        {/* Protected Instructor Routes */}
        <Route
          path="/instructor/courses"
          element={
            <RoleProtectedRoute allowedRoles={["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"]}>
              <InstructorCoursesPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/instructor/courses/new"
          element={
            <RoleProtectedRoute allowedRoles={["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"]}>
              <CourseEditorPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/instructor/courses/:courseId/edit"
          element={
            <RoleProtectedRoute allowedRoles={["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"]}>
              <CourseEditorPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/instructor/courses/:courseId/builder"
          element={
            <RoleProtectedRoute allowedRoles={["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"]}>
              <CourseBuilderPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/instructor/quizzes"
          element={
            <RoleProtectedRoute allowedRoles={["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"]}>
              <InstructorQuizzesPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/instructor/quizzes/:quizId/builder"
          element={
            <RoleProtectedRoute allowedRoles={["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"]}>
              <QuizBuilderPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/instructor/analytics"
          element={
            <RoleProtectedRoute allowedRoles={["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"]}>
              <InstructorAnalyticsDashboard />
            </RoleProtectedRoute>
          }
        />

        {/* Protected Admin Routes */}
        <Route
          path="/admin/users"
          element={
            <RoleProtectedRoute allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
              <AdminUsersPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/admin/categories"
          element={
            <RoleProtectedRoute allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
              <AdminCategoriesPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <RoleProtectedRoute allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
              <AdminAnalyticsDashboard />
            </RoleProtectedRoute>
          }
        />

        {/* Dedicated Student Analytics Route */}
        <Route
          path="/analytics/student"
          element={
            <ProtectedRoute>
              <StudentAnalyticsDashboard />
            </ProtectedRoute>
          }
        />

        {/* 404 Fallback */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Auth Layout Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
      </Route>
    </Routes>
  );
}
