import { useState } from "react";
import { Download, FileText, Plus, Search, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface StoredFileItem {
  id: string;
  name: string;
  size: string;
  date: string;
  courseTag: string;
}

const INITIAL_FILES: StoredFileItem[] = [
  {
    id: "f-1",
    name: "Kubernetes_HPA_Architecture_Notes.pdf",
    size: "2.4 MB",
    date: "20 Nov 2026",
    courseTag: "Cloud & DevOps",
  },
  {
    id: "f-2",
    name: "FAISS_RAG_Prompt_Engineering_Guide.pdf",
    size: "1.6 MB",
    date: "18 Nov 2026",
    courseTag: "Enterprise AI",
  },
  {
    id: "f-3",
    name: "PySpark_Catalyst_Optimization_Summary.docx",
    size: "840 KB",
    date: "15 Nov 2026",
    courseTag: "Python & Data",
  },
];

export function PrivateFilesPage() {
  const [files, setFiles] = useState<StoredFileItem[]>(INITIAL_FILES);
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const visibleFiles = files.filter((f) =>
    f.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  const handleAddMockFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const cleaned = newName.trim().includes(".") ? newName.trim() : `${newName.trim()}.md`;
    setFiles((prev) => [
      {
        id: `f-${Date.now()}`,
        name: cleaned,
        size: "420 KB",
        date: "Today",
        courseTag: "Study Vault",
      },
      ...prev,
    ]);
    setNewName("");
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="studio-card border-t-4 border-t-teal-600 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300 bg-teal-500/10 border border-teal-500/20 px-2.5 py-0.5 rounded-full">
            Study Vault
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Private Files
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Personal study cheatsheets, slide summaries, and capstone drafts.
          </p>
        </div>

        <Button
          onClick={() => setShowAddForm((v) => !v)}
          className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs gap-1.5 rounded-xl shrink-0 shadow-[0_2px_0_0_#0f766e]"
        >
          <Upload className="w-4 h-4" />
          <span>{showAddForm ? "Cancel" : "Add Study File"}</span>
        </Button>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleAddMockFile}
          className="studio-card p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 animate-fade-in"
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Zero_Trust_mTLS_Checklist.md"
            className="flex-1 px-3.5 py-2 bg-background border border-input rounded-xl text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/40"
          />
          <Button type="submit" size="sm" className="bg-teal-600 hover:bg-teal-700 text-white text-xs gap-1.5 rounded-xl">
            <Plus className="w-3.5 h-3.5" />
            Save to Vault
          </Button>
        </form>
      )}

      <div className="studio-card overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-foreground">
              Your Storage ({visibleFiles.length} files)
            </span>
            <span className="text-[11px] font-mono text-muted-foreground">
              {(files.length * 1.4).toFixed(1)} MB of 100 MB used
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter files..."
              className="w-full pl-8 pr-3 py-1.5 bg-background border border-input rounded-xl text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/40"
            />
          </div>
        </div>

        {visibleFiles.length === 0 ? (
          <div className="p-10 text-center text-xs text-muted-foreground">
            No files match your filter. Click &ldquo;Add Study File&rdquo; to create an entry.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {visibleFiles.map((file) => (
              <div
                key={file.id}
                className="p-4 flex items-center justify-between hover:bg-secondary/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-foreground truncate">{file.name}</h4>
                    <p className="text-[11px] font-mono text-muted-foreground">
                      {file.courseTag} · {file.size} · Uploaded {file.date}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Download placeholder"
                    onClick={() => {
                      const blob = new Blob([`Learnova Study Vault Item: ${file.name}\nCourse: ${file.courseTag}\n`], {
                        type: "text/plain",
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = file.name.replace(/\.[^.]+$/, "") + ".txt";
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Remove file"
                    onClick={() => setFiles((prev) => prev.filter((item) => item.id !== file.id))}
                    className="h-8 w-8 text-muted-foreground hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
