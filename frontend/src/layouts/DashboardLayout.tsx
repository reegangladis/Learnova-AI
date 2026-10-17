import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/navigation/Sidebar";
import { Navbar } from "@/components/navigation/Navbar";

export function DashboardLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col md:pl-64">
        <Navbar onOpenMobileMenu={() => setMobileSidebarOpen(true)} />

        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          <Outlet />
        </main>

        <footer className="border-t border-border bg-card/50 py-4 px-6 text-center text-xs text-muted-foreground">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>© 2026 Learnova AI. "Learn Smarter. Learn Personally. Learn with AI."</span>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span>FastAPI Backend</span>
              <span>•</span>
              <span>PostgreSQL 16</span>
              <span>•</span>
              <span>Redis 7</span>
              <span>•</span>
              <span>React 18</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
