import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Bookmark, Compass, Sparkles } from "lucide-react";

interface InterestTopic {
  id: string;
  title: string;
  category: "AI & RAG" | "Security" | "Cloud & Data";
  tag: string;
  courseId: string;
  summary: string;
}

const TOPICS: InterestTopic[] = [
  {
    id: "t-1",
    title: "Generative AI, Hybrid RAG & FAISS Retrieval in Production",
    category: "AI & RAG",
    tag: "Trending",
    courseId: "c-ai-01",
    summary: "Combine dense semantic embeddings with citation-grounded prompt guardrails.",
  },
  {
    id: "t-2",
    title: "Zero Trust Microsegmentation & SPIFFE/SPIRE Identities",
    category: "Security",
    tag: "Essential",
    courseId: "c-security-01",
    summary: "Replace static perimeter trust with mutual TLS and workload attestation.",
  },
  {
    id: "t-3",
    title: "Multi-Stage Distroless Containers & Kubernetes HPA Tuning",
    category: "Cloud & Data",
    tag: "Hands-On",
    courseId: "c-devops-01",
    summary: "Slash container attack surfaces by 80% while tuning production autoscaling.",
  },
  {
    id: "t-4",
    title: "Distributed PySpark Catalyst Optimization & Asyncio Pipelines",
    category: "Cloud & Data",
    tag: "Architecture",
    courseId: "c-python-01",
    summary: "Master shuffle reduction, broadcast joins, and non-blocking event loops.",
  },
];

export function InterestZonePage() {
  const [filterCat, setFilterCat] = useState<string>("All");
  const [savedTopics, setSavedTopics] = useState<string[]>([]);

  const visibleTopics =
    filterCat === "All" ? TOPICS : TOPICS.filter((t) => t.category === filterCat);

  const toggleSave = (id: string) => {
    setSavedTopics((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="studio-card border-t-4 border-t-orange-500 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2.5 py-0.5 rounded-full">
            Exploration Studio
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Interest Zone
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Curated architecture spotlights connected directly to Learnova tracks and AI Copilot.
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("open-ai-copilot"))}
          className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shrink-0 cursor-pointer shadow-[0_2px_0_0_#0f766e]"
        >
          <Sparkles className="w-4 h-4" />
          <span>Explore with AI Copilot</span>
        </button>
      </div>

      {/* Interactive Category Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {["All", "AI & RAG", "Security", "Cloud & Data"].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCat(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                filterCat === cat
                  ? "bg-foreground text-background"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <span className="text-xs font-mono text-muted-foreground">
          {savedTopics.length} bookmarked spotlights
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {visibleTopics.map((topic) => {
          const isSaved = savedTopics.includes(topic.id);
          return (
            <div
              key={topic.id}
              className="studio-card p-5 hover:border-teal-500/40 transition-all flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2.5 py-0.5 rounded-full border border-orange-500/20">
                    {topic.tag}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleSave(topic.id)}
                    className={`p-1 rounded-lg cursor-pointer ${
                      isSaved ? "text-teal-600 bg-teal-500/10" : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Bookmark spotlight"
                  >
                    <Bookmark className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
                  </button>
                </div>

                <h3 className="font-display text-sm font-bold text-foreground leading-snug">
                  {topic.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{topic.summary}</p>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                  <Compass className="w-3 h-3 text-teal-600" />
                  {topic.category}
                </span>
                <Link
                  to={`/courses/${topic.courseId}`}
                  className="font-bold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1"
                >
                  Open Track <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
