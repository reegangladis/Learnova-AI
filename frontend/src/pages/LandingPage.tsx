import { Link } from "react-router-dom";
import { ArrowRight, GraduationCap } from "lucide-react";

export function LandingPage() {
  // 6 diverse learner portraits matching the 3-column capsule grid from the reference screenshot
  const learnerColumns = [
    // Column 1
    [
      {
        id: "c1-1",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&h=600&q=80",
        alt: "Learner with spectacles",
      },
      {
        id: "c1-2",
        avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&h=600&q=80",
        alt: "Smiling young learner",
      },
    ],
    // Column 2 (center column - slightly offset)
    [
      {
        id: "c2-1",
        avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&h=600&q=80",
        alt: "Learner with beard and yellow attire",
      },
      {
        id: "c2-2",
        avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&h=600&q=80",
        alt: "Smiling professional woman learner",
      },
    ],
    // Column 3
    [
      {
        id: "c3-1",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&h=600&q=80",
        alt: "Learner in red dress",
      },
      {
        id: "c3-2",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&h=600&q=80",
        alt: "Learner with beard and headwear",
      },
    ],
  ];

  return (
    <div className="min-h-screen w-full bg-[#0B0F19] bg-gradient-to-br from-[#0B0F19] via-[#0E1626] to-[#080D18] text-white flex flex-col justify-between relative overflow-hidden select-none">
      {/* Dynamic ambient background glow matching Learnova Platform theme */}
      <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[160px] pointer-events-none" />

      {/* Top Header: Clean, matching the Jain reference page with Learnova branding */}
      <header className="w-full max-w-7xl mx-auto px-6 sm:px-12 py-6 flex items-center justify-between relative z-10">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="font-extrabold text-2xl tracking-tight text-white block leading-tight">
              Learnova
            </span>
            <span className="text-[10px] tracking-widest uppercase font-semibold text-indigo-300/80 block">
              Online LMS · Learn with AI
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white px-4 py-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-slate-800 transition-all"
          >
            Sign In
          </Link>
          <Link
            to="/dashboard"
            className="text-xs sm:text-sm font-bold bg-[#E59819] hover:bg-[#D48810] text-slate-950 px-4 py-2 rounded-xl transition-all shadow-md active:scale-95"
          >
            Dashboard
          </Link>
        </div>
      </header>

      {/* Hero Section: Matching Jain Screenshot layout (left bold typography, right 3-column pill capsules) */}
      <main className="w-full max-w-7xl mx-auto px-6 sm:px-12 py-8 sm:py-12 flex-1 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16 relative z-10">
        {/* LEFT COLUMN: Bold Headline & Call To Action */}
        <div className="max-w-xl space-y-6 text-center lg:text-left">
          <div className="space-y-1 sm:space-y-2">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-[#F59E0B] tracking-tight leading-[1.05]">
              Learn Beyond
            </h1>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-[#F59E0B] tracking-tight leading-[1.05]">
              Borders
            </h1>
          </div>

          <p className="text-lg sm:text-2xl text-slate-200 font-light max-w-lg leading-relaxed pt-1">
            Your journey to excellence begins here
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            <Link to="/login">
              <button
                type="button"
                className="bg-[#E59819] hover:bg-[#D48810] active:scale-[0.98] text-slate-950 font-bold px-8 py-3.5 rounded-xl shadow-xl shadow-amber-500/10 flex items-center gap-3 text-base transition-all cursor-pointer hover:shadow-amber-500/20"
              >
                <span>Log in to learn</span>
                <span className="sr-only">Enter Learning Platform</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </Link>

            <Link to="/status">
              <button
                type="button"
                className="border border-slate-700/80 hover:border-slate-600 bg-slate-900/40 hover:bg-slate-800/60 text-slate-300 hover:text-white font-medium px-5 py-3 rounded-xl text-sm transition-all"
              >
                System Status
              </button>
            </Link>
          </div>
        </div>

        {/* RIGHT COLUMN: 3 Staggered Columns of Arched Stadium/Pill Shaped Capsules */}
        <div className="w-full max-w-md lg:max-w-lg grid grid-cols-3 gap-3 sm:gap-4.5 pt-2">
          {learnerColumns.map((col, colIdx) => (
            <div
              key={colIdx}
              className={`flex flex-col gap-3.5 sm:gap-5 ${
                colIdx === 1 ? "-translate-y-4 sm:-translate-y-6" : colIdx === 2 ? "translate-y-2 sm:translate-y-3" : ""
              }`}
            >
              {col.map((learner) => (
                <div
                  key={learner.id}
                  className="group relative h-44 sm:h-60 rounded-[44px] sm:rounded-[60px] overflow-hidden border border-white/10 bg-slate-900/60 shadow-2xl transition-all duration-300 hover:scale-105 hover:border-indigo-500/40"
                >
                  <img
                    src={learner.avatar}
                    alt={learner.alt}
                    className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  {/* Subtle gradient vignette to blend with Learnova dark theme */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19]/40 via-transparent to-transparent pointer-events-none" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </main>

      {/* Footer: Minimalist, matching screenshot style */}
      <footer className="w-full max-w-7xl mx-auto px-6 sm:px-12 py-5 border-t border-slate-800/40 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2 relative z-10">
        <div>
          <span>Learnova · Next-Generation Learning Management System</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <Link to="/status" className="hover:text-slate-400 transition-colors">
            System Status
          </Link>
          <span>·</span>
          <Link to="/login" className="hover:text-slate-400 transition-colors">
            Log In
          </Link>
        </div>
      </footer>
    </div>
  );
}
