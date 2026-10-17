import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { VerifyEmailPage } from "@/pages/VerifyEmailPage";
import { authService } from "@/services/authService";

vi.mock("@/services/authService", () => ({
  authService: {
    getMe: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
  },
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>{ui}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Frontend Authentication Pages & Interactivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthenticated"));
  });

  describe("LoginPage", () => {
    it("renders email and password inputs with demo autofill buttons", () => {
      renderWithProviders(<LoginPage />);
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Sign In/i })).toBeInTheDocument();
      expect(screen.getByText(/Demo Personas/i)).toBeInTheDocument();
    });

    it("autofills admin account when clicking admin persona card", () => {
      renderWithProviders(<LoginPage />);
      const adminBtn = screen.getByText(/^Admin$/i);
      fireEvent.click(adminBtn);

      const emailInput = screen.getByLabelText(/Email Address/i) as HTMLInputElement;
      expect(emailInput.value).toBe("admin@learnova.ai");
    });

    it("displays error alert when login fails", async () => {
      vi.mocked(authService.login).mockRejectedValueOnce(new Error("Invalid credentials provided."));

      renderWithProviders(<LoginPage />);
      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/^Password$/i);
      const submitBtn = screen.getByRole("button", { name: /Sign In/i });

      fireEvent.change(emailInput, { target: { value: "test@learnova.ai" } });
      fireEvent.change(passwordInput, { target: { value: "Wrong123!" } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText(/Invalid credentials provided/i)).toBeInTheDocument();
      });
    });
  });

  describe("RegisterPage", () => {
    it("renders registration inputs and interactive password checklist", () => {
      renderWithProviders(<RegisterPage />);
      expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
      expect(screen.getByText(/8\+ characters/i)).toBeInTheDocument();
    });

    it("submits valid registration and displays confirmation card", async () => {
      vi.mocked(authService.register).mockResolvedValueOnce({
        success: true,
        user: {
          id: "u-1",
          email: "newuser@learnova.ai",
          first_name: "New",
          last_name: "User",
          full_name: "New User",
          avatar_url: null,
          is_active: true,
          is_verified: false,
          roles: ["STUDENT"],
          permissions: ["COURSE_READ", "AI_USE"],
          organization_id: null,
          created_at: new Date().toISOString(),
          last_login_at: null,
        },
      });

      renderWithProviders(<RegisterPage />);
      fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: "New" } });
      fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: "User" } });
      fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: "newuser@learnova.ai" } });
      fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: "StrongPass123!" } });
      fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: "StrongPass123!" } });

      fireEvent.click(screen.getByRole("button", { name: /Create Free Account/i }));

      await waitFor(() => {
        expect(screen.getByText(/Account Created!/i)).toBeInTheDocument();
        expect(screen.getByText(/Go to Dashboard/i)).toBeInTheDocument();
      });
    });
  });

  describe("ForgotPasswordPage", () => {
    it("submits email and displays confirmation message without leaking user existence", async () => {
      vi.mocked(authService.forgotPassword).mockResolvedValueOnce({
        success: true,
        message: "Reset instructions sent.",
      });

      renderWithProviders(<ForgotPasswordPage />);
      const emailInput = screen.getByLabelText(/Registered Email Address/i);
      fireEvent.change(emailInput, { target: { value: "alice@learnova.ai" } });
      fireEvent.click(screen.getByRole("button", { name: /Send Reset Instructions/i }));

      await waitFor(() => {
        expect(screen.getByText(/Check Your Inbox/i)).toBeInTheDocument();
      });
    });
  });

  describe("ResetPasswordPage", () => {
    it("renders token and new password fields", () => {
      renderWithProviders(<ResetPasswordPage />);
      expect(screen.getByLabelText(/Security Reset Token/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^New Password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Confirm New Password/i)).toBeInTheDocument();
    });
  });

  describe("VerifyEmailPage", () => {
    it("allows manual token verification and resending link", async () => {
      vi.mocked(authService.resendVerification).mockResolvedValueOnce({
        success: true,
        message: "Verification email resent.",
      });

      renderWithProviders(<VerifyEmailPage />);
      expect(screen.getByLabelText(/Verification Token/i)).toBeInTheDocument();

      const resendInput = screen.getByPlaceholderText(/Enter your registered email/i);
      fireEvent.change(resendInput, { target: { value: "student@learnova.ai" } });
      fireEvent.click(screen.getByRole("button", { name: /Resend Verification Email/i }));

      await waitFor(() => {
        expect(screen.getByText(/Verification email resent/i)).toBeInTheDocument();
      });
    });
  });
});
