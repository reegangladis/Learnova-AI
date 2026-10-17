import React, { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { authService } from "@/services/authService";
import { CheckCircle2, AlertCircle, Mail, ArrowRight, Loader2, RefreshCw } from "lucide-react";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenFromUrl = searchParams.get("token") || "";

  const [tokenInput, setTokenInput] = useState(tokenFromUrl);
  const [resendEmail, setResendEmail] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    if (tokenFromUrl) {
      authService
        .verifyEmail(tokenFromUrl.trim())
        .then(() => {
          if (!isCancelled) {
            setVerifySuccess(true);
          }
        })
        .catch((err: unknown) => {
          if (!isCancelled) {
            const msg =
              err instanceof Error
                ? err.message
                : "Invalid or expired verification token. Please request a new link.";
            setErrorMessage(msg);
          }
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [tokenFromUrl]);

  const handleManualVerify = async (tokenToUse: string) => {
    if (!tokenToUse.trim()) {
      setErrorMessage("Please enter or provide a valid verification token.");
      return;
    }
    setIsVerifying(true);
    setErrorMessage(null);
    try {
      await authService.verifyEmail(tokenToUse.trim());
      setVerifySuccess(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Invalid or expired verification token. Please request a new link.";
      setErrorMessage(msg);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;
    setIsResending(true);
    setResendMessage(null);
    try {
      const res = await authService.resendVerification(resendEmail.trim());
      setResendSuccess(true);
      setResendMessage(res.message || "Verification link has been sent to your email.");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to resend verification email.";
      setErrorMessage(msg);
    } finally {
      setIsResending(false);
    }
  };

  if (verifySuccess) {
    return (
      <div className="w-full max-w-md mx-auto p-6 sm:p-8 bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl shadow-2xl text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Email Verified!</h1>
        <p className="text-slate-400 text-sm mt-2 leading-relaxed">
          Your email address has been successfully confirmed. Your Learnova AI account is now fully active.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl transition-colors shadow-lg shadow-indigo-600/25"
          >
            <span>Proceed to Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <Link
            to="/profile"
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors py-2"
          >
            View Account Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl shadow-2xl">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-3">
          <Mail className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Verify Email Address
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Confirm your account email to unlock complete platform features
        </p>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-3 animate-in fade-in"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
          <p className="text-rose-300/90">{errorMessage}</p>
        </div>
      )}

      {resendSuccess && resendMessage && (
        <div
          role="alert"
          className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-start gap-3 animate-in fade-in"
        >
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-400" />
          <p className="text-emerald-300/90">{resendMessage}</p>
        </div>
      )}

      {/* Manual Token Verification */}
      <div className="space-y-4">
        <div>
          <label
            htmlFor="verification_token"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
          >
            Verification Token
          </label>
          <input
            id="verification_token"
            type="text"
            placeholder="Paste your email verification token"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-mono text-xs"
          />
        </div>

        <button
          type="button"
          onClick={() => handleManualVerify(tokenInput)}
          disabled={isVerifying || !tokenInput.trim()}
          className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying token...</span>
            </>
          ) : (
            <span>Verify Token</span>
          )}
        </button>
      </div>

      {/* Resend Verification Token Section */}
      <div className="mt-8 pt-6 border-t border-slate-800/80">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Need a new verification link?</span>
        </p>
        <form onSubmit={handleResend} className="space-y-3">
          <input
            type="email"
            placeholder="Enter your registered email"
            value={resendEmail}
            onChange={(e) => setResendEmail(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
          />
          <button
            type="submit"
            disabled={isResending || !resendEmail.trim()}
            className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition-colors disabled:opacity-50"
          >
            {isResending ? "Sending link..." : "Resend Verification Email"}
          </button>
        </form>
      </div>

      <div className="mt-6 text-center text-xs text-slate-400">
        <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
