import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff, AlertCircle, Sparkles, User, KeyRound, ArrowLeft, GraduationCap } from "lucide-react";

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
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white">
      {/* LEFT HALF: Dark Petrol Blue with Illustrated Card (Screenshot 1) */}
      <div className="lg:w-1/2 min-h-[340px] lg:min-h-screen bg-gradient-to-br from-[#092D3E] via-[#0B374D] to-[#072433] flex items-center justify-center p-6 sm:p-12 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <Link
          to="/"
          className="absolute top-6 left-6 text-white/80 hover:text-white flex items-center gap-2 text-xs font-medium z-10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        {/* Floating White Card with Logo & Sketch Illustration */}
        <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-2xl border border-white/20 text-center relative z-10 animate-in fade-in zoom-in-95 duration-300">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2.5 mb-6">
            <div className="w-9 h-9 rounded-full bg-[#0B374D] flex items-center justify-center text-amber-400 font-bold shadow-sm">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="font-extrabold text-xl tracking-tight text-slate-900 block leading-tight">
                Learnova
              </span>
              <span className="text-[10px] tracking-widest uppercase font-semibold text-slate-500 block">
                Online LMS
              </span>
            </div>
          </div>

          {/* Student Study Sketch SVG Illustration */}
          <div className="w-full h-56 flex items-center justify-center py-2 px-4">
            <svg
              className="w-full h-full max-h-52 text-slate-800"
              viewBox="0 0 320 280"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Desk Surface */}
              <path
                d="M30 220 L290 220"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M45 220 L25 265 M275 220 L295 265"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />

              {/* Laptop Screen & Base */}
              <rect
                x="110"
                y="130"
                width="100"
                height="65"
                rx="4"
                stroke="currentColor"
                strokeWidth="2.5"
                fill="#F8FAFC"
              />
              <line
                x1="125"
                y1="150"
                x2="195"
                y2="150"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <line
                x1="125"
                y1="162"
                x2="180"
                y2="162"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M95 195 L225 195 L215 205 L105 205 Z"
                stroke="currentColor"
                strokeWidth="2"
                fill="#E2E8F0"
              />

              {/* Student Figure (Head, Glasses, Shoulders, Arms Typing) */}
              <circle
                cx="160"
                cy="65"
                r="22"
                stroke="currentColor"
                strokeWidth="2.5"
                fill="#FFFFFF"
              />
              {/* Hair sketch */}
              <path
                d="M142 58 C144 45, 176 45, 178 58"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
              {/* Glasses */}
              <rect x="148" y="62" width="10" height="7" rx="2" stroke="currentColor" strokeWidth="1.8" />
              <rect x="162" y="62" width="10" height="7" rx="2" stroke="currentColor" strokeWidth="1.8" />
              <line x1="158" y1="65" x2="162" y2="65" stroke="currentColor" strokeWidth="1.8" />
              {/* Torso & Shoulders */}
              <path
                d="M130 115 C130 90, 190 90, 190 115 L190 150 L130 150 Z"
                stroke="currentColor"
                strokeWidth="2.5"
                fill="#F1F5F9"
              />
              {/* Arms to keyboard */}
              <path
                d="M132 118 Q115 155 125 185 L145 190"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <path
                d="M188 118 Q205 155 195 185 L175 190"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />

              {/* Notebooks & Papers on Desk */}
              <polygon
                points="50,195 90,185 105,215 65,225"
                stroke="currentColor"
                strokeWidth="2"
                fill="#FFFFFF"
              />
              <line x1="60" y1="195" x2="95" y2="190" stroke="currentColor" strokeWidth="1.2" />
              <line x1="65" y1="205" x2="100" y2="200" stroke="currentColor" strokeWidth="1.2" />

              {/* Coffee Cup */}
              <ellipse cx="250" cy="205" rx="10" ry="4" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M240 205 L242 220 Q250 225 258 220 L260 205"
                stroke="currentColor"
                strokeWidth="1.8"
                fill="#FFFFFF"
              />
              <path d="M260 210 Q267 212 260 218" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>

          <p className="text-xs text-slate-600 font-medium tracking-wide">
            Empowering your learning journey everywhere
          </p>
        </div>
      </div>

      {/* RIGHT HALF: Crisp White Login Form (Screenshot 1) */}
      <div className="lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 lg:p-16 relative">
        <div className="max-w-md w-full mx-auto my-auto py-6">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Log in to continue
            </h1>
            <p className="text-sm text-slate-500 mt-1.5">
              Welcome back! Please enter your account credentials.
            </p>
          </div>

          {/* Session timeout or server error alert banner */}
          {serverError ? (
            <div
              role="alert"
              className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <div>
                <p className="font-semibold">Authentication Failed</p>
                <p className="mt-0.5">{serverError}</p>
              </div>
            </div>
          ) : (
            <div className="mb-6 p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-800 text-xs flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span>Please log in to access your courses, progress, and assessments.</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Email / Username field */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="reegangladis@gmail.com"
                  {...register("email")}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B374D] focus:border-[#0B374D] transition-all text-sm"
                />
              </div>
              {errors.email && (
                <p className="text-rose-500 text-xs mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password field */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  {...register("password")}
                  className="w-full pl-10 pr-11 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B374D] focus:border-[#0B374D] transition-all text-sm"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password field" : "Show password field"}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-rose-500 text-xs mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Forgotten Password link (Screenshot 1) */}
            <div className="pt-1 text-center">
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-slate-600 hover:text-[#0B374D] hover:underline transition-colors"
              >
                Forgotten your username or password?
              </Link>
            </div>

            {/* Main Log in Button (Warm Mustard/Amber Yellow as in Screenshot 1) */}
            <button
              type="submit"
              disabled={isSubmitting}
              aria-label="Log in / Sign In"
              className="w-full py-3.5 px-6 bg-[#E59819] hover:bg-[#D48810] active:scale-[0.99] text-slate-950 font-bold text-sm rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-900/40 border-t-slate-900 rounded-full animate-spin" />
                  <span>Logging in...</span>
                </>
              ) : (
                <>
                  <span>Log in</span>
                  <span className="sr-only">Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* DEMO PERSONAS FOR LOGIN (PRESERVED AS INSTRUCTED) */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Demo Personas (Development)</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => autofillDevAccount("admin@learnova.ai", "Admin123!")}
                className="text-left p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs text-slate-700 transition-colors"
              >
                <span className="font-bold block text-[#0B374D]">Admin</span>
                <span className="text-[10px] text-slate-500">admin@learnova.ai</span>
              </button>
              <button
                type="button"
                onClick={() => autofillDevAccount("student@learnova.ai", "Student123!")}
                className="text-left p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs text-slate-700 transition-colors"
              >
                <span className="font-bold block text-emerald-700">Student</span>
                <span className="text-[10px] text-slate-500">student@learnova.ai</span>
              </button>
              <button
                type="button"
                onClick={() => autofillDevAccount("instructor@learnova.ai", "Instructor123!")}
                className="text-left p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs text-slate-700 transition-colors"
              >
                <span className="font-bold block text-purple-700">Instructor</span>
                <span className="text-[10px] text-slate-500">instructor@learnova.ai</span>
              </button>
              <button
                type="button"
                onClick={() => autofillDevAccount("superadmin@learnova.ai", "SuperAdmin123!")}
                className="text-left p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs text-slate-700 transition-colors"
              >
                <span className="font-bold block text-amber-700">Super Admin</span>
                <span className="text-[10px] text-slate-500">superadmin@learnova.ai</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer (Screenshot 1) */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-3">
          <span>LEARNOVA · LMS · SECURE SIGN IN</span>
          <button
            type="button"
            className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Cookies notice
          </button>
        </div>
      </div>
    </div>
  );
}
