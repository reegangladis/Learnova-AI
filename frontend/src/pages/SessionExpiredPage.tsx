import { Link } from "react-router-dom";
import { Clock, LogIn } from "lucide-react";

export function SessionExpiredPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl shadow-2xl p-8 text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
          <Clock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Session Expired
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Your secure authentication session has timed out or expired. Please sign in again to continue your work.
          </p>
        </div>

        <div className="p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl text-xs text-slate-400 text-left space-y-1.5">
          <p className="font-semibold text-slate-300">Why did this happen?</p>
          <p>
            Learnova AI uses short-lived tokens and automatic refresh token rotation to protect your account against unauthorized session hijacking.
          </p>
        </div>

        <div className="pt-2">
          <Link
            to="/login"
            className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl transition-colors shadow-lg shadow-indigo-600/25"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In Again</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
