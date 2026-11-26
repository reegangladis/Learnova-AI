import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Bell,
  Check,
  Clock,
  LogOut,
  Menu,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";

interface NavbarProps {
  onOpenMobileMenu: () => void;
  onOpenCopilot?: () => void;
  onOpenCommandPalette?: () => void;
}

interface StudioNotification {
  id: string;
  title: string;
  detail: string;
  time: string;
  href: string;
  unread: boolean;
}

const INITIAL_NOTIFICATIONS: StudioNotification[] = [
  {
    id: "n-1",
    title: "FAISS Vector Index Synced",
    detail: "1,240 course slide chunks ready for citation queries.",
    time: "2m ago",
    href: "/dashboard",
    unread: true,
  },
  {
    id: "n-2",
    title: "Enterprise AI Lab Checkpoint",
    detail: "Complete Scaled Dot-Product Attention self-assessment.",
    time: "1h ago",
    href: "/courses/c-ai-01",
    unread: true,
  },
  {
    id: "n-3",
    title: "Weekly Live SRE Workshop",
    detail: "Kubernetes HPA autoscaling walkthrough added to Calendar.",
    time: "Today",
    href: "/calendar",
    unread: true,
  },
];

export function Navbar({
  onOpenMobileMenu,
  onOpenCopilot,
  onOpenCommandPalette,
}: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Live Pomodoro Study Focus Timer state
  const [focusSeconds, setFocusSeconds] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);

  // Interactive Notifications Popover state
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<StudioNotification[]>(INITIAL_NOTIFICATIONS);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = window.setInterval(() => {
      setFocusSeconds((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          return 25 * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerRunning]);

  const formatFocusTime = (sec: number) => {
    const mins = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const rem = (sec % 60).toString().padStart(2, "0");
    return `${mins}:${rem}`;
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch {
      navigate("/login");
    }
  };

  const getInitials = () => {
    if (!user) return "RG";
    return `${user.first_name?.[0] || "R"}${user.last_name?.[0] || "G"}`.toUpperCase();
  };

  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === "/dashboard") return { section: "Studio", sub: "Student Cockpit" };
    if (path === "/my-courses" || path === "/my-learning")
      return { section: "Studio", sub: "My Courses" };
    if (path === "/courses") return { section: "Studio", sub: "Explore Catalog" };
    if (path === "/calendar") return { section: "Studio", sub: "Calendar" };
    if (path === "/grades") return { section: "Studio", sub: "Grades" };
    if (path === "/interest-zone") return { section: "Studio", sub: "Interest Zone" };
    if (path === "/private-files") return { section: "Resources", sub: "Private Files" };
    if (path === "/learners") return { section: "ExcelR Operations", sub: "Learners Master" };
    if (path === "/assignments") return { section: "ExcelR Operations", sub: "Assignments" };
    if (path === "/projects") return { section: "ExcelR Operations", sub: "Projects & SLA" };
    if (path === "/certificates") return { section: "ExcelR Operations", sub: "Certificates" };
    if (path === "/reports") return { section: "ExcelR Operations", sub: "Reports" };
    if (path === "/integration-health")
      return { section: "ExcelR Operations", sub: "Integration Health" };
    return { section: "Learnova", sub: "AI Atelier" };
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card/90 px-4 md:px-6 backdrop-blur-md">
      {/* Left side: Hamburger & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-foreground"
          onClick={onOpenMobileMenu}
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="hover:text-foreground transition-colors">{breadcrumbs.section}</span>
          <span className="text-border">/</span>
          <span className="text-foreground font-bold">{breadcrumbs.sub}</span>
        </nav>
      </div>

      {/* Center: Interactive Command Palette Search Trigger */}
      <div className="hidden md:flex items-center w-full max-w-sm mx-4">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between pl-3 pr-2.5 py-1.5 bg-secondary/60 hover:bg-secondary border border-border rounded-xl text-xs text-muted-foreground transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2 truncate">
            <Search className="h-3.5 w-3.5 text-teal-600 shrink-0" />
            <span>Jump to courses, calendar, AI copilot...</span>
          </span>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-card rounded border border-border shrink-0">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right side: Focus Timer, Copilot, Theme, Notifications & Profile */}
      <div className="flex items-center gap-2 sm:gap-2.5 relative">
        {/* Live Focus Pomodoro Timer Pill */}
        <div
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/70 border border-border text-xs font-mono"
          title="Pomodoro Focus Timer"
        >
          <Clock className={`w-3.5 h-3.5 ${timerRunning ? "text-orange-500 animate-pulse" : "text-teal-600"}`} />
          <span className="font-semibold text-foreground">{formatFocusTime(focusSeconds)}</span>
          <button
            type="button"
            onClick={() => setTimerRunning((prev) => !prev)}
            className="p-0.5 rounded hover:bg-card text-foreground cursor-pointer"
            aria-label={timerRunning ? "Pause focus timer" : "Start focus timer"}
          >
            {timerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>
          <button
            type="button"
            onClick={() => {
              setTimerRunning(false);
              setFocusSeconds(25 * 60);
            }}
            className="p-0.5 rounded hover:bg-card text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Reset focus timer"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        {/* Learnova AI Copilot Button */}
        <button
          type="button"
          onClick={onOpenCopilot ? onOpenCopilot : () => navigate("/dashboard")}
          className="bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white text-xs font-bold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-[0_2px_0_0_#0f766e] transition-all cursor-pointer"
          title="Open AI Study Copilot (RAG · FAISS)"
        >
          <Sparkles className="h-3.5 w-3.5 text-teal-100" />
          <span>Learnova AI</span>
        </button>

        {/* Theme switcher */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Toggle Theme"
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
        >
          {theme === "dark" ? <Sun className="h-4 w-4 text-orange-400" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Interactive Notifications Popover */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Notifications"
            onClick={() => setNotifOpen((prev) => !prev)}
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
          >
            <Bell className="h-4 w-4" />
          </Button>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 flex items-center justify-center text-[9px] font-bold bg-orange-500 text-white rounded-full pointer-events-none">
              {unreadCount}
            </span>
          )}

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-2xl shadow-xl overflow-hidden z-50 animate-fade-in">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Studio Feed</span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                    Mark all read
                  </button>
                )}
              </div>
              <div className="divide-y divide-border max-h-72 overflow-y-auto">
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      setNotifications((prev) =>
                        prev.map((item) => (item.id === n.id ? { ...item, unread: false } : item))
                      );
                      setNotifOpen(false);
                      navigate(n.href);
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-secondary/70 transition-colors flex items-start gap-2.5 cursor-pointer ${
                      n.unread ? "bg-teal-500/5" : ""
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        n.unread ? "bg-orange-500" : "bg-muted-foreground/30"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{n.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{n.detail}</p>
                      <span className="text-[10px] font-mono text-muted-foreground/80 mt-1 block">
                        {n.time}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Auth / Profile initials circle */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-1.5 pl-1.5 border-l border-border">
            <Link
              to="/profile"
              title={user.full_name || "Profile"}
              className="w-8 h-8 rounded-full bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs flex items-center justify-center border border-border transition-colors"
            >
              {getInitials()}
            </Link>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Logout"
              className="h-8 w-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs">
                Sign In
              </Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
