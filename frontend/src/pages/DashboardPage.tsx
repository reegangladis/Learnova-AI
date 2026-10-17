import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { StudentAnalyticsDashboard } from "@/pages/StudentAnalyticsDashboard";
import { InstructorAnalyticsDashboard } from "@/pages/InstructorAnalyticsDashboard";
import { AdminAnalyticsDashboard } from "@/pages/AdminAnalyticsDashboard";
import { ShieldCheck, Layers, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/Button";

type DashboardRoleView = "admin" | "instructor" | "student";

export function DashboardPage() {
  const { hasRole } = useAuth();

  const canViewAdmin = hasRole("ADMIN", "SUPER_ADMIN");
  const canViewInstructor = hasRole("INSTRUCTOR", "ADMIN", "SUPER_ADMIN");
  const hasMultipleViews = canViewAdmin || canViewInstructor;

  const defaultRoleView: DashboardRoleView = canViewAdmin
    ? "admin"
    : canViewInstructor
    ? "instructor"
    : "student";

  const [selectedView, setSelectedView] = useState<DashboardRoleView | null>(null);
  const activeView = selectedView ?? defaultRoleView;

  return (
    <div className="space-y-6">
      {/* Role View Switcher for Multi-Role Accounts */}
      {hasMultipleViews && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-xl bg-card border border-border/80 shadow-xs">
          <div className="flex items-center gap-2 pl-2 text-xs font-semibold text-muted-foreground">
            <span>Viewing Dashboard as:</span>
          </div>

          <div className="inline-flex rounded-lg bg-muted p-1 gap-1 text-xs" role="tablist">
            {canViewAdmin && (
              <Button
                variant={activeView === "admin" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setSelectedView("admin")}
                className="h-7 px-3 text-xs gap-1.5"
                role="tab"
                aria-selected={activeView === "admin"}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Admin</span>
              </Button>
            )}

            {canViewInstructor && (
              <Button
                variant={activeView === "instructor" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setSelectedView("instructor")}
                className="h-7 px-3 text-xs gap-1.5"
                role="tab"
                aria-selected={activeView === "instructor"}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Instructor</span>
              </Button>
            )}

            <Button
              variant={activeView === "student" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setSelectedView("student")}
              className="h-7 px-3 text-xs gap-1.5"
              role="tab"
              aria-selected={activeView === "student"}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              <span>Student</span>
            </Button>
          </div>
        </div>
      )}

      {/* Render Active Dashboard */}
      {activeView === "admin" && canViewAdmin ? (
        <AdminAnalyticsDashboard />
      ) : activeView === "instructor" && canViewInstructor ? (
        <InstructorAnalyticsDashboard />
      ) : (
        <StudentAnalyticsDashboard />
      )}
    </div>
  );
}
