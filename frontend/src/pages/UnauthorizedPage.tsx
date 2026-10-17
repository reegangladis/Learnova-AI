import { Link, useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft, Home, UserCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function UnauthorizedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl shadow-2xl p-8 text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
          <ShieldAlert className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
            HTTP 403 — Forbidden
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight pt-2">
            Access Restricted
          </h1>
          <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
            You do not have the required role or security permissions to access this protected resource.
          </p>
        </div>

        {user && (
          <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl text-left text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-300 font-semibold border-b border-slate-700/60 pb-2">
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                Current Active Identity
              </span>
              <span className="text-[11px] text-slate-400">{user.email}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Assigned Role(s):</span>
              <div className="flex gap-1.5">
                {user.roles.map((r) => (
                  <span key={r} className="px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-300 font-mono text-[10px] font-bold">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
          <Link
            to="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium shadow-lg shadow-indigo-600/25 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
