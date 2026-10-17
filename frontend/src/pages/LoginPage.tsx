import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LogIn, Eye, EyeOff, AlertCircle, Sparkles } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
  remember_me: z.boolean().default(false),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const fromLocation = (location.state as { from?: { pathname: string } })?.from?.pathname || "/dashboard";

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember_me: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    try {
      await login(data);
      navigate(fromLocation, { replace: true });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Invalid email or password. Please try again.";
      setServerError(msg);
    }
  };

  const autofillDevAccount = (email: string, pass: string) => {
    setValue("email", email, { shouldValidate: true });
    setValue("password", pass, { shouldValidate: true });
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl shadow-2xl">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-3">
          <LogIn className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Welcome back
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Sign in to continue your personalized learning journey
        </p>
      </div>

      {serverError && (
        <div
          role="alert"
          className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-3 animate-in fade-in"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
          <div>
            <p className="font-semibold">Authentication Failed</p>
            <p className="text-rose-300/90 mt-0.5">{serverError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
          >
            Email Address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@learnova.ai"
            {...register("email")}
            className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
          />
          {errors.email && (
            <p className="text-rose-400 text-xs mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
            >
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••••••"
              {...register("password")}
              className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm pr-11"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password field" : "Show password field"}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-rose-400 text-xs mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              {...register("remember_me")}
              className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
            />
            <span className="text-xs text-slate-300">Remember this device</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-medium text-sm rounded-xl shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <LogIn className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Development Quick Accounts */}
      <div className="mt-8 pt-6 border-t border-slate-800/80">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Demo Personas (Development)</span>
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => autofillDevAccount("admin@learnova.ai", "Admin123!")}
            className="text-left p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-xs text-slate-300 transition-colors"
          >
            <span className="font-semibold block text-indigo-400">Admin</span>
            <span className="text-[10px] text-slate-400">admin@learnova.ai</span>
          </button>
          <button
            type="button"
            onClick={() => autofillDevAccount("student@learnova.ai", "Student123!")}
            className="text-left p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-xs text-slate-300 transition-colors"
          >
            <span className="font-semibold block text-emerald-400">Student</span>
            <span className="text-[10px] text-slate-400">student@learnova.ai</span>
          </button>
          <button
            type="button"
            onClick={() => autofillDevAccount("instructor@learnova.ai", "Instructor123!")}
            className="text-left p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-xs text-slate-300 transition-colors"
          >
            <span className="font-semibold block text-purple-400">Instructor</span>
            <span className="text-[10px] text-slate-400">instructor@learnova.ai</span>
          </button>
          <button
            type="button"
            onClick={() => autofillDevAccount("superadmin@learnova.ai", "SuperAdmin123!")}
            className="text-left p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-xs text-slate-300 transition-colors"
          >
            <span className="font-semibold block text-amber-400">Super Admin</span>
            <span className="text-[10px] text-slate-400">superadmin@learnova.ai</span>
          </button>
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-slate-400">
        Don&apos;t have an account?{" "}
        <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-4">
          Create account
        </Link>
      </div>
    </div>
  );
}
