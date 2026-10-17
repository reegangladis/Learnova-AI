import { apiClient } from "./apiClient";
import {
  User,
  AuthResponse,
  SessionListResponse,
  PaginatedUsersResponse,
} from "@/types/auth";

export interface RegisterPayload {
  email: string;
  password: string;
  confirm_password: string;
  first_name: string;
  last_name: string;
  organization_slug?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  confirm_new_password: string;
}

export interface ProfileUpdatePayload {
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
}

export interface AdminUserUpdatePayload {
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
  is_verified?: boolean;
}

export const authService = {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>("/auth/register", payload);
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>("/auth/login", payload);
  },

  async logout(): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>("/auth/logout");
  },

  async logoutAll(): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>("/auth/logout-all");
  },

  async refreshToken(): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>("/auth/refresh");
  },

  async getMe(): Promise<User> {
    return apiClient.get<User>("/auth/me");
  },

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>("/auth/forgot-password", {
      email,
    });
  },

  async resetPassword(token: string, new_password: string, confirm_new_password: string): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>("/auth/reset-password", {
      token,
      new_password,
      confirm_new_password,
    });
  },

  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>("/auth/verify-email", {
      token,
    });
  },

  async resendVerification(email: string): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>("/auth/resend-verification", {
      email,
    });
  },

  async changePassword(payload: ChangePasswordPayload): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>("/auth/change-password", payload);
  },

  async getSessions(): Promise<SessionListResponse> {
    return apiClient.get<SessionListResponse>("/auth/sessions");
  },

  async revokeSession(sessionId: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(`/auth/sessions/${sessionId}`);
  },

  async updateProfile(payload: ProfileUpdatePayload): Promise<User> {
    return apiClient.patch<User>("/users/me", payload);
  },

  async listUsers(params?: {
    page?: number;
    page_size?: number;
    search?: string;
    is_active?: boolean;
  }): Promise<PaginatedUsersResponse> {
    return apiClient.get<PaginatedUsersResponse>("/users", { params });
  },

  async getUserById(id: string): Promise<User> {
    return apiClient.get<User>(`/users/${id}`);
  },

  async adminUpdateUser(id: string, payload: AdminUserUpdatePayload): Promise<User> {
    return apiClient.patch<User>(`/users/${id}`, payload);
  },

  async adminSetUserStatus(id: string, activate: boolean): Promise<User> {
    const action = activate ? "activate" : "deactivate";
    return apiClient.post<User>(`/users/${id}/${action}`);
  },

  async adminSetUserRoles(id: string, roleNames: string[]): Promise<User> {
    return apiClient.post<User>(`/users/${id}/roles`, { role_names: roleNames });
  },
};
