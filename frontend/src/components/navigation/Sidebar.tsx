import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  Activity,
  GraduationCap,
  Home,
  User,
  Key,
  Users,
  Layers,
  Tag,
  PlusCircle,
  ShieldCheck,
  HelpCircle,
  BarChart3,
  TrendingUp,
  FolderKanban,
  Award,
  Server,
  CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/hooks/useAuth";

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { user, isAuthenticated, hasRole } = useAuth();

  const navigation = [
    {
      title: "Learning Platform",
      items: [
        { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
        ...(isAuthenticated
          ? [
              { name: "My Learning", href: "/my-learning", icon: GraduationCap },
              { name: "Learning Analytics", href: "/analytics/student", icon: TrendingUp },
            ]
          : []),
        { name: "Courses Catalog", href: "/courses", icon: BookOpen },
        { name: "Showcase Landing", href: "/", icon: Home },
      ],
    },
    ...(isAuthenticated
      ? [
          {
            title: "ExcelR Operations (Track360)",
            items: [
              { name: "Learners Master", href: "/learners", icon: Users, badge: "Master" },
              { name: "Assignments", href: "/assignments", icon: CheckSquare, badge: "Grading" },
              { name: "Projects & SLA", href: "/projects", icon: FolderKanban, badge: "15d SLA" },
              { name: "Certificates", href: "/certificates", icon: Award, badge: "2-Stage" },
              { name: "Operational Reports", href: "/reports", icon: BarChart3, badge: "Sync" },
            ],
          },
        ]
      : []),
    ...(isAuthenticated && hasRole("INSTRUCTOR", "ADMIN", "SUPER_ADMIN")
      ? [
          {
            title: "Authoring Studio",
            items: [
              { name: "Instructor Studio", href: "/instructor/courses", icon: Layers },
              { name: "Instructor Analytics", href: "/instructor/analytics", icon: BarChart3 },
              { name: "Create Course", href: "/instructor/courses/new", icon: PlusCircle },
              { name: "Quizzes", href: "/instructor/quizzes", icon: HelpCircle },
            ],
          },
        ]
      : []),
    ...(isAuthenticated && hasRole("ADMIN", "SUPER_ADMIN")
      ? [
          {
            title: "Administration",
            items: [
              { name: "User Management", href: "/admin/users", icon: Users, badge: "RBAC" },
              { name: "Admin Analytics", href: "/admin/analytics", icon: BarChart3, badge: "Metrics" },
              { name: "Course Categories", href: "/admin/categories", icon: Tag },
            ],
          },
        ]
      : []),
    {
      title: "System & Integration",
      items: [
        { name: "Track360 Integration", href: "/integration-health", icon: Activity, badge: "Live" },
        { name: "System Services", href: "/status", icon: Server },
      ],
    },
    ...(isAuthenticated
      ? [
          {
            title: "Identity & Security",
            items: [
              { name: "My Profile", href: "/profile", icon: User },
              { name: "Security & Sessions", href: "/security", icon: Key },
            ],
          },
        ]
      : []),
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card transition-transform duration-200 ease-in-out md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center gap-3 border-b border-border px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-foreground flex items-center gap-1.5">
              ExcelR <span className="text-primary font-black">Learnova</span>
            </span>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
              Learning &amp; Progress
            </p>
          </div>
        </div>

        {/* User Identity Pill (if logged in) */}
        {isAuthenticated && user && (
          <div className="px-4 pt-4">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 font-bold text-xs flex items-center justify-center">
                {user.first_name?.[0]}
                {user.last_name?.[0]}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-white truncate">{user.full_name}</p>
                <p className="text-[10px] text-slate-400 font-mono truncate">{user.roles[0] || "STUDENT"}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navigation.map((section, idx) => (
            <div key={idx} className="space-y-1.5">
              {section.title && (
                <p className="px-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {section.title}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = location.pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={cn("h-4 w-4", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                        <span>{item.name}</span>
                      </div>
                      {item.badge && (
                        <Badge
                          variant={isActive ? "secondary" : "default"}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Architectural Footer Pill */}
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="rounded-lg border border-border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                Track360 Synced
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">v1.0-ExcelR</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>Operational Master</span>
              <span>•</span>
              <span className="text-emerald-500 font-medium">Authoritative</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
