import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/navigation/Sidebar";
import { Navbar } from "@/components/navigation/Navbar";
import { CommandPaletteModal } from "@/components/navigation/CommandPaletteModal";
import { GlobalAICopilotModal } from "@/components/ai/GlobalAICopilotModal";
import { Sparkles } from "lucide-react";

export function DashboardLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const handleOpenCopilot = () => setIsCopilotOpen(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("open-ai-copilot", handleOpenCopilot);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("open-ai-copilot", handleOpenCopilot);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex relative">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        onOpenCopilot={() => setIsCopilotOpen(true)}
      />

      {/* Main Content Area */}
      <div
        className={`flex flex-1 flex-col transition-all duration-200 ${
          sidebarCollapsed ? "md:pl-20" : "md:pl-64"
        }`}
      >
        <Navbar
          onOpenMobileMenu={() => setMobileSidebarOpen(true)}
          onOpenCopilot={() => setIsCopilotOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />

        <main className="flex-1 p-4 md:p-7 max-w-7xl w-full mx-auto animate-fade-in">
          <Outlet />
        </main>

        <footer className="border-t border-border bg-card/50 py-4 px-6 text-center text-xs text-muted-foreground">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>© 2026 Learnova AI. &ldquo;Learn Smarter. Learn Personally. Learn with AI.&rdquo;</span>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span>Studio Atelier UI</span>
              <span>·</span>
              <span>RAG + FAISS</span>
              <span>·</span>
              <span>Adaptive ML</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Floating Learnova AI Copilot Trigger Button */}
      <button
        type="button"
        onClick={() => setIsCopilotOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-foreground hover:bg-foreground/90 text-background px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 text-xs font-bold hover:scale-105 active:scale-95 transition-all border border-border cursor-pointer group"
        title="Open Learnova AI Study Copilot (1,240+ Chunks Indexed)"
      >
        <Sparkles className="w-4 h-4 text-teal-400 group-hover:rotate-12 transition-transform" />
        <span>Ask Learnova AI</span>
        <span className="text-[10px] font-mono bg-teal-600 text-white px-1.5 py-0.5 rounded-full">
          RAG
        </span>
      </button>

      {/* Command Palette (Ctrl+K) */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenCopilot={() => setIsCopilotOpen(true)}
      />

      {/* Global AI Study Copilot Modal */}
      <GlobalAICopilotModal
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
      />
    </div>
  );
}
