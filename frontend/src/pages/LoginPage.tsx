import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Eye,
  EyeOff,
  AlertCircle,
  Sparkles,
  User,
  KeyRound,
  ArrowLeft,
  GraduationCap,
  Layers,
  CheckCircle2,
  BookOpen,
  ShieldCheck,
} from "lucide-react";

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

  const fromLocation =
    (location.state as { from?: { pathname: string } })?.from?.pathname || "/dashboard";

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
    <div className="min-h-screen w-full bg-[#0B0F19] text-slate-100 flex flex-col justify-between relative overflow-hidden">
      {/* Dynamic ambient background glow */}
      <div className="absolute top-[-10%] left-[-5%] w-[550px] h-[550px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-violet-600/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-cyan-500/5 rounded-full blur-[180px] pointer-events-none" />

      {/* Top Navigation Bar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between relative z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-slate-900/70 border border-slate-800/80 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition-all backdrop-blur-md group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-indigo-400" />
          <span>Back to Home</span>
        </Link>

        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <GraduationCap className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Learnova
          </span>
        </Link>

        <div className="text-xs text-slate-400 hidden sm:flex items-center gap-2">
          <span>Need an account?</span>
          <Link
            to="/register"
            className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
          >
            Register
          </Link>
        </div>
      </header>

      {/* Main Content Area: Split 2-Column Responsive Layout */}
      <main className="w-full max-w-7xl mx-auto px-6 py-4 lg:py-8 flex-1 flex items-center relative z-10">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* LEFT COLUMN: Modern Showcase & Platform Value */}
          <div className="lg:col-span-6 space-y-6 lg:pr-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Next-Gen Intelligent LMS</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                Empowering Your{" "}
                <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
                  Learning Journey
                </span>
              </h1>
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-xl">
                Log in to access comprehensive multi-module courses with interactive presentation slide decks,
                embedded video lectures, self-assessment checkpoints, and real-time quizzes.
              </p>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Interactive PPT Decks</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Slide-by-slide learning modules</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Quizzes & Self-Assessments</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Instant feedback & progress tracking</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Structured Curricula</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Cloud, AI, DevOps & Security</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Role-Based Security</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Focused student & instructor workspaces</p>
                </div>
              </div>
            </div>

            {/* Learner Trust Badge */}
            <div className="flex items-center gap-3 pt-2">
              <div className="flex -space-x-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-500 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-white">
                  AL
                </div>
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-white">
                  RO
                </div>
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-white">
                  ME
                </div>
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-white">
                  +
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Join <span className="text-slate-200 font-semibold">45,000+</span> active learners advancing their skills.
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN: Modern Glassmorphic Login Card */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto">
            <div className="p-7 sm:p-9 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-2xl shadow-indigo-950/40 relative">
              
              {/* Card Header */}
              <div className="mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Log in to continue
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Welcome back! Please enter your account credentials.
                </p>
              </div>

              {/* Server Error Alert Banner or Informative Status */}
              {serverError ? (
                <div
                  role="alert"
                  className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <div>
                    <p className="font-semibold text-rose-200">Authentication Failed</p>
                    <p className="mt-0.5">{serverError}</p>
                  </div>
                </div>
              ) : (
                <div className="mb-5 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0 animate-pulse" />
                  <span>Please log in to access your courses, progress, and assessments.</span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                {/* Email Address */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="reegangladis@gmail.com"
                      {...register("email")}
                      className="w-full pl-10 pr-4 py-3 bg-slate-950/70 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-rose-400 text-xs mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••••••"
                      {...register("password")}
                      className="w-full pl-10 pr-11 py-3 bg-slate-950/70 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm"
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

                {/* Forgotten Password link */}
                <div className="pt-0.5 text-right">
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-slate-400 hover:text-indigo-400 hover:underline transition-colors"
                  >
                    Forgotten your username or password?
                  </Link>
                </div>

                {/* Primary Sign In Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  aria-label="Sign In"
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Learnova</span>
                      <span className="sr-only">Sign In</span>
                    </>
                  )}
                </button>
              </form>

              {/* DEMO PERSONAS FOR QUICK LOGIN (PRESERVED AS INSTRUCTED) */}
              <div className="mt-7 pt-5 border-t border-slate-800">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Demo Personas (Development)</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => autofillDevAccount("admin@learnova.ai", "Admin123!")}
                    className="text-left p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/40 text-xs text-slate-300 transition-all group"
                  >
                    <span className="font-bold block text-indigo-400 group-hover:text-indigo-300">
                      Admin
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate">
                      admin@learnova.ai
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => autofillDevAccount("student@learnova.ai", "Student123!")}
                    className="text-left p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/40 text-xs text-slate-300 transition-all group"
                  >
                    <span className="font-bold block text-emerald-400 group-hover:text-emerald-300">
                      Student
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate">
                      student@learnova.ai
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => autofillDevAccount("instructor@learnova.ai", "Instructor123!")}
                    className="text-left p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-violet-500/40 text-xs text-slate-300 transition-all group"
                  >
                    <span className="font-bold block text-violet-400 group-hover:text-violet-300">
                      Instructor
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate">
                      instructor@learnova.ai
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => autofillDevAccount("superadmin@learnova.ai", "SuperAdmin123!")}
                    className="text-left p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/40 text-xs text-slate-300 transition-all group"
                  >
                    <span className="font-bold block text-amber-400 group-hover:text-amber-300">
                      Super Admin
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate">
                      superadmin@learnova.ai
                    </span>
                  </button>
                </div>
              </div>

              {/* Mobile Register Link */}
              <div className="mt-5 text-center sm:hidden text-xs text-slate-400">
                <span>Don't have an account? </span>
                <Link to="/register" className="text-indigo-400 font-semibold">
                  Register
                </Link>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Modern Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-3 relative z-10">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Learnova Systems Operational · TLS 1.3 Encrypted</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/status" className="hover:text-slate-300 transition-colors">
            System Status
          </Link>
          <span>·</span>
          <span>Learnova LMS Platform</span>
        </div>
      </footer>
    </div>
  );
}
