import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/services/authService";
import {
  User as UserIcon,
  Mail,
  Shield,
  Key,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  Sparkles,
  Save,
  Lock,
} from "lucide-react";
import { Link } from "react-router-dom";

const profileSchema = z.object({
  first_name: z.string().min(1, "First name is required.").max(100),
  last_name: z.string().min(1, "Last name is required.").max(100),
  avatar_url: z.string().url("Must be a valid image URL").or(z.literal("")).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: user
      ? {
          first_name: user.first_name || "",
          last_name: user.last_name || "",
          avatar_url: user.avatar_url || "",
        }
      : undefined,
    defaultValues: {
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      avatar_url: user?.avatar_url || "",
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        avatar_url: user.avatar_url || "",
      });
    }
  }, [user, reset]);

  const onSubmit = async (data: ProfileFormData) => {
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await authService.updateProfile({
        first_name: data.first_name,
        last_name: data.last_name,
        avatar_url: data.avatar_url || undefined,
      });
      await refreshUser();
      setSuccessMessage("Profile updated successfully!");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to update profile. Please try again.";
      setErrorMessage(msg);
    }
  };

  const getInitials = () => {
    if (!user) return "U";
    return `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase();
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900/80 border border-slate-800 p-6 sm:p-8 backdrop-blur-xl shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="relative">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-500/50 shadow-md"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-bold text-2xl flex items-center justify-center border-2 border-indigo-400/30 shadow-lg shadow-indigo-600/20">
                {getInitials()}
              </div>
            )}
            {user?.is_verified && (
              <div
                title="Verified Account"
                className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-slate-900 shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            )}
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {user?.full_name || "Account Profile"}
              </h1>
              {user?.roles?.map((role) => (
                <span
                  key={role}
                  className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold uppercase tracking-wider"
                >
                  {role}
                </span>
              ))}
            </div>
            <p className="text-slate-400 text-sm flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>{user?.email}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/security"
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center gap-2"
            >
              <Key className="w-3.5 h-3.5 text-indigo-400" />
              <span>Security & Sessions</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-center gap-3 animate-in fade-in"
        >
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          <p className="font-medium">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-3 animate-in fade-in"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <p className="font-medium">{errorMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Edit Profile Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-indigo-400" />
                  <span>Personal Information</span>
                </h2>
                <p className="text-slate-400 text-xs mt-0.5">
                  Update your display name and public avatar
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    {...register("first_name")}
                    className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
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
                    {...register("last_name")}
                    className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                  {errors.last_name && (
                    <p className="text-rose-400 text-xs mt-1">{errors.last_name.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="avatar_url"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Avatar Image URL
                </label>
                <input
                  id="avatar_url"
                  type="url"
                  placeholder="https://example.com/avatar.png"
                  {...register("avatar_url")}
                  className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
                {errors.avatar_url && (
                  <p className="text-rose-400 text-xs mt-1">{errors.avatar_url.message}</p>
                )}
              </div>

              {/* Readonly immutable identity fields */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Email Address (Primary Identity)</span>
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ""}
                  className="w-full px-4 py-2.5 bg-slate-800/30 border border-slate-800 rounded-xl text-slate-400 text-sm cursor-not-allowed font-mono text-xs"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Email modifications require administrative verification.
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || !isDirty}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? "Saving Changes..." : "Save Profile"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Col: RBAC & Account Metadata */}
        <div className="space-y-6">
          {/* RBAC Card */}
          <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-xl rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-400" />
              <span>Roles & Permissions</span>
            </h3>

            <div className="space-y-3">
              <div>
                <span className="text-xs text-slate-400 block mb-1.5 font-medium">Assigned Roles:</span>
                <div className="flex flex-wrap gap-1.5">
                  {user?.roles?.map((r) => (
                    <span
                      key={r}
                      className="px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-800/60 text-indigo-300 font-mono text-xs font-bold"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <span className="text-xs text-slate-400 block mb-1.5 font-medium">Active Permissions:</span>
                <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto pr-1">
                  {user?.permissions?.map((p) => (
                    <span
                      key={p}
                      className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Account Details Card */}
          <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-xl rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Account Status</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                  Account Status
                </span>
                <span className={user?.is_active ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
                  {user?.is_active ? "Active" : "Suspended"}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  Email Verified
                </span>
                <span className={user?.is_verified ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
                  {user?.is_verified ? "Verified" : "Unverified"}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Member Since
                </span>
                <span className="text-slate-300 font-mono">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Last Login
                </span>
                <span className="text-slate-300 font-mono">
                  {user?.last_login_at ? new Date(user.last_login_at).toLocaleString() : "First Session"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
