import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import { ProfilePage } from "@/pages/ProfilePage";
import { SecuritySessionsPage } from "@/pages/SecuritySessionsPage";
import { AdminUsersPage } from "@/pages/AdminUsersPage";
import { authService } from "@/services/authService";
import { User } from "@/types/auth";

const mockAdminUser: User = {
  id: "admin-1",
  email: "admin@learnova.ai",
  first_name: "Admin",
  last_name: "User",
  full_name: "Admin User",
  avatar_url: null,
  is_active: true,
  is_verified: true,
  roles: ["ADMIN"],
  permissions: ["USER_READ", "USER_CREATE", "USER_UPDATE", "USER_DELETE"],
  organization_id: "org-1",
  created_at: new Date().toISOString(),
  last_login_at: new Date().toISOString(),
};

vi.mock("@/services/authService", () => ({
  authService: {
    getMe: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn().mockResolvedValue({ success: true, message: "All sessions revoked" }),
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
    getSessions: vi.fn(),
    revokeSession: vi.fn().mockResolvedValue({ success: true, message: "Session revoked" }),
    listUsers: vi.fn(),
    adminSetUserStatus: vi.fn(),
    adminSetUserRoles: vi.fn(),
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

describe("Profile, Security & Admin User Pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authService.getMe).mockResolvedValue(mockAdminUser);
  });

  describe("ProfilePage", () => {
    it("renders user information and allows editing first and last name", async () => {
      vi.mocked(authService.updateProfile).mockResolvedValueOnce({
        ...mockAdminUser,
        first_name: "SuperAdmin",
        full_name: "SuperAdmin User",
      });

      renderWithProviders(<ProfilePage />);

      expect(await screen.findByDisplayValue("Admin")).toBeInTheDocument();
      expect(screen.getByDisplayValue("User")).toBeInTheDocument();

      const firstNameInput = screen.getByLabelText(/First Name/i);
      fireEvent.change(firstNameInput, { target: { value: "SuperAdmin" } });

      const saveBtn = screen.getByRole("button", { name: /Save Profile/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(authService.updateProfile).toHaveBeenCalledWith({
          first_name: "SuperAdmin",
          last_name: "User",
          avatar_url: undefined,
        });
        expect(screen.getByText(/Profile updated successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe("SecuritySessionsPage", () => {
    it("renders active sessions and allows revoking a session", async () => {
      vi.mocked(authService.getSessions).mockResolvedValueOnce([
        {
          id: "session-1",
          user_id: "admin-1",
          ip_address: "192.168.1.100",
          user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          is_active: true,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          last_active_at: new Date().toISOString(),
        },
      ]);

      renderWithProviders(<SecuritySessionsPage />);

      expect(await screen.findByText("192.168.1.100")).toBeInTheDocument();
      expect(screen.getByText(/^Active$/i)).toBeInTheDocument();

      const revokeBtn = screen.getByTitle(/Revoke session/i);
      fireEvent.click(revokeBtn);

      await waitFor(() => {
        expect(authService.revokeSession).toHaveBeenCalledWith("session-1");
      });
    });
  });

  describe("AdminUsersPage", () => {
    it("lists users and allows toggling active/suspended status", async () => {
      vi.mocked(authService.listUsers).mockResolvedValueOnce({
        items: [mockAdminUser],
        total: 1,
        page: 1,
        page_size: 10,
        total_pages: 1,
      });
      vi.mocked(authService.adminSetUserStatus).mockResolvedValueOnce({
        ...mockAdminUser,
        is_active: false,
      });

      renderWithProviders(<AdminUsersPage />);

      expect(await screen.findByText("admin@learnova.ai")).toBeInTheDocument();
      expect(screen.getByText("ADMIN")).toBeInTheDocument();

      const suspendBtn = screen.getByRole("button", { name: /^Suspend$/i });
      fireEvent.click(suspendBtn);

      await waitFor(() => {
        expect(authService.adminSetUserStatus).toHaveBeenCalledWith("admin-1", false);
      });
    });
  });
});
