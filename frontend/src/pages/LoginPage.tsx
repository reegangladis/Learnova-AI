import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Layers,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
  remember_me: z.boolean().default(false),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface DemoPersona {
  roleLabel: string;
  email: string;
  password: string;
  badgeClass: string;
  summary: string;
  capabilities: string[];
}

const DEMO_PERSONAS: DemoPersona[] = [
  {
    roleLabel: "Admin",
    email: "admin@learnova.ai",
    password: "Admin123!",
    badgeClass: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30",
    summary: "Full institutional governance, Track360 operations, and analytics.",
    capabilities: ["Executive Analytics", "Track360 Operations Suite", "User & Course Governance"],
  },
  {
    roleLabel: "Student",
    email: "student@learnova.ai",
    password: "Student123!",
    badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    summary: "Distraction-free learner cockpit with Study Copilot and Exam Arena.",
    capabilities: ["4 Seeded Full Curricula", "Citation-Grounded RAG Copilot", "Personal Grades & Calendar"],
  },
  {
    roleLabel: "Instructor",
    email: "instructor@learnova.ai",
    password: "Instructor123!",
    badgeClass: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30",
    summary: "Curriculum authoring studio, quiz bank builder, and cohort tracking.",
    capabilities: ["Authoring Studio", "Cohort Analytics", "Track360 Operations Suite"],
  },
  {
    roleLabel: "Super Admin",
    email: "superadmin@learnova.ai",
    password: "SuperAdmin123!",
    badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
    summary: "System-wide observability, RBAC role matrix, and tenant telemetry.",
    capabilities: ["Platform System Health", "Security & Audit Logs", "Full Role Permissions"],
  },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedPersonaEmail, setSelectedPersonaEmail] = useState<string>("student@learnova.ai");

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

  const autofillDevAccount = (persona: DemoPersona) => {
    setSelectedPersonaEmail(persona.email);
    setValue("email", persona.email, { shouldValidate: true });
    setValue("password", persona.password, { shouldValidate: true });
  };

  const activePersona =
    DEMO_PERSONAS.find((p) => p.email === selectedPersonaEmail) || DEMO_PERSONAS[1];

  return (
    <div className="min-h-screen w-full bg-background text-foreground studio-grid-bg flex flex-col justify-between relative overflow-x-clip">
      <div className="fixed top-[-12%] left-[-5%] w-[480px] h-[480px] bg-teal-500/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="fixed bottom-[-12%] right-[-5%] w-[480px] h-[480px] bg-orange-500/10 rounded-full blur-[130px] pointer-events-none" />

      {/* Top Navigation */}
      <header className="w-full max-w-6xl mx-auto px-5 sm:px-8 py-5 flex items-center justify-between relative z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-card border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors shadow-xs group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-teal-600" />
          <span>Back to Home</span>
        </Link>

        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-[0_2px_0_0_#0f766e]">
            <GraduationCap className="w-4 h-4" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-foreground">
            Learnova
          </span>
        </Link>

        <div className="text-xs text-muted-foreground hidden sm:flex items-center gap-1.5">
          <span>New learner?</span>
          <Link to="/register" className="text-teal-700 dark:text-teal-400 font-bold hover:underline">
            Register
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-6xl mx-auto px-5 sm:px-8 py-4 lg:py-8 flex-1 flex items-center relative z-10">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* LEFT COLUMN: Editorial Showcase & Interactive Role Capabilities Preview */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/25 text-teal-700 dark:text-teal-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Learnova Atelier Access</span>
            </div>

            <div className="space-y-3">
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-tight">
                Step inside your{" "}
                <span className="text-teal-700 dark:text-teal-400">personalized study studio</span>.
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-xl">
                Access synchronized slide decks, video workshops, adaptive recommendations, and
                citation-grounded RAG tutoring tailored to your role.
              </p>
            </div>

            {/* Interactive Role Access Previewer */}
            <div className="studio-card p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                  Selected Workspace Preview
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${activePersona.badgeClass}`}
                >
                  {activePersona.roleLabel} View
                </span>
              </div>
              <p className="text-sm text-foreground font-medium">{activePersona.summary}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                {activePersona.capabilities.map((cap) => (
                  <div
                    key={cap}
                    className="px-3 py-2 rounded-xl bg-secondary/70 border border-border text-[11px] font-semibold text-foreground flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span className="truncate">{cap}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Studio Feature Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-card border border-border flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Slide & Video Decks</h4>
                  <p className="text-[11px] text-muted-foreground">Zen classroom mode</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-card border border-border flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Exam Simulator</h4>
                  <p className="text-[11px] text-muted-foreground">Instant graded mastery</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-card border border-border flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Scoped RBAC</h4>
                  <p className="text-[11px] text-muted-foreground">Role-isolated tools</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Tactile Login Card */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto">
            <div className="studio-card p-6 sm:p-8 shadow-xl relative">
              <div className="mb-5">
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                  Log in to continue
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Welcome back! Please enter your account credentials.
                </p>
              </div>

              {serverError && (
                <div
                  role="alert"
                  className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 animate-fade-in"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                  <div>
                    <p className="font-bold">Authentication Failed</p>
                    <p className="mt-0.5">{serverError}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-bold uppercase tracking-wider text-foreground/80 mb-1.5"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="student@learnova.ai"
                      {...register("email")}
                      className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-600 transition-all text-sm"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-rose-600 dark:text-rose-400 text-xs mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-xs font-bold uppercase tracking-wider text-foreground/80 mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••••••"
                      {...register("password")}
                      className="w-full pl-10 pr-11 py-2.5 bg-background border border-input rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-600 transition-all text-sm"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password field" : "Show password field"}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-rose-600 dark:text-rose-400 text-xs mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div className="pt-0.5 text-right">
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-muted-foreground hover:text-teal-700 dark:hover:text-teal-400 hover:underline transition-colors"
                  >
                    Forgotten your username or password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  aria-label="Sign In"
                  className="w-full py-3 px-6 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl shadow-[0_3px_0_0_#115e59] hover:shadow-[0_1px_0_0_#115e59] hover:translate-y-0.5 active:translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <span>Sign In</span>
                  )}
                </button>
              </form>

              {/* Quick Demo Personas */}
              <div className="mt-6 pt-5 border-t border-border">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                  <span>Demo Personas (Click to Autofill)</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {DEMO_PERSONAS.map((persona) => {
                    const isPicked = selectedPersonaEmail === persona.email;
                    return (
                      <button
                        key={persona.email}
                        type="button"
                        onClick={() => autofillDevAccount(persona)}
                        className={`text-left p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                          isPicked
                            ? "bg-teal-500/10 border-teal-600/50 text-foreground"
                            : "bg-secondary/50 hover:bg-secondary border-border text-foreground/90"
                        }`}
                      >
                        <span className="font-bold block text-foreground">
                          {persona.roleLabel}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground block truncate">
                          {persona.email}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 text-center sm:hidden text-xs text-muted-foreground">
                <span>Don&apos;t have an account? </span>
                <Link to="/register" className="text-teal-700 font-bold">
                  Register
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full max-w-6xl mx-auto px-5 sm:px-8 py-5 border-t border-border/70 flex flex-col sm:flex-row items-center justify-between text-[11px] text-muted-foreground gap-3 relative z-10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Learnova Systems Operational · Static + API Hybrid Mode</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/status" className="hover:text-foreground transition-colors">
            System Status
          </Link>
          <span>·</span>
          <span>Learnova AI Studio LMS</span>
        </div>
      </footer>
    </div>
  );
}
