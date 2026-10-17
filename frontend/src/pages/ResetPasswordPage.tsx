import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { authService } from "@/services/authService";
import { ShieldCheck, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";

const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required."),
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

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenFromUrl = searchParams.get("token") || "";

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: tokenFromUrl,
      new_password: "",
      confirm_new_password: "",
    },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    setServerError(null);
    try {
      await authService.resetPassword(
        data.token,
        data.new_password,
        data.confirm_new_password
      );
      setIsSuccess(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Invalid or expired reset token. Please request a new link.";
      setServerError(msg);
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full max-w-md mx-auto p-6 sm:p-8 bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl shadow-2xl text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Password Reset Complete</h1>
        <p className="text-slate-400 text-sm mt-2 leading-relaxed">
          Your account password has been updated securely. All previous active sessions have been invalidated.
        </p>
        <div className="mt-6">
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl transition-colors shadow-lg shadow-indigo-600/25"
          >
            Sign In with New Password
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl shadow-2xl">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-3">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Create New Password
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Enter your secure token and choose a new password
        </p>
      </div>

      {serverError && (
        <div
          role="alert"
          className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-3 animate-in fade-in"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
          <p className="text-rose-300/90">{serverError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label
            htmlFor="token"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
          >
            Security Reset Token
          </label>
          <input
            id="token"
            type="text"
            placeholder="Paste your reset token here"
            {...register("token")}
            className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-mono text-xs"
          />
          {errors.token && (
            <p className="text-rose-400 text-xs mt-1">{errors.token.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="new_password"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
          >
            New Password
          </label>
          <div className="relative">
            <input
              id="new_password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••"
              {...register("new_password")}
              className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm pr-10"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password field" : "Show password field"}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
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
            type={showPassword ? "text" : "password"}
            placeholder="••••••••••••"
            {...register("confirm_new_password")}
            className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          />
          {errors.confirm_new_password && (
            <p className="text-rose-400 text-xs mt-1">
              {errors.confirm_new_password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-medium text-sm rounded-xl shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Updating password...</span>
            </>
          ) : (
            <span>Set New Password</span>
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-xs text-slate-400">
        Remembered password?{" "}
        <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-4">
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
