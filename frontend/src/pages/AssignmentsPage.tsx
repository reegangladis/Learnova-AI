import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  RotateCcw,
  Save,
  Check,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { track360Service } from "@/services/track360Service";
import type { AssignmentBusinessStatus, AssignmentSubmission, BulkAssignmentUpdateItem } from "@/types/track360";

export const AssignmentsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  // Redo Note Modal State
  const [isRedoModalOpen, setIsRedoModalOpen] = useState(false);
  const [activeSubmission, setActiveSubmission] = useState<AssignmentSubmission | null>(null);
  const [redoNote, setRedoNote] = useState("");
  const [redoError, setRedoError] = useState<string | null>(null);

  // Bulk update feedback
  const [updateSuccessMsg, setUpdateSuccessMsg] = useState<string | null>(null);

  // Query submissions from Track360
  const { data, isLoading, isError } = useQuery({
    queryKey: ["excelr_assignments", selectedStatus, page],
    queryFn: () =>
      track360Service.getAssignments({
        status: selectedStatus === "ALL" ? undefined : selectedStatus,
        page,
        page_size: 25,
      }),
  });

  // Mutation for bulk status updates
  const updateMutation = useMutation({
    mutationFn: (items: BulkAssignmentUpdateItem[]) =>
      track360Service.bulkUpdateAssignments(items),
    onSuccess: (res) => {
      setUpdateSuccessMsg(`Successfully updated ${res.successful_count} assignment submission(s).`);
      queryClient.invalidateQueries({ queryKey: ["excelr_assignments"] });
      queryClient.invalidateQueries({ queryKey: ["excelr_operational_reports"] });
      setTimeout(() => setUpdateSuccessMsg(null), 4000);
    },
  });

  const handleStatusChange = (
    submission: AssignmentSubmission,
    newStatus: AssignmentBusinessStatus
  ) => {
    if (newStatus === "Redo") {
      setActiveSubmission(submission);
      setRedoNote(submission.evaluator_notes || "");
      setRedoError(null);
      setIsRedoModalOpen(true);
      return;
    }

    // Direct update for Done, Submitted, Not submitted
    updateMutation.mutate([
      {
        submission_id: submission.id,
        status: newStatus,
        awarded_score: newStatus === "Done" ? 100 : undefined,
      },
    ]);
  };

  const submitRedoNote = () => {
    if (!activeSubmission) return;
    const cleanNote = redoNote.trim();
    if (cleanNote.length < 5) {
      setRedoError("A meaningful evaluator note of at least 5 characters is mandatory when marking Redo.");
      return;
    }

    updateMutation.mutate([
      {
        submission_id: activeSubmission.id,
        status: "Redo",
        correction_note: cleanNote,
        evaluator_notes: cleanNote,
      },
    ]);
    setIsRedoModalOpen(false);
    setActiveSubmission(null);
    setRedoNote("");
  };

  const getStatusBadge = (status: AssignmentBusinessStatus) => {
    switch (status) {
      case "Done":
        return (
          <Badge variant="success" className="gap-1 py-0 text-[10px]">
            <CheckCircle2 className="h-3 w-3" />
            <span>Done</span>
          </Badge>
        );
      case "Submitted":
        return (
          <Badge variant="default" className="gap-1 py-0 text-[10px] bg-blue-600 text-white">
            <FileText className="h-3 w-3" />
            <span>Submitted</span>
          </Badge>
        );
      case "Redo":
        return (
          <Badge variant="warning" className="gap-1 py-0 text-[10px]">
            <RotateCcw className="h-3 w-3" />
            <span>Redo</span>
          </Badge>
        );
      case "Not submitted":
      default:
        return (
          <Badge variant="secondary" className="gap-1 py-0 text-[10px]">
            <Clock className="h-3 w-3" />
            <span>Not submitted</span>
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <FileText className="h-6 w-6 text-primary" />
            <span>ExcelR Assignment Review &amp; Evaluation Grid</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Authoritative evaluation states: <strong>Not submitted</strong>, <strong>Submitted</strong>, <strong>Redo</strong> (mandatory note), <strong>Done</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs px-2.5 py-1">
            Total Submissions: {data?.total || 4}
          </Badge>
        </div>
      </div>

      {updateSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{updateSuccessMsg}</span>
        </div>
      )}

      {/* Filter and Search Controls */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by candidate, code, or batch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" /> Status:
            </span>
            <div className="inline-flex rounded-lg bg-muted p-1 text-xs">
              {["ALL", "Done", "Submitted", "Redo", "Not submitted"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    setSelectedStatus(st);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    selectedStatus === st
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Spreadsheet Assignment Grid */}
      <Card className="bg-card border-border overflow-hidden">
        <CardHeader className="py-3 px-6 border-b border-border/60 bg-muted/30">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Evaluator Grading Grid (Track360 Synced)
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              Gating Rule: All mandatory assignments must be <strong>Done</strong> to unlock project allocation.
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b border-border/80 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Candidate</th>
                  <th className="py-3 px-4">Batch</th>
                  <th className="py-3 px-4">Assignment Code &amp; Title</th>
                  <th className="py-3 px-4">Authoritative Status</th>
                  <th className="py-3 px-4">Evaluator Feedback / Note</th>
                  <th className="py-3 px-4 text-right">Transition Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">
                      Loading authoritative assignment submissions...
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-rose-400 text-sm">
                      Failed to load assignment submissions from Track360.
                    </td>
                  </tr>
                ) : data?.items && data.items.length > 0 ? (
                  data.items
                    .filter((s) => {
                      if (!searchQuery) return true;
                      const q = searchQuery.toLowerCase();
                      return (
                        s.candidate_name.toLowerCase().includes(q) ||
                        s.candidate_number.toLowerCase().includes(q) ||
                        s.assignment_code.toLowerCase().includes(q) ||
                        (s.batch_code && s.batch_code.toLowerCase().includes(q))
                      );
                    })
                    .map((sub) => (
                      <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-semibold text-foreground text-xs">{sub.candidate_name}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">{sub.candidate_number}</p>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="secondary" className="font-mono text-[10px] py-0">
                            {sub.batch_code || "General"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs font-semibold text-primary">{sub.assignment_code}</span>
                          <p className="text-xs text-muted-foreground truncate max-w-xs">{sub.assignment_title}</p>
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(sub.current_submission_status)}</td>
                        <td className="py-3 px-4">
                          {sub.evaluator_notes ? (
                            <p className="text-xs text-foreground bg-muted/40 p-2 rounded-lg border border-border/40 max-w-sm">
                              {sub.evaluator_notes}
                            </p>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">No evaluator feedback</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <Button
                              variant={sub.current_submission_status === "Done" ? "primary" : "outline"}
                              size="sm"
                              onClick={() => handleStatusChange(sub, "Done")}
                              className="h-7 text-xs px-2.5 gap-1"
                              disabled={updateMutation.isPending}
                            >
                              <Check className="h-3 w-3" />
                              <span>Done</span>
                            </Button>

                            <Button
                              variant={sub.current_submission_status === "Redo" ? "secondary" : "outline"}
                              size="sm"
                              onClick={() => handleStatusChange(sub, "Redo")}
                              className="h-7 text-xs px-2.5 gap-1 text-amber-500 hover:text-amber-600"
                              disabled={updateMutation.isPending}
                            >
                              <RotateCcw className="h-3 w-3" />
                              <span>Redo</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      No assignment records match the selected status filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Mandatory Redo Evaluator Note Modal */}
      <Dialog
        isOpen={isRedoModalOpen}
        onClose={() => setIsRedoModalOpen(false)}
        title="Mandatory Evaluator Note (Redo)"
        description="ExcelR Track360 business rules mandate an evaluator feedback note explaining the required correction to the learner (minimum 5 characters)."
      >
        <div className="space-y-4 py-2">
          <div className="p-2.5 rounded-lg bg-muted text-xs font-mono">
            <p><strong>Learner:</strong> {activeSubmission?.candidate_name} ({activeSubmission?.candidate_number})</p>
            <p><strong>Assignment:</strong> {activeSubmission?.assignment_code} - {activeSubmission?.assignment_title}</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Evaluator Correction Instructions *
            </label>
            <textarea
              rows={4}
              value={redoNote}
              onChange={(e) => {
                setRedoNote(e.target.value);
                setRedoError(null);
              }}
              placeholder="Detail what specific criteria failed and instructions for revision..."
              className="w-full p-2.5 rounded-lg border border-border bg-background text-xs focus:ring-1 focus:ring-primary outline-hidden"
            />
            <span className="text-[10px] text-muted-foreground float-right">
              {redoNote.trim().length} characters (min 5)
            </span>
          </div>

          {redoError && (
            <p className="text-xs text-rose-500 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{redoError}</span>
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="ghost" size="sm" onClick={() => setIsRedoModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={submitRedoNote}
              disabled={redoNote.trim().length < 5}
              className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Submit Redo Transition</span>
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

