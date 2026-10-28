import { Link, useNavigate } from "react-router-dom";
import {
  Menu,
  Sun,
  Moon,
  Sparkles,
  BookOpen,
  ExternalLink,
  LogOut,
  Key,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/hooks/useTheme";
import { useSystemHealth } from "@/hooks/useSystemHealth";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/Badge";

interface NavbarProps {
  onOpenMobileMenu: () => void;
}

export function Navbar({ onOpenMobileMenu }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { backendHealth } = useSystemHealth();
  const { user, isAuthenticated, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  const isHealthy = backendHealth?.status === "ok";

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch {
      navigate("/login");
    }
  };

  const getInitials = () => {
    if (!user) return "U";
    return `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-background/95 px-4 md:px-8 backdrop-blur-md">
      {/* Left side: Hamburger & Title */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onOpenMobileMenu}
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="hidden sm:flex items-center gap-3">
          <Link
            to="/status"
            className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isHealthy ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <span>System:</span>
            <Badge variant={isHealthy ? "success" : "warning"} className="text-[10px] py-0">
              {isHealthy ? "Operational" : "Checking..."}
            </Badge>
          </Link>

          <span className="text-muted-foreground/40">•</span>

          <Link
            to="/integration-health"
            className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
            <span>Track360:</span>
            <Badge variant="outline" className="text-[10px] py-0 border-indigo-500/40 text-indigo-400">
              Synced
            </Badge>
          </Link>
        </div>
      </div>

      {/* Right side: Actions & Auth */}
      <div className="flex items-center gap-3">
        {/* Swagger API Docs link */}
        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noreferrer"
          className="hidden lg:inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md hover:bg-muted transition-colors"
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>API Docs (Swagger)</span>
          <ExternalLink className="h-3 w-3 opacity-60" />
        </a>

        {/* Theme switcher */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Toggle Theme"
          className="h-9 w-9 text-muted-foreground hover:text-foreground"
        >
          {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
        </Button>

        {/* Auth Buttons or User Profile Badge */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-3">
            {hasRole("ADMIN", "SUPER_ADMIN") && (
              <Link to="/admin/users" className="hidden sm:inline-flex">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Users className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Admin Users</span>
                </Button>
              </Link>
            )}

            <Link
              to="/profile"
              className="flex items-center gap-2.5 px-2.5 py-1 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                {getInitials()}
              </div>
              <div className="hidden sm:block text-left">
                <span className="text-xs font-semibold block text-white leading-tight">
                  {user.first_name}
                </span>
                <span className="text-[10px] text-indigo-400 font-mono">
                  {user.roles[0] || "STUDENT"}
                </span>
              </div>
            </Link>

            <Link to="/security" title="Security & Sessions" className="hidden sm:inline-flex">
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
                <Key className="h-4 w-4" />
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-rose-400 gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="gap-1.5 shadow-xs">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Get Started</span>
              </Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
