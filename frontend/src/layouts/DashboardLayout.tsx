import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/navigation/Sidebar";
import { Navbar } from "@/components/navigation/Navbar";
import { GlobalAICopilotModal } from "@/components/ai/GlobalAICopilotModal";
import { Sparkles } from "lucide-react";

export function DashboardLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  useEffect(() => {
    const handleOpenCopilot = () => setIsCopilotOpen(true);
    window.addEventListener("open-ai-copilot", handleOpenCopilot);
    return () => window.removeEventListener("open-ai-copilot", handleOpenCopilot);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex relative">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col md:pl-64">
        <Navbar
          onOpenMobileMenu={() => setMobileSidebarOpen(true)}
          onOpenCopilot={() => setIsCopilotOpen(true)}
        />

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

      {/* Floating Learnova AI Copilot Trigger Button */}
      <button
        type="button"
        onClick={() => setIsCopilotOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-4 py-2.5 rounded-full shadow-lg shadow-indigo-500/30 flex items-center gap-2 text-xs font-bold hover:scale-105 active:scale-95 transition-all border border-indigo-400/40 backdrop-blur-md cursor-pointer group"
        title="Open Learnova AI Study Copilot (1,000+ Chunks Indexed)"
      >
        <Sparkles className="w-4 h-4 text-cyan-300 animate-pulse group-hover:rotate-12 transition-transform" />
        <span>Ask Learnova AI</span>
        <span className="text-[10px] font-mono bg-black/30 text-cyan-200 px-1.5 py-0.5 rounded-full border border-cyan-400/30">
          RAG
        </span>
      </button>

      {/* Global AI Study Copilot Modal */}
      <GlobalAICopilotModal
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
      />
    </div>
  );
}
