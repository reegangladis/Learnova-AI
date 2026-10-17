import { createContext } from "react";
import { User, SystemRole, SystemPermission } from "@/types/auth";
import { LoginPayload, RegisterPayload } from "@/services/authService";

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (...roles: (SystemRole | string)[]) => boolean;
  hasPermission: (...permissions: (SystemPermission | string)[]) => boolean;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
