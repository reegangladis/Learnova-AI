import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  UserPlus,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MailCheck,
} from "lucide-react";

const registerSchema = z
  .object({
    first_name: z.string().min(1, "First name is required.").max(100),
    last_name: z.string().min(1, "Last name is required.").max(100),
    email: z.string().email("Please enter a valid email address."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long.")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
      .regex(/\d/, "Password must contain at least one number.")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character."),
    confirm_password: z.string().min(1, "Please confirm your password."),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match.",
    path: ["confirm_password"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      confirm_password: "",
    },
    mode: "onChange",
  });

  const { onChange: onPasswordFormChange, ...passwordRegisterProps } = register("password");

  // Password requirement flags
  const requirements = [
    { label: "8+ characters", met: passwordValue.length >= 8 },
    { label: "Uppercase letter", met: /[A-Z]/.test(passwordValue) },
    { label: "Lowercase letter", met: /[a-z]/.test(passwordValue) },
    { label: "Number (0-9)", met: /\d/.test(passwordValue) },
    { label: "Special symbol (@$!%*?&)", met: /[^A-Za-z0-9]/.test(passwordValue) },
  ];

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);
    try {
      await registerUser(data);
      setRegistrationSuccess(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Registration failed. Please try again.";
      setServerError(msg);
    }
  };

  if (registrationSuccess) {
    return (
      <div className="w-full max-w-md mx-auto p-6 sm:p-8 bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl shadow-2xl text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-4">
          <MailCheck className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Account Created!</h1>
        <p className="text-slate-400 text-sm mt-2 leading-relaxed">
          Your account has been registered successfully. A verification link has been generated for your email address.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl transition-colors shadow-lg shadow-indigo-600/25"
          >
            Go to Dashboard
          </button>
          <Link
            to="/verify-email"
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl transition-colors border border-slate-700"
          >
            Verify Email Token
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl shadow-2xl">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-3">
          <UserPlus className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Create Account
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Join Learnova AI and master knowledge faster
        </p>
      </div>

      {serverError && (
        <div
          role="alert"
          className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-3 animate-in fade-in"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
          <div>
            <p className="font-semibold">Registration Failed</p>
            <p className="text-rose-300/90 mt-0.5">{serverError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="first_name"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
            >
              First Name
            </label>
            <input
              id="first_name"
              type="text"
              placeholder="Alice"
              {...register("first_name")}
              className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            />
            {errors.first_name && (
              <p className="text-rose-400 text-xs mt-1">{errors.first_name.message}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="last_name"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
            >
              Last Name
            </label>
            <input
              id="last_name"
              type="text"
              placeholder="Student"
              {...register("last_name")}
              className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            />
            {errors.last_name && (
              <p className="text-rose-400 text-xs mt-1">{errors.last_name.message}</p>
            )}
          </div>
        </div>

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
            placeholder="alice@learnova.ai"
            {...register("email")}
            className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          />
          {errors.email && (
            <p className="text-rose-400 text-xs mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••••••"
              {...passwordRegisterProps}
              onChange={(e) => {
                setPasswordValue(e.target.value);
                onPasswordFormChange(e);
              }}
              className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm pr-10"
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
          {errors.password && (
            <p className="text-rose-400 text-xs mt-1">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="confirm_password"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
          >
            Confirm Password
          </label>
          <input
            id="confirm_password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="••••••••••••"
            {...register("confirm_password")}
            className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          />
          {errors.confirm_password && (
            <p className="text-rose-400 text-xs mt-1">{errors.confirm_password.message}</p>
          )}
        </div>

        {/* Dynamic Password Checklist */}
        <div className="p-3 bg-slate-800/40 border border-slate-800 rounded-xl">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Password Requirements
          </p>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {requirements.map((req, i) => (
              <div
                key={i}
                className={`flex items-center gap-1.5 ${
                  req.met ? "text-emerald-400" : "text-slate-400"
                }`}
              >
                {req.met ? (
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" />
                )}
                <span className="text-[11px]">{req.label}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-medium text-sm rounded-xl shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Creating account...</span>
            </>
          ) : (
            <>
              <span>Create Free Account</span>
              <UserPlus className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-xs text-slate-400">
        Already registered?{" "}
        <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-4">
          Sign In
        </Link>
      </div>
    </div>
  );
}
