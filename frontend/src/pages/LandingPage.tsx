import { Link } from "react-router-dom";
import { ArrowRight, GraduationCap } from "lucide-react";

export function LandingPage() {
  const learners = [
    {
      name: "Alex",
      role: "AI & Data Science",
      bg: "bg-gradient-to-b from-sky-400 to-indigo-600",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    },
    {
      name: "Rohit",
      role: "Cloud Architect",
      bg: "bg-gradient-to-b from-amber-400 to-orange-600",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    },
    {
      name: "Mei Ling",
      role: "Full Stack Eng.",
      bg: "bg-gradient-to-b from-rose-400 to-pink-600",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
    },
    {
      name: "Marcus",
      role: "Cybersecurity",
      bg: "bg-gradient-to-b from-teal-400 to-emerald-600",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    },
    {
      name: "Amina",
      role: "UX & Product",
      bg: "bg-gradient-to-b from-purple-400 to-indigo-700",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
    },
    {
      name: "Gurpreet",
      role: "DevOps Engineer",
      bg: "bg-gradient-to-b from-blue-400 to-sky-600",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B374D] via-[#082C3E] to-[#051C28] text-white flex flex-col justify-between relative overflow-hidden">
      {/* Subtle background glow circles */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Header */}
      <header className="w-full px-6 sm:px-12 py-6 flex items-center justify-between relative z-10">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-400 shadow-sm">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="font-extrabold text-2xl tracking-tight text-white block leading-tight">
              Learnova
            </span>
            <span className="text-[10px] tracking-widest uppercase font-semibold text-amber-300/80 block">
              Online LMS · Learn with AI
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="text-xs sm:text-sm font-semibold text-white/90 hover:text-white px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            Sign In
          </Link>
          <Link
            to="/dashboard"
            className="text-xs sm:text-sm font-bold bg-[#E59819] hover:bg-[#D48810] text-slate-950 px-4 py-2 rounded-lg transition-all shadow-sm"
          >
            Dashboard
          </Link>
        </div>
      </header>

      {/* Hero Section (Matching Screenshot 6) */}
      <main className="w-full max-w-7xl mx-auto px-6 sm:px-12 py-8 sm:py-16 flex-1 flex flex-col lg:flex-row items-center justify-between gap-12 relative z-10">
        {/* Left Typography & CTA */}
        <div className="max-w-xl space-y-6 text-center lg:text-left">
          <div className="space-y-1">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-[#F59E0B] tracking-tight leading-[1.08]">
              Learn Beyond
            </h1>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-[#F59E0B] tracking-tight leading-[1.08]">
              Borders
            </h1>
          </div>

          <p className="text-xl sm:text-2xl text-slate-200 font-light max-w-lg leading-relaxed">
            Your journey to excellence begins here
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            <Link to="/login">
              <button
                type="button"
                className="bg-[#E59819] hover:bg-[#D48810] active:scale-[0.98] text-slate-950 font-bold px-8 py-4 rounded-xl shadow-xl flex items-center gap-3 text-base transition-all cursor-pointer"
              >
                <span>Log in to learn</span>
                <span className="sr-only">Enter Learning Platform</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </Link>

            <Link to="/status">
              <button
                type="button"
                className="border border-white/20 hover:bg-white/10 text-white font-medium px-5 py-3.5 rounded-xl text-sm transition-colors"
              >
                System Status
              </button>
            </Link>
          </div>
        </div>

        {/* Right Hero Gallery: Vertical Pill-shaped Learner Cards (Screenshot 6) */}
        <div className="w-full max-w-md lg:max-w-lg grid grid-cols-3 gap-3.5 sm:gap-4.5 pt-4">
          {learners.map((learner, idx) => (
            <div
              key={idx}
              className={`group relative h-48 sm:h-64 rounded-full overflow-hidden border-2 border-white/20 shadow-2xl transition-all duration-300 hover:scale-105 ${learner.bg} ${
                idx % 2 === 1 ? "translate-y-4" : "-translate-y-2"
              }`}
            >
              <img
                src={learner.avatar}
                alt={learner.name}
                className="w-full h-full object-cover mix-blend-multiply opacity-90 transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex flex-col justify-end p-3 text-center">
                <span className="text-xs font-bold text-white block drop-shadow-md">
                  {learner.name}
                </span>
                <span className="text-[9px] text-amber-300/90 font-medium block truncate">
                  {learner.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer (Screenshot 6) */}
      <footer className="w-full py-6 text-center text-xs text-slate-400/80 border-t border-white/10 relative z-10">
        <p>© 2026 Learnova · LMS. All rights reserved.</p>
      </footer>
    </div>
  );
}
