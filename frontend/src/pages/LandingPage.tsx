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

interface TrackSample {
  id: string;
  tag: string;
  title: string;
  instructor: string;
  duration: string;
  chunksIndexed: number;
  accent: string;
  chipBg: string;
  sampleQuestion: string;
  citationSource: string;
  similarityScore: string;
  answerPreview: string;
  modules: string[];
}

const INTERACTIVE_TRACKS: TrackSample[] = [
  {
    id: "cloud-devops",
    tag: "TRACK 01",
    title: "Cloud Infrastructure & Kubernetes DevOps",
    instructor: "Vikram Patel · Principal SRE",
    duration: "18h 40m",
    chunksIndexed: 342,
    accent: "from-teal-600 to-emerald-500",
    chipBg: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/25",
    sampleQuestion: "How does HorizontalPodAutoscaler scale stateless workloads?",
    citationSource: "Mod 2 · Deck Slide #08 · K8s Autoscaling",
    similarityScore: "98.4% FAISS Match",
    answerPreview:
      "HPA queries the Metrics Server every 15s (sync period) and computes desiredReplicas = ceil[currentReplicas * (currentMetric / targetMetric)], with stabilization windows to prevent thrashing.",
    modules: [
      "IAM Boundaries & VPC Peering",
      "Kubernetes Control Plane & HPA",
      "GitOps & Canary Rollouts",
    ],
  },
  {
    id: "enterprise-ai",
    tag: "TRACK 02",
    title: "Enterprise AI Agents & RAG Systems",
    instructor: "Dr. Elena Vance · Applied AI Lead",
    duration: "22h 15m",
    chunksIndexed: 418,
    accent: "from-orange-500 to-rose-500",
    chipBg: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/25",
    sampleQuestion: "Why pair dense FAISS vectors with reciprocal rank fusion?",
    citationSource: "Mod 1 · RAG Architecture · Chunk #114",
    similarityScore: "99.1% FAISS Match",
    answerPreview:
      "Dense semantic embeddings capture paraphrase intent while BM25 lexical matching locks onto exact acronyms, API keys, and error codes—boosting Recall@5 by 19% in grounded citations.",
    modules: [
      "Semantic Chunking & FAISS Indexing",
      "Tool-Calling & Guardrail Agents",
      "Grounded Citation Evaluation",
    ],
  },
  {
    id: "python-pyspark",
    tag: "TRACK 03",
    title: "Distributed Python & PySpark Engineering",
    instructor: "Arjun Nair · Staff Data Architect",
    duration: "16h 30m",
    chunksIndexed: 276,
    accent: "from-blue-600 to-cyan-500",
    chipBg: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25",
    sampleQuestion: "When should Broadcast Hash Join replace Sort-Merge Join?",
    citationSource: "Mod 3 · Catalyst Optimizer · Slide #14",
    similarityScore: "97.6% FAISS Match",
    answerPreview:
      "When the smaller dimension table fits safely under spark.sql.autoBroadcastJoinThreshold (10MB default), broadcasting avoids full cluster shuffle and reduces stage latency dramatically.",
    modules: [
      "Memory-Safe Python Generators",
      "Catalyst Query Plans & Partitioning",
      "Delta Lake Structured Streaming",
    ],
  },
  {
    id: "zero-trust",
    tag: "TRACK 04",
    title: "Zero Trust Security & Identity Engineering",
    instructor: "Meera Kapoor · AppSec Director",
    duration: "14h 50m",
    chunksIndexed: 214,
    accent: "from-emerald-600 to-teal-500",
    chipBg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
    sampleQuestion: "How do short-lived OIDC tokens prevent lateral privilege escalation?",
    citationSource: "Mod 1 · Token Architecture · Chunk #49",
    similarityScore: "98.0% FAISS Match",
    answerPreview:
      "Audience-bound JWT assertions paired with strict RBAC claims and continuous session posture checks isolate workloads so compromised secrets expire within minutes.",
    modules: [
      "OAuth 2.1, PKCE & OIDC Claims",
      "mTLS Service Mesh Policies",
      "Automated Threat Detection Lab",
    ],
  },
];

export function LandingPage() {
  const [selectedTrackIdx, setSelectedTrackIdx] = useState(0);
  const [playgroundTab, setPlaygroundTab] = useState<"copilot" | "syllabus">("copilot");

  const activeTrack = INTERACTIVE_TRACKS[selectedTrackIdx];

  return (
    <div className="min-h-screen w-full bg-background text-foreground studio-grid-bg flex flex-col justify-between relative overflow-x-clip">
      {/* Subtle architectural accent glows */}
      <div className="fixed top-[-15%] right-[-8%] w-[520px] h-[520px] rounded-full bg-teal-500/10 blur-[130px] pointer-events-none" />
      <div className="fixed bottom-[-12%] left-[-8%] w-[460px] h-[460px] rounded-full bg-orange-500/10 blur-[140px] pointer-events-none" />

      {/* Top Navigation */}
      <header className="w-full max-w-7xl mx-auto px-5 sm:px-10 py-5 flex items-center justify-between relative z-20">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-[0_3px_0_0_#0f766e] group-hover:-translate-y-0.5 transition-transform">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <span className="font-display font-bold text-xl tracking-tight text-foreground block leading-none">
              Learnova
            </span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-teal-700 dark:text-teal-400 mt-1 block">
              Learn with AI
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <Link to="/courses" className="hover:text-foreground transition-colors">
            Course Catalog
          </Link>
          <Link to="/status" className="hover:text-foreground transition-colors">
            System Telemetry
          </Link>
        </nav>

        <div className="flex items-center gap-2.5">
          <Link
            to="/login"
            className="text-xs sm:text-sm font-semibold text-foreground/80 hover:text-foreground px-3.5 py-2 rounded-xl hover:bg-secondary transition-colors"
          >
            Sign In
          </Link>
          <Link
            to="/dashboard"
            className="text-xs sm:text-sm font-bold bg-foreground text-background hover:bg-foreground/90 px-4 py-2 rounded-xl transition-all shadow-sm kinetic-press flex items-center gap-1.5"
          >
            <span>Open Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero Section: Editorial Studio Typography + Live Interactive Playground */}
      <main className="w-full max-w-7xl mx-auto px-5 sm:px-10 py-6 lg:py-10 flex-1 flex flex-col gap-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* LEFT COLUMN: Editorial Positioning */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border shadow-xs text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-foreground">Interactive AI Studio LMS · 1,250+ Indexed Chunks</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl xl:text-6xl font-bold tracking-tight leading-[1.06] text-foreground">
              Build deep engineering fluency with{" "}
              <span className="relative inline-block text-teal-700 dark:text-teal-400">
                living curricula
                <span className="absolute left-0 bottom-1 w-full h-2.5 bg-orange-400/25 -z-10 rounded-full" />
              </span>
              .
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
              <strong className="text-foreground font-semibold">
                Learn Smarter. Learn Personally. Learn with AI.
              </strong>{" "}
              Switch seamlessly between annotated presentation decks, HD lecture rooms, timed exam
              simulations, and a citation-grounded FAISS Study Copilot.
            </p>

            {/* Primary CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 pt-1">
              <Link to="/login">
                <button
                  type="button"
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-3.5 rounded-xl shadow-[0_4px_0_0_#115e59] hover:shadow-[0_2px_0_0_#115e59] hover:translate-y-0.5 active:translate-y-1 transition-all flex items-center gap-2.5 text-sm sm:text-base cursor-pointer"
                >
                  <span>Start Learning Now</span>
                  <span className="sr-only">Enter Learning Platform</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>

              <Link to="/courses">
                <button
                  type="button"
                  className="bg-card hover:bg-secondary text-foreground border border-border font-semibold px-5 py-3.5 rounded-xl text-sm sm:text-base transition-all flex items-center gap-2 shadow-xs kinetic-press cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-orange-500" />
                  <span>Explore Catalog</span>
                </button>
              </Link>
            </div>

            {/* Crisp Telemetry Strip */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/80 max-w-lg">
              <div>
                <p className="font-display text-2xl font-bold text-foreground">4</p>
                <p className="text-xs text-muted-foreground">Specialized Tracks</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold text-teal-700 dark:text-teal-400">
                  1,250+
                </p>
                <p className="text-xs text-muted-foreground">RAG Vector Chunks</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold text-orange-600 dark:text-orange-400">
                  100%
                </p>
                <p className="text-xs text-muted-foreground">Interactive Labs</p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Live Interactive Studio Workbench Preview */}
          <div className="lg:col-span-6">
            <div className="studio-card p-5 sm:p-6 space-y-5 relative overflow-hidden">
              {/* Top window chrome */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-400/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500/80" />
                  <span className="text-[11px] font-mono text-muted-foreground ml-1.5">
                    studio://preview-workbench
                  </span>
                </div>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                  Interactive Sandbox
                </span>
              </div>

              {/* Interactive Track Selector Pills */}
              <div>
                <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
                  1 · Choose a live curriculum to inspect
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {INTERACTIVE_TRACKS.map((track, idx) => {
                    const isSelected = idx === selectedTrackIdx;
                    return (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => setSelectedTrackIdx(idx)}
                        className={`text-left px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? "bg-foreground text-background border-foreground shadow-sm"
                            : "bg-secondary/60 text-foreground/80 border-border hover:bg-secondary"
                        }`}
                      >
                        <span className="block text-[10px] font-mono opacity-75">
                          {track.tag}
                        </span>
                        <span className="block truncate mt-0.5">
                          {track.title.split(" ")[0]} {track.title.split(" ")[1]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Track Card & Interactive Mode Switcher */}
              <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-[11px] font-mono font-medium ${activeTrack.chipBg}`}
                    >
                      {activeTrack.chunksIndexed} Indexed Chunks
                    </span>
                    <h2 className="font-display font-bold text-lg text-foreground mt-2">
                      {activeTrack.title}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {activeTrack.instructor} · {activeTrack.duration}
                    </p>
                  </div>

                  {/* Mode Switch */}
                  <div className="inline-flex p-1 rounded-lg bg-background border border-border shrink-0">
                    <button
                      type="button"
                      onClick={() => setPlaygroundTab("copilot")}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                        playgroundTab === "copilot"
                          ? "bg-teal-600 text-white"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      AI Citation
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlaygroundTab("syllabus")}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                        playgroundTab === "syllabus"
                          ? "bg-teal-600 text-white"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Modules
                    </button>
                  </div>
                </div>

                {playgroundTab === "copilot" ? (
                  <div className="space-y-3 animate-fade-in">
                    <div className="p-3 rounded-lg bg-card border border-border flex items-start gap-2.5">
                      <Terminal className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="font-mono text-[10px] uppercase text-muted-foreground block">
                          Sample Learner Query
                        </span>
                        <span className="font-semibold text-foreground">
                          "{activeTrack.sampleQuestion}"
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg bg-card border border-teal-500/30 space-y-2">
                      <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                        <span className="inline-flex items-center gap-1 text-teal-700 dark:text-teal-400 font-semibold">
                          <Sparkles className="w-3.5 h-3.5" />
                          Cited Grounded Response
                        </span>
                        <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-700 dark:text-teal-300">
                          {activeTrack.similarityScore}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-foreground/90">
                        {activeTrack.answerPreview}
                      </p>
                      <div className="pt-1 flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
                        <FileText className="w-3 h-3 text-orange-500" />
                        <span>Source: {activeTrack.citationSource}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 animate-fade-in">
                    {activeTrack.modules.map((mod, mIdx) => (
                      <div
                        key={mod}
                        className="p-3 rounded-lg bg-card border border-border flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-md bg-teal-500/15 text-teal-700 dark:text-teal-300 font-mono text-xs font-bold flex items-center justify-center">
                            0{mIdx + 1}
                          </span>
                          <span className="text-xs font-semibold text-foreground">{mod}</span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                          <Play className="w-3 h-3 text-orange-500" />
                          Deck + Lab
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-muted-foreground">
                    Instant demo credentials available inside sign-in.
                  </span>
                  <Link
                    to="/login"
                    className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline inline-flex items-center gap-1"
                  >
                    Try full workspace <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Feature Bento Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="studio-card p-5 hover:border-teal-500/40 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-700 dark:text-teal-400 flex items-center justify-center mb-3">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="font-display font-bold text-sm text-foreground">
              FAISS Study Copilot
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Ask course-scoped questions and verify answers against cited slide chunks.
            </p>
          </div>

          <div className="studio-card p-5 hover:border-orange-500/40 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-3">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="font-display font-bold text-sm text-foreground">
              Zen Classroom & Notes
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Slide thumbnail strips, adjustable typography, flashcards, and persistent scratchpads.
            </p>
          </div>

          <div className="studio-card p-5 hover:border-blue-500/40 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
              <Cpu className="w-4 h-4" />
            </div>
            <h3 className="font-display font-bold text-sm text-foreground">
              ML Mastery Telemetry
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Adaptive topic recommendations paired with live Focus Pomodoro sessions.
            </p>
          </div>

          <div className="studio-card p-5 hover:border-emerald-500/40 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="font-display font-bold text-sm text-foreground">
              Timed Exam Arena
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Keyboard shortcuts, confidence flags, question matrix navigation, and instant grading.
            </p>
          </div>
        </section>
      </main>

      {/* Compact Studio Footer */}
      <footer className="w-full max-w-7xl mx-auto px-5 sm:px-10 py-5 border-t border-border/70 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-3 relative z-10">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
          <span>Learnova AI Studio · Dual-Engine RAG & Adaptive ML Platform</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/courses" className="hover:text-foreground transition-colors">
            Courses
          </Link>
          <Link to="/status" className="hover:text-foreground transition-colors">
            System Status
          </Link>
          <Link to="/login" className="hover:text-foreground font-semibold transition-colors">
            Sign In
          </Link>
        </div>
      </footer>
    </div>
  );
}
