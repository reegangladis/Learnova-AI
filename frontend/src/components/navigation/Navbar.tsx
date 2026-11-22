import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Menu,
  Sun,
  Moon,
  Sparkles,
  LogOut,
  Bell,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/Badge";

interface NavbarProps {
  onOpenMobileMenu: () => void;
}

export function Navbar({ onOpenMobileMenu }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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

  // Derive breadcrumbs from path
  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === "/dashboard") return { section: "Dashboard", sub: "Semester 1" };
    if (path === "/my-courses" || path === "/my-learning") return { section: "Dashboard", sub: "My courses" };
    if (path === "/calendar") return { section: "Dashboard", sub: "Calendar" };
    if (path === "/grades") return { section: "Dashboard", sub: "Grades" };
    if (path === "/learners") return { section: "ExcelR Operations", sub: "Learners Master" };
    if (path === "/assignments") return { section: "ExcelR Operations", sub: "Assignments" };
    if (path === "/projects") return { section: "ExcelR Operations", sub: "Projects & SLA" };
    if (path === "/certificates") return { section: "ExcelR Operations", sub: "Certificates" };
    if (path === "/reports") return { section: "ExcelR Operations", sub: "Reports" };
    if (path === "/integration-health") return { section: "ExcelR Operations", sub: "Integration Health" };
    return { section: "Learnova", sub: "Platform" };
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 md:px-6 backdrop-blur-md">
      {/* Left side: Hamburger & Breadcrumbs (Screenshot 4) */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-slate-700"
          onClick={onOpenMobileMenu}
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <span className="hover:text-slate-900 transition-colors">{breadcrumbs.section}</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-semibold">{breadcrumbs.sub}</span>
        </nav>
      </div>

      {/* Center: Universal Course Search Input */}
      <div className="hidden md:flex items-center w-full max-w-sm mx-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search courses, modules, slide decks... /"
            className="w-full pl-9 pr-12 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 rounded border border-slate-200">
            Ctrl+K
          </kbd>
        </div>
      </div>

      {/* Right side: Actions & User Avatar */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Learnova AI Assistant Pill Button */}
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.98] text-white text-xs font-semibold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 transition-all"
        >
          <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
          <span>Learnova AI</span>
        </button>

        {/* Theme switcher */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Toggle Theme"
          className="h-8 w-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
        >
          {theme === "dark" ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Notifications with Count Badge (Screenshot 4: 255) */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Notifications"
            className="h-8 w-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          >
            <Bell className="h-4 w-4" />
          </Button>
          <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 flex items-center justify-center text-[9px] font-bold bg-rose-500 text-white rounded-full">
            255
          </Badge>
        </div>

        {/* Auth / Profile initials circle */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2 pl-1 border-l border-slate-200">
            <Link
              to="/profile"
              title={user.full_name || "Profile"}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center border border-slate-300 transition-colors"
            >
              {getInitials()}
            </Link>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Logout"
              className="h-8 w-8 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button size="sm" className="bg-[#E59819] hover:bg-[#D48810] text-slate-950 font-bold text-xs">
                Sign In
              </Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
