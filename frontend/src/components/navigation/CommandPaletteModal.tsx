import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Award,
  BookOpen,
  Calendar,
  Compass,
  FolderKanban,
  LayoutDashboard,
  Search,
  Sparkles,
  User,
  X,
  ArrowRight,
} from "lucide-react";
import { SEEDED_COURSES } from "@/data/courseCurricula";

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCopilot: () => void;
}

interface PaletteItem {
  id: string;
  title: string;
  subtitle: string;
  group: "Actions" | "Workspace" | "Courses";
  icon: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
}

export function CommandPaletteModal({
  isOpen,
  onClose,
  onOpenCopilot,
}: CommandPaletteModalProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const items: PaletteItem[] = useMemo(() => {
    const go = (path: string) => {
      onClose();
      navigate(path);
    };

    const actionItems: PaletteItem[] = [
      {
        id: "act-copilot",
        title: "Open Learnova AI Study Copilot",
        subtitle: "Ask RAG questions across 1,240+ FAISS indexed chunks",
        group: "Actions",
        icon: Sparkles,
        onSelect: () => {
          onClose();
          onOpenCopilot();
        },
      },
      {
        id: "act-catalog",
        title: "Browse All Courses",
        subtitle: "Explore modules, video lectures & quizzes",
        group: "Actions",
        icon: Compass,
        onSelect: () => go("/courses"),
      },
    ];

    const workspaceItems: PaletteItem[] = [
      {
        id: "nav-dashboard",
        title: "Student Cockpit",
        subtitle: "Telemetry, AI path & study streak overview",
        group: "Workspace",
        icon: LayoutDashboard,
        onSelect: () => go("/dashboard"),
      },
      {
        id: "nav-my-courses",
        title: "My Courses",
        subtitle: "Resume active enrollments & checkpoints",
        group: "Workspace",
        icon: BookOpen,
        onSelect: () => go("/my-courses"),
      },
      {
        id: "nav-calendar",
        title: "Academic Calendar",
        subtitle: "Schedule, live sessions & assessment deadlines",
        group: "Workspace",
        icon: Calendar,
        onSelect: () => go("/calendar"),
      },
      {
        id: "nav-grades",
        title: "Grades & CGPA Explorer",
        subtitle: "Quiz scores, transcripts & cumulative simulator",
        group: "Workspace",
        icon: Award,
        onSelect: () => go("/grades"),
      },
      {
        id: "nav-files",
        title: "Private Files & Vault",
        subtitle: "Personal notes, slides & downloaded resources",
        group: "Workspace",
        icon: FolderKanban,
        onSelect: () => go("/private-files"),
      },
      {
        id: "nav-profile",
        title: "Profile & Security",
        subtitle: "Manage personal details and preferences",
        group: "Workspace",
        icon: User,
        onSelect: () => go("/profile"),
      },
    ];

    const courseItems: PaletteItem[] = SEEDED_COURSES.map((course) => ({
      id: `course-${course.id}`,
      title: course.title,
      subtitle: `${course.category?.name || "Engineering"} · ${course.modules_count} modules · ${course.difficulty}`,
      group: "Courses",
      icon: BookOpen,
      onSelect: () => go(`/courses/${course.id}`),
    }));

    return [...actionItems, ...workspaceItems, ...courseItems];
  }, [navigate, onClose, onOpenCopilot]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q)
    );
  }, [items, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (filtered.length > 0 ? (prev + 1) % filtered.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) =>
          filtered.length > 0 ? (prev - 1 + filtered.length) % filtered.length : 0
        );
      } else if (e.key === "Enter" && filtered[activeIndex]) {
        e.preventDefault();
        filtered[activeIndex].onSelect();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filtered, activeIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-xs flex items-start justify-center pt-[12vh] px-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-card text-foreground border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Command Palette"
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          <Search className="w-4 h-4 text-teal-600 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to a course, page, calendar, or Ask Learnova AI..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder-muted-foreground focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
            aria-label="Close Command Palette"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              No matching workspaces or courses for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={item.onSelect}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-teal-500/12 text-foreground border border-teal-500/30"
                      : "hover:bg-secondary/70 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "bg-teal-600 text-white"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{item.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                      {item.group}
                    </span>
                    {isSelected && <ArrowRight className="w-3.5 h-3.5 text-teal-600" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2.5 bg-secondary/50 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
          <span>↑↓ Navigate · ↵ Select</span>
          <span>ESC Close</span>
        </div>
      </div>
    </div>
  );
}
