import { NavLink, useLocation } from "react-router-dom";
import {
  Activity,
  Award,
  BarChart3,
  BookOpen,
  Calendar,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Compass,
  FolderKanban,
  GraduationCap,
  HelpCircle,
  Key,
  Layers,
  LayoutDashboard,
  PlusCircle,
  Server,
  Sparkles,
  Tag,
  User,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/hooks/useAuth";

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenCopilot?: () => void;
}

export function Sidebar({
  isOpen,
  onClose,
  collapsed = false,
  onToggleCollapse,
  onOpenCopilot,
}: SidebarProps) {
  const location = useLocation();
  const { user, isAuthenticated, hasRole } = useAuth();

  // ExcelR Operations (Track360) is hidden for student-only users
  const isStudentOnly =
    isAuthenticated &&
    !hasRole("ADMIN", "SUPER_ADMIN", "INSTRUCTOR") &&
    Boolean(user?.roles?.every((r) => r.toUpperCase() === "STUDENT"));

  const navigation = [
    {
      title: "Learning Studio",
      items: [
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { name: "Course Catalog", href: "/courses", icon: Compass },
        { name: "My Courses", href: "/my-courses", icon: BookOpen },
        { name: "Calendar", href: "/calendar", icon: Calendar },
        { name: "Grades", href: "/grades", icon: Award },
        { name: "Interest Zone", href: "/interest-zone", icon: Sparkles },
      ],
    },
    {
      title: "Resources",
      items: [{ name: "Private Files", href: "/private-files", icon: FolderKanban }],
    },
    // ExcelR Operations (Track360) - Visible for Staff/Admin/Instructor, hidden for students
    ...(isAuthenticated && !isStudentOnly
      ? [
          {
            title: "ExcelR Operations (Track360)",
            items: [
              { name: "Learners Master", href: "/learners", icon: Users, badge: "Master" },
              { name: "Assignments", href: "/assignments", icon: CheckSquare, badge: "Grading" },
              { name: "Projects & SLA", href: "/projects", icon: Layers, badge: "15d SLA" },
              { name: "Certificates", href: "/certificates", icon: Award, badge: "2-Stage" },
              { name: "Operational Reports", href: "/reports", icon: BarChart3, badge: "Sync" },
              { name: "Track360 Integration", href: "/integration-health", icon: Activity, badge: "Live" },
            ],
          },
        ]
      : []),
    // Authoring Studio for Instructors & Admins
    ...(isAuthenticated && hasRole("INSTRUCTOR", "ADMIN", "SUPER_ADMIN")
      ? [
          {
            title: "Authoring Studio",
            items: [
              { name: "Instructor Studio", href: "/instructor/courses", icon: Layers },
              { name: "Create Course", href: "/instructor/courses/new", icon: PlusCircle },
              { name: "Quizzes", href: "/instructor/quizzes", icon: HelpCircle },
            ],
          },
        ]
      : []),
    // Administration
    ...(isAuthenticated && hasRole("ADMIN", "SUPER_ADMIN")
      ? [
          {
            title: "Administration",
            items: [
              { name: "User Management", href: "/admin/users", icon: Users, badge: "RBAC" },
              { name: "Course Categories", href: "/admin/categories", icon: Tag },
              { name: "System Services", href: "/status", icon: Server },
            ],
          },
        ]
      : []),
    // Account & Security
    ...(isAuthenticated
      ? [
          {
            title: "Identity & Account",
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
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
          onClick={onClose}
        />
      )}

      {/* Atelier Light/Dark Adaptive Studio Rail */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-40 flex flex-col border-r border-border bg-card text-foreground transition-all duration-200 ease-in-out md:translate-x-0 shadow-sm",
          collapsed ? "md:w-20 w-64" : "w-64",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <div className={cn("flex items-center gap-2.5 overflow-hidden", collapsed && "md:mx-auto")}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-[0_2px_0_0_#0f766e]">
              <GraduationCap className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="truncate">
                <span className="font-display font-bold text-lg tracking-tight text-foreground block leading-none">
                  Learnova
                </span>
                <p className="text-[10px] font-mono text-teal-700 dark:text-teal-400 uppercase tracking-widest mt-1">
                  AI Atelier
                </p>
              </div>
            )}
          </div>

          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden md:flex w-6 h-6 items-center justify-center rounded-lg border border-border bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* User Identity Card */}
        {isAuthenticated && user && (
          <div className="px-3 pt-3.5 pb-1">
            <div
              className={cn(
                "p-2.5 rounded-xl bg-secondary/60 border border-border flex items-center gap-2.5",
                collapsed && "md:justify-center md:px-1.5"
              )}
            >
              <div className="w-8 h-8 shrink-0 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center">
                {user.first_name?.[0]}
                {user.last_name?.[0]}
              </div>
              {!collapsed && (
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-foreground truncate">{user.full_name}</p>
                  <p className="text-[10px] text-teal-700 dark:text-teal-400 font-mono truncate">
                    {user.roles[0] || "STUDENT"}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
          {navigation.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {section.title && !collapsed && (
                <p className="px-3 text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive =
                    location.pathname === item.href ||
                    (item.href === "/my-courses" && location.pathname === "/my-learning");
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      onClick={onClose}
                      title={collapsed ? item.name : undefined}
                      className={cn(
                        "flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all",
                        collapsed && "md:justify-center md:px-2",
                        isActive
                          ? "bg-teal-500/12 text-teal-800 dark:text-teal-300 border border-teal-500/25 shadow-xs"
                          : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground border border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            isActive ? "text-teal-600 dark:text-teal-400" : "text-muted-foreground"
                          )}
                        />
                        {!collapsed && <span className="truncate">{item.name}</span>}
                      </div>
                      {!collapsed && item.badge && (
                        <Badge
                          variant={isActive ? "secondary" : "default"}
                          className="text-[9px] px-1.5 py-0 h-4 bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/25"
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

        {/* Bottom Interactive Copilot Quick Action */}
        <div className="p-3 border-t border-border bg-secondary/30">
          <button
            type="button"
            onClick={() => {
              onClose?.();
              if (onOpenCopilot) {
                onOpenCopilot();
              } else {
                window.dispatchEvent(new CustomEvent("open-ai-copilot"));
              }
            }}
            title="Launch Learnova AI Copilot"
            className={cn(
              "w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-[0_2px_0_0_#0f766e] transition-all cursor-pointer",
              collapsed && "md:px-0"
            )}
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            {!collapsed && <span>AI Study Copilot</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
