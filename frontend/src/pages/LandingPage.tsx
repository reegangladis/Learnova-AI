import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Cpu,
  FileText,
  GraduationCap,
  Layers,
  Play,
  ShieldCheck,
  Sparkles,
  Terminal,
} from "lucide-react";

interface StudioSpotlight {
  id: string;
  badge: string;
  courseTitle: string;
  mentorName: string;
  mentorRole: string;
  mentorAvatar: string;
  accentBg: string;
  accentText: string;
  query: string;
  citation: string;
  score: string;
  snippet: string;
  stats: string;
}

const STUDIO_SPOTLIGHTS: StudioSpotlight[] = [
  {
    id: "ai-rag",
    badge: "AI & LLMs",
    courseTitle: "Enterprise AI Engineering & Large Language Models",
    mentorName: "Dr. Aravind Nair",
    mentorRole: "Applied AI Architect",
    mentorAvatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80",
    accentBg: "bg-teal-600",
    accentText: "text-teal-700 dark:text-teal-300",
    query: "How does FAISS FlatIP rank curriculum context chunks?",
    citation: "Mod 2 · Vector Store Slide #09 · Chunk #410",
    score: "99.1% Match",
    snippet:
      "L2-normalized embeddings convert cosine similarity into an exact inner product dot computation, returning grounded citations in <42ms.",
    stats: "410 Indexed Chunks · 3 Modules",
  },
  {
    id: "cloud-devops",
    badge: "Cloud & K8s",
    courseTitle: "Full-Stack Cloud & DevOps Engineering",
    mentorName: "Sarah Connor",
    mentorRole: "Principal SRE Lead",
    mentorAvatar:
      "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=600&q=80",
    accentBg: "bg-orange-500",
    accentText: "text-orange-600 dark:text-orange-400",
    query: "How do multi-stage Docker builds shrink runtime attack surface?",
    citation: "Mod 1 · Container Security Deck #04",
    score: "98.4% Match",
    snippet:
      "Separating builder toolchains from distroless runtime stages removes package managers, compilers, and shells—eliminating over 80% of base image CVEs.",
    stats: "320 Indexed Chunks · 320m Video + Decks",
  },
  {
    id: "python-data",
    badge: "Python & Spark",
    courseTitle: "Advanced Python & Distributed Data Systems",
    mentorName: "Rohan Mehta",
    mentorRole: "Staff Data Engineer",
    mentorAvatar:
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80",
    accentBg: "bg-blue-600",
    accentText: "text-blue-600 dark:text-blue-400",
    query: "When does Catalyst choose Broadcast Hash Join over Sort-Merge?",
    citation: "Mod 3 · Spark Shuffle Internals #14",
    score: "97.8% Match",
    snippet:
      "When one relation stays below the broadcast threshold, Spark replicates it across executors to eliminate network shuffle overhead entirely.",
    stats: "280 Indexed Chunks · Asyncio & PySpark",
  },
  {
    id: "zero-trust",
    badge: "Zero Trust",
    courseTitle: "Enterprise Cybersecurity & Zero Trust Systems",
    mentorName: "Meera Kapoor",
    mentorRole: "Security Director",
    mentorAvatar:
      "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=600&q=80",
    accentBg: "bg-emerald-600",
    accentText: "text-emerald-700 dark:text-emerald-400",
    query: "Why do SPIFFE SVIDs replace static service secrets?",
    citation: "Mod 2 · Workload Attestation #07",
    score: "98.6% Match",
    snippet:
      "Short-lived X.509 cryptographic workload certificates rotate automatically over mTLS, preventing lateral credential theft.",
    stats: "230 Indexed Chunks · Live Threat Labs",
  },
];

export function LandingPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showCitations, setShowCitations] = useState(true);
  const spotlight = STUDIO_SPOTLIGHTS[activeIndex];

  return (
    <div className="min-h-screen w-full bg-background text-foreground studio-grid-bg flex flex-col justify-between relative overflow-x-clip">
      {/* Warm organic accent washes (distinct from JAIN navy/yellow) */}
      <div className="fixed top-[-12%] right-[-8%] w-[560px] h-[560px] rounded-full bg-teal-500/10 blur-[140px] pointer-events-none" />
      <div className="fixed bottom-[-12%] left-[-8%] w-[520px] h-[520px] rounded-full bg-orange-500/10 blur-[140px] pointer-events-none" />

      {/* Minimalist Iconic Top Header */}
      <header className="w-full max-w-7xl mx-auto px-6 sm:px-10 py-5 flex items-center justify-between relative z-20">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-[0_3px_0_0_#0f766e] group-hover:-translate-y-0.5 transition-transform">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <span className="font-display font-bold text-xl tracking-tight text-foreground block leading-none">
              Learnova
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-teal-700 dark:text-teal-400 mt-1 block">
              Intelligent LMS · Learn with AI
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/courses"
            className="hidden sm:inline-flex text-xs font-semibold text-muted-foreground hover:text-foreground px-3.5 py-2 rounded-xl hover:bg-secondary transition-colors"
          >
            Explore Catalog
          </Link>
          <Link
            to="/status"
            className="hidden md:inline-flex text-xs font-semibold text-muted-foreground hover:text-foreground px-3.5 py-2 rounded-xl hover:bg-secondary transition-colors"
          >
            System Health
          </Link>
          <Link
            to="/login"
            className="text-xs font-bold bg-card border border-border hover:bg-secondary text-foreground px-4 py-2 rounded-xl transition-colors"
          >
            Sign In
          </Link>
          <Link
            to="/dashboard"
            className="text-xs font-bold bg-foreground hover:bg-foreground/90 text-background px-4 py-2 rounded-xl transition-all shadow-xs kinetic-press"
          >
            Open Studio
          </Link>
        </div>
      </header>

      {/* FULL-VIEWPORT BALANCED 2-COLUMN HERO (Inspired by clean focus, unique Studio Bento Visual on right) */}
      <main className="w-full max-w-7xl mx-auto px-6 sm:px-10 py-6 lg:py-8 flex-1 flex items-center relative z-10">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* LEFT COLUMN: Crisp Display Statement, Concise Tagline & Action Pills */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-card border border-border shadow-xs text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-foreground">Studio Atelier LMS · Dual-Engine RAG + ML</span>
            </div>

            <div className="space-y-3">
              <h1 className="font-display text-4xl sm:text-5xl xl:text-[3.55rem] font-bold tracking-tight leading-[1.06] text-foreground">
                Master Tech Skills
                <span className="block text-teal-700 dark:text-teal-400 mt-1">
                  Through Living Studio
                </span>
              </h1>

              <p className="text-base sm:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 font-normal leading-relaxed">
                <strong className="text-foreground font-semibold">
                  Learn Smarter. Learn Personally. Learn with AI.
                </strong>{" "}
                Your interactive workspace for slide decks, lecture labs, timed exams, and verified
                FAISS tutoring.
              </p>
            </div>

            {/* Primary CTA Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5">
              <Link to="/login">
                <button
                  type="button"
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-7 py-3.5 rounded-xl shadow-[0_4px_0_0_#0f766e] hover:shadow-[0_2px_0_0_#0f766e] hover:translate-y-0.5 active:translate-y-1 flex items-center gap-2.5 text-sm sm:text-base transition-all cursor-pointer"
                >
                  <span>Log in to learn</span>
                  <span className="sr-only">Enter Learning Platform</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>

              <Link to="/courses">
                <button
                  type="button"
                  className="bg-card hover:bg-secondary text-foreground border border-border font-semibold px-6 py-3.5 rounded-xl text-sm sm:text-base transition-all flex items-center gap-2 shadow-xs kinetic-press cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-orange-500" />
                  <span>Browse Curricula</span>
                </button>
              </Link>
            </div>

            {/* Compact Studio Pillars Strip */}
            <div className="pt-4 border-t border-border/80 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                <strong className="text-foreground">1,240+</strong> RAG Chunks
              </span>
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-orange-500" />
                <strong className="text-foreground">4</strong> Engineering Tracks
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                Zero Setup Demo Sign-In
              </span>
            </div>
          </div>

          {/* RIGHT COLUMN: Asymmetric Interactive Studio Collage (Replaces 3 JAIN Oval Portrait Columns) */}
          <div className="lg:col-span-6 relative">
            <div className="grid grid-cols-12 gap-3.5 items-stretch">
              {/* Top Interactive Track Switcher Bar across Collage */}
              <div className="col-span-12 flex flex-wrap items-center justify-between gap-2 bg-card border border-border rounded-2xl p-2 shadow-xs">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground pl-2">
                  Click Track to Preview:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {STUDIO_SPOTLIGHTS.map((item, idx) => {
                    const isActive = idx === activeIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveIndex(idx)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isActive
                            ? `${item.accentBg} text-white shadow-xs`
                            : "bg-secondary/70 text-foreground/80 hover:bg-secondary"
                        }`}
                      >
                        {item.badge}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Left Tall Mosaic Card: Architectural Studio Photography + Cohort Card */}
              <div className="col-span-12 sm:col-span-5 studio-card overflow-hidden flex flex-col justify-between group">
                <div className="relative h-52 sm:h-60 overflow-hidden bg-secondary">
                  <img
                    src={spotlight.mentorAvatar}
                    alt={`${spotlight.mentorName} — ${spotlight.courseTitle}`}
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/15 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <span className="inline-block text-[10px] font-mono uppercase tracking-wider bg-teal-600/90 px-2 py-0.5 rounded-md mb-1">
                      {spotlight.badge} Track
                    </span>
                    <p className="font-display text-sm font-bold leading-snug line-clamp-2">
                      {spotlight.courseTitle}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-card space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-foreground">{spotlight.mentorName}</p>
                      <p className="text-[10px] text-muted-foreground">{spotlight.mentorRole}</p>
                    </div>
                    <Link
                      to="/login"
                      className="w-7 h-7 rounded-lg bg-secondary hover:bg-teal-600 hover:text-white flex items-center justify-center transition-colors"
                      title="Open track"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </Link>
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground pt-1 border-t border-border">
                    {spotlight.stats}
                  </p>
                </div>
              </div>

              {/* Right Interactive Stack: Live AI RAG Card + Telemetry Tiles */}
              <div className="col-span-12 sm:col-span-7 flex flex-col gap-3.5 justify-between">
                {/* Interactive Live AI Study Copilot Output Card */}
                <div className="studio-card p-4 space-y-3 flex-1 flex flex-col justify-between border-t-4 border-t-teal-600">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-teal-700 dark:text-teal-300">
                      <Cpu className="w-3.5 h-3.5" />
                      AI STUDY COPILOT · FAISS
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCitations((v) => !v)}
                      className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-secondary hover:bg-secondary/80 text-foreground cursor-pointer"
                    >
                      {showCitations ? "Hide Citation" : "Show Citation"}
                    </button>
                  </div>

                  <div className="p-2.5 rounded-xl bg-secondary/60 border border-border flex items-start gap-2 text-xs">
                    <Terminal className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                    <span className="font-semibold text-foreground leading-snug">
                      &ldquo;{spotlight.query}&rdquo;
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {spotlight.snippet}
                  </p>

                  {showCitations && (
                    <div className="p-2.5 rounded-xl bg-teal-500/8 border border-teal-500/25 flex items-center justify-between gap-2 text-[10px] font-mono animate-fade-in">
                      <span className="flex items-center gap-1.5 text-foreground truncate">
                        <FileText className="w-3 h-3 text-orange-500 shrink-0" />
                        <span className="truncate">{spotlight.citation}</span>
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-teal-600 text-white font-bold shrink-0">
                        {spotlight.score}
                      </span>
                    </div>
                  )}
                </div>

                {/* Bottom Dual Mini-Studio Feature Cards */}
                <div className="grid grid-cols-2 gap-3.5">
                  <Link
                    to="/courses"
                    className="studio-card p-3.5 hover:border-orange-500/50 transition-colors group"
                  >
                    <span className="text-[10px] font-mono uppercase text-orange-600 dark:text-orange-400 font-bold block">
                      Interactive
                    </span>
                    <p className="font-display text-sm font-bold text-foreground mt-0.5 group-hover:text-orange-600 transition-colors">
                      Zen Slide Decks →
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Notes, flashcards &amp; keyboard nav
                    </p>
                  </Link>

                  <Link
                    to="/login"
                    className="studio-card p-3.5 hover:border-teal-500/50 transition-colors group"
                  >
                    <span className="text-[10px] font-mono uppercase text-teal-700 dark:text-teal-400 font-bold block">
                      Adaptive ML
                    </span>
                    <p className="font-display text-sm font-bold text-foreground mt-0.5 group-hover:text-teal-700 transition-colors">
                      Exam Arena →
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Timed quizzes &amp; CGPA simulator
                    </p>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Clean Minimal Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 sm:px-10 py-4 border-t border-border/70 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2 relative z-10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>© 2026 Learnova AI Studio · Dual-Engine RAG &amp; Adaptive ML LMS</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <Link to="/courses" className="hover:text-foreground transition-colors">
            Courses
          </Link>
          <span>·</span>
          <Link to="/status" className="hover:text-foreground transition-colors">
            System Status
          </Link>
          <span>·</span>
          <Link to="/login" className="hover:text-foreground font-semibold transition-colors">
            Log In
          </Link>
        </div>
      </footer>
    </div>
  );
}
