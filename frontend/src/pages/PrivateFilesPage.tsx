import { FileText, Upload, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function PrivateFilesPage() {
  const files = [
    { name: "Assignment_1_Submission_Draft.pdf", size: "2.4 MB", date: "20 Nov 2026" },
    { name: "Python_DataStructures_Cheatsheet.pdf", size: "1.1 MB", date: "15 Nov 2026" },
    { name: "Final_Capstone_Project_Proposal.docx", size: "840 KB", date: "10 Nov 2026" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="bg-gradient-to-r from-[#0C3E56] via-[#093043] to-[#072433] rounded-2xl p-6 sm:p-8 text-white shadow-md border border-[#144E6D]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-sm">
            Resources
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
            Private Files
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Secure cloud storage for your personal course notes and assignment drafts.
          </p>
        </div>

        <Button className="bg-[#E59819] hover:bg-[#D48810] text-slate-950 font-bold text-xs gap-1.5 shrink-0">
          <Upload className="w-4 h-4" />
          <span>Upload File</span>
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">Your Storage (3 files)</span>
          <span className="text-[11px] text-slate-400">4.3 MB of 100 MB used</span>
        </div>

        <div className="divide-y divide-slate-100">
          {files.map((file, idx) => (
            <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{file.name}</h4>
                  <p className="text-[10px] text-slate-400">{file.size} · Uploaded {file.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-600 hover:text-slate-900">
                  <Download className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-rose-600">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
