import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import { AppRoutes } from "@/routes/AppRoutes";
import { authService } from "@/services/authService";

vi.mock("@/services/authService", () => ({
  authService: {
    getMe: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getSessions: vi.fn().mockResolvedValue([]),
    listUsers: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, page_size: 10, total_pages: 1 }),
  },
}));

function renderWithRouter(initialRoute: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Learnova AI - Routing System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthenticated"));
  });

  it("renders Landing page on '/' route", async () => {
    renderWithRouter("/");
    expect(await screen.findByText(/Enter Learning Platform/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Learnova/i).length).toBeGreaterThan(0);
  });

  it("redirects unauthenticated user from protected '/dashboard' to '/login'", async () => {
    renderWithRouter("/dashboard");
    expect(await screen.findByText(/Welcome back/i, {}, { timeout: 4000 })).toBeInTheDocument();
  });

  it("renders Courses page on '/courses' route", async () => {
    renderWithRouter("/courses");
    expect(await screen.findByText(/Explore Courses/i)).toBeInTheDocument();
  });

  it("renders Status page on '/status' route", async () => {
    renderWithRouter("/status");
    expect(await screen.findByText(/Live System Health & Diagnostics/i)).toBeInTheDocument();
  });

  it("renders Login page on '/login' route", async () => {
    renderWithRouter("/login");
    expect(await screen.findByText(/Welcome back/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign In/i })).toBeInTheDocument();
  });

  it("renders Register page on '/register' route", async () => {
    renderWithRouter("/register");
    expect(await screen.findByText(/Create Account/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create Free Account/i })).toBeInTheDocument();
  });

  it("renders Forgot Password page on '/forgot-password' route", async () => {
    renderWithRouter("/forgot-password");
    expect(await screen.findByText(/Reset Password/i)).toBeInTheDocument();
  });

  it("renders Unauthorized page on '/unauthorized' route", async () => {
    renderWithRouter("/unauthorized");
    expect(await screen.findByText(/Access Restricted/i)).toBeInTheDocument();
  });

  it("renders Session Expired page on '/session-expired' route", async () => {
    renderWithRouter("/session-expired");
    expect(await screen.findByText(/Session Expired/i)).toBeInTheDocument();
  });

  it("renders 404 page for unknown routes", async () => {
    renderWithRouter("/unknown-path-12345");
    expect(await screen.findByText(/404 - Page Not Found/i)).toBeInTheDocument();
  });
});
