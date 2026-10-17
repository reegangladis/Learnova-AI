import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authService, ChangePasswordPayload } from "@/services/authService";
import {
  Shield,
  Key,
  Laptop,
  Smartphone,
  Trash2,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  Clock,
  Globe,
  Loader2,
} from "lucide-react";
import { SessionInfo } from "@/types/auth";

const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required."),
    new_password: z
      .string()
      .min(8, "Password must be at least 8 characters long.")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
      .regex(/\d/, "Password must contain at least one number.")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character."),
    confirm_new_password: z.string().min(1, "Please confirm your new password."),
  })
  .refine((data) => data.new_password === data.confirm_new_password, {
    message: "Passwords do not match.",
    path: ["confirm_new_password"],
  });

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export function SecuritySessionsPage() {
  const queryClient = useQueryClient();
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [sessionActionMessage, setSessionActionMessage] = useState<string | null>(null);

  // 1. Password Change Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_new_password: "",
    },
  });

  const onPasswordSubmit = async (data: ChangePasswordFormData) => {
    setPasswordSuccess(null);
    setPasswordError(null);
    try {
      const payload: ChangePasswordPayload = {
        current_password: data.current_password,
        new_password: data.new_password,
        confirm_new_password: data.confirm_new_password,
      };
      await authService.changePassword(payload);
      setPasswordSuccess("Your account password has been updated securely.");
      reset();
      setTimeout(() => setPasswordSuccess(null), 5000);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to change password. Verify your current password.";
      setPasswordError(msg);
    }
  };

  // 2. Query Active Sessions
  const {
    data: sessions = [],
    isLoading: isLoadingSessions,
  } = useQuery({
    queryKey: ["auth_sessions"],
    queryFn: async () => {
      const res = await authService.getSessions();
      // res may be an array directly or { sessions: [...] }
      if (Array.isArray(res)) return res as unknown as SessionInfo[];
      return (res.sessions || []) as SessionInfo[];
    },
  });

  // 3. Mutations for Session Revocation
  const revokeSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return authService.revokeSession(sessionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth_sessions"] });
      setSessionActionMessage("Session revoked successfully.");
      setTimeout(() => setSessionActionMessage(null), 3000);
    },
    onError: (err: Error) => {
      setPasswordError(err.message || "Failed to revoke session.");
    },
  });

  const logoutAllMutation = useMutation({
    mutationFn: async () => {
      return authService.logoutAll();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth_sessions"] });
      setSessionActionMessage("All sessions have been revoked.");
      setTimeout(() => setSessionActionMessage(null), 3000);
    },
    onError: (err: Error) => {
      setPasswordError(err.message || "Failed to revoke all sessions.");
    },
  });

  const getDeviceIcon = (userAgent: string | null) => {
    if (!userAgent) return <Globe className="w-5 h-5 text-slate-400" />;
    const ua = userAgent.toLowerCase();
    if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
      return <Smartphone className="w-5 h-5 text-indigo-400" />;
    }
    return <Laptop className="w-5 h-5 text-indigo-400" />;
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Security & Sessions
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Manage your credentials, password security, and active login sessions
            </p>
          </div>
        </div>
      </div>

      {sessionActionMessage && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-center gap-3 animate-in fade-in"
        >
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          <p className="font-medium">{sessionActionMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Section 1: Change Password */}
        <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-400" />
                <span>Change Password</span>
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Ensure your account is using a long, random password
              </p>
            </div>
          </div>

          {passwordSuccess && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <p>{passwordSuccess}</p>
            </div>
          )}

          {passwordError && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <p>{passwordError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onPasswordSubmit)} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="current_password"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Current Password
              </label>
              <div className="relative">
                <input
                  id="current_password"
                  type={showPasswords ? "text" : "password"}
                  placeholder="••••••••••••"
                  {...register("current_password")}
                  className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm pr-10"
                />
                <button
                  type="button"
                  aria-label={showPasswords ? "Hide password field" : "Show password field"}
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                >
                  {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.current_password && (
                <p className="text-rose-400 text-xs mt-1">{errors.current_password.message}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="new_password"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                New Password
              </label>
              <input
                id="new_password"
                type={showPasswords ? "text" : "password"}
                placeholder="••••••••••••"
                {...register("new_password")}
                className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              {errors.new_password && (
                <p className="text-rose-400 text-xs mt-1">{errors.new_password.message}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="confirm_new_password"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Confirm New Password
              </label>
              <input
                id="confirm_new_password"
                type={showPasswords ? "text" : "password"}
                placeholder="••••••••••••"
                {...register("confirm_new_password")}
                className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              {errors.confirm_new_password && (
                <p className="text-rose-400 text-xs mt-1">{errors.confirm_new_password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Update Password</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Section 2: Active Sessions */}
        <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <Laptop className="w-5 h-5 text-indigo-400" />
                <span>Active Sessions</span>
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Devices currently authenticated to your account
              </p>
            </div>
            {sessions.length > 0 && (
              <button
                type="button"
                onClick={() => logoutAllMutation.mutate()}
                disabled={logoutAllMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Revoke All</span>
              </button>
            )}
          </div>

          {isLoadingSessions ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
              <p className="text-slate-400 text-xs">Loading active sessions...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No active sessions found.
            </div>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-700 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-slate-800 border border-slate-700 mt-0.5">
                      {getDeviceIcon(session.user_agent)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white font-mono">
                          {session.ip_address || "Unknown IP"}
                        </span>
                        {session.is_active && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold uppercase">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate max-w-[220px] sm:max-w-xs mt-0.5">
                        {session.user_agent || "Browser Client"}
                      </p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Expires {new Date(session.expires_at).toLocaleDateString()}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => revokeSessionMutation.mutate(session.id)}
                    disabled={revokeSessionMutation.isPending}
                    title="Revoke session"
                    className="p-2 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="p-3.5 bg-slate-800/30 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Sessions rotate tokens automatically on each refresh request. If you suspect unusual activity, revoke all sessions immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
