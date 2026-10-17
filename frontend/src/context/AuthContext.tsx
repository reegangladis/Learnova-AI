import React, { useEffect, useState, useCallback } from "react";
import { User, SystemRole, SystemPermission } from "@/types/auth";
import { authService, LoginPayload, RegisterPayload } from "@/services/authService";
import { apiClient } from "@/services/apiClient";
import { AuthContext } from "./authContextDef";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authService.getMe();
      setUser(currentUser);
      setError(null);
    } catch {
      setUser(null);
    }
  }, []);

  // Initial session restoration from secure HttpOnly cookie on page load
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const currentUser = await authService.getMe();
        if (isMounted) {
          setUser(currentUser);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    apiClient.setOnUnauthorized(() => {
      if (isMounted) {
        setUser(null);
      }
    });

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (payload: LoginPayload) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.login(payload);
      if (response.user) {
        setUser(response.user);
      } else {
        await refreshUser();
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to log in. Please check your credentials.";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterPayload) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.register(payload);
      if (response.user) {
        setUser(response.user);
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Registration failed. Please try again.";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
    } catch {
      // Continue client cleanup even if network request fails
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  const hasRole = useCallback(
    (...roles: (SystemRole | string)[]): boolean => {
      if (!user) return false;
      const userRoles = user.roles.map((r) => r.toUpperCase());
      if (userRoles.includes("SUPER_ADMIN")) return true;
      const checkRoles = roles.map((r) => r.toUpperCase());
      return checkRoles.some((r) => userRoles.includes(r));
    },
    [user]
  );

  const hasPermission = useCallback(
    (...permissions: (SystemPermission | string)[]): boolean => {
      if (!user) return false;
      const userRoles = user.roles.map((r) => r.toUpperCase());
      if (userRoles.includes("SUPER_ADMIN")) return true;
      const userPerms = new Set(user.permissions.map((p) => p.toUpperCase()));
      return permissions.every((perm) => userPerms.has(perm.toUpperCase()));
    },
    [user]
  );

  const value = {
    user,
    isLoading,
    isAuthenticated: Boolean(user),
    error,
    login,
    register,
    logout,
    refreshUser,
    hasRole,
    hasPermission,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
