import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  Award,
  Sparkles,
  FolderKanban,
  Users,
  CheckSquare,
  Layers,
  BarChart3,
  Activity,
  PlusCircle,
  HelpCircle,
  User,
  Key,
  LifeBuoy,
  Tag,
  Server,
  GraduationCap,
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
      title: "Navigation",
      items: [
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { name: "My Courses", href: "/my-courses", icon: BookOpen },
        { name: "Calendar", href: "/calendar", icon: Calendar },
        { name: "Grades", href: "/grades", icon: Award },
        { name: "Interest Zone", href: "/interest-zone", icon: Sparkles },
      ],
    },
    {
      title: "RESOURCES",
      items: [
        { name: "Private Files", href: "/private-files", icon: FolderKanban },
      ],
    },
    // ExcelR Operations (Track360) - PRESERVED UNTOUCHED AS REQUESTED
    ...(isAuthenticated
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
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container (Deep Petrol Blue matching Screenshot 4) */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-40 flex w-64 flex-col border-r border-[#0D3B52] bg-[#072331] text-slate-300 transition-transform duration-200 ease-in-out md:translate-x-0 shadow-xl",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center gap-3 border-b border-[#0D3B52]/80 px-6 bg-[#061F2C]">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-amber-400 border border-white/10 shadow-xs">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
              Learnova
            </span>
            <p className="text-[10px] text-amber-400/80 uppercase tracking-widest font-semibold">
              Online LMS
            </p>
          </div>
        </div>

        {/* User Identity Pill (if logged in) */}
        {isAuthenticated && user && (
          <div className="px-4 pt-3.5 pb-1">
            <div className="p-2.5 rounded-xl bg-[#092D3E] border border-[#0F4A68]/60 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#0E4663] text-amber-300 font-bold text-xs flex items-center justify-center border border-[#165E85]">
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
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {navigation.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {section.title && (
                <p className="px-3 text-[10px] font-bold text-slate-400/80 uppercase tracking-wider">
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
                      className={cn(
                        "flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                        isActive
                          ? "bg-[#0F4C6B] text-white shadow-xs font-semibold border-l-2 border-[#E59819]"
                          : "text-slate-300 hover:bg-[#0A3246] hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={cn("h-4 w-4", isActive ? "text-amber-400" : "text-slate-400")} />
                        <span>{item.name}</span>
                      </div>
                      {item.badge && (
                        <Badge
                          variant={isActive ? "secondary" : "default"}
                          className="text-[9px] px-1.5 py-0 h-4 bg-amber-500/20 text-amber-300 border-amber-500/30"
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

        {/* Bottom "Need help?" Pill Button (Matching Screenshot 4) */}
        <div className="p-4 border-t border-[#0D3B52]/80 bg-[#061F2C]">
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 py-2 px-3.5 rounded-full bg-[#E59819] hover:bg-[#D48810] text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <LifeBuoy className="h-4 w-4" />
            <span>Need help?</span>
          </button>
        </div>
      </aside>
    </>
  );
}
