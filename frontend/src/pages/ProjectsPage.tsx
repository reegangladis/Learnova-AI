import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FolderKanban,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Users,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { track360Service } from "@/services/track360Service";
import type { ProjectGroup } from "@/types/track360";

export const ProjectsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"queue" | "groups">("queue");
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  // Dropped Project Modal State
  const [isDropModalOpen, setIsDropModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ProjectGroup | null>(null);
  const [dropReason, setDropReason] = useState("");
  const [dropError, setDropError] = useState<string | null>(null);

  // Fetch Project Queue
  const { data: queueData, isLoading: isQueueLoading } = useQuery({
    queryKey: ["excelr_project_queue", onlyOverdue],
    queryFn: () => track360Service.getProjectQueue({ only_overdue: onlyOverdue }),
  });

  // Fetch Project Groups
  const { data: groupsData, isLoading: isGroupsLoading } = useQuery({
    queryKey: ["excelr_project_groups"],
    queryFn: () => track360Service.getProjectGroups(),
  });

  // Drop Project Mutation
  const dropMutation = useMutation({
    mutationFn: ({ groupId, dropReason }: { groupId: string; dropReason: string }) =>
      track360Service.dropProject(groupId, "00000000-0000-0000-0000-000000000001", dropReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["excelr_project_groups"] });
      queryClient.invalidateQueries({ queryKey: ["excelr_operational_reports"] });
      setIsDropModalOpen(false);
      setSelectedGroup(null);
      setDropReason("");
    },
  });

  const handleOpenDrop = (group: ProjectGroup) => {
    setSelectedGroup(group);
    setDropReason("");
    setDropError(null);
    setIsDropModalOpen(true);
  };

  const handleConfirmDrop = () => {
    if (!selectedGroup) return;
    const cleanReason = dropReason.trim();
    if (cleanReason.length < 10) {
      setDropError("A formal coordinator justification reason of at least 10 characters is mandatory.");
      return;
    }
    dropMutation.mutate({ groupId: selectedGroup.id, dropReason: cleanReason });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <FolderKanban className="h-6 w-6 text-primary" />
            <span>ExcelR Project Allocation &amp; Progress Hub</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            15-business-day SLA monitoring, dynamic group formation, and dropped-project audit logging.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex rounded-xl bg-muted p-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("queue")}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "queue"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Allocation Queue ({queueData?.total || 2})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("groups")}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "groups"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Active Groups ({groupsData?.total || 3})</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Allocation Queue */}
      {activeTab === "queue" && (
        <div className="space-y-4">
          {/* SLA Overview KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase">SLA Target</span>
                  <p className="text-xl font-bold text-foreground mt-0.5">&le; 15 Business Days</p>
                </div>
                <Clock className="h-8 w-8 text-primary/40" />
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase">In Queue</span>
                  <p className="text-xl font-bold text-foreground mt-0.5">{queueData?.total || 2} Learners</p>
                </div>
                <Users className="h-8 w-8 text-blue-500/40" />
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Overdue SLA</span>
                  <p className="text-xl font-bold text-rose-400 mt-0.5">
                    {queueData?.sla_summary?.overdue_count || 1} Candidate(s)
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-rose-500/40" />
              </CardContent>
            </Card>
          </div>

          {/* Queue Filter */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-2">
              <Button
                variant={onlyOverdue ? "destructive" : "outline"}
                size="sm"
                onClick={() => setOnlyOverdue(!onlyOverdue)}
                className="text-xs gap-1.5"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Filter Overdue Only (&gt; 15 Days)</span>
              </Button>
            </div>
            <span className="text-xs text-muted-foreground">
              Excludes weekends and confirmed calendar holidays.
            </span>
          </div>

          {/* Queue Table */}
          <Card className="bg-card border-border overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase">
                    <tr>
                      <th className="py-3 px-4">Candidate</th>
                      <th className="py-3 px-4">Cohort Batch</th>
                      <th className="py-3 px-4">Track Specialization</th>
                      <th className="py-3 px-4">Business Days Elapsed</th>
                      <th className="py-3 px-4">SLA Compliance</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {isQueueLoading ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">
                          Loading allocation queue from Track360...
                        </td>
                      </tr>
                    ) : queueData?.items && queueData.items.length > 0 ? (
                      queueData.items.map((item) => (
                        <tr key={item.candidate_id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-semibold text-foreground text-xs">
                              {item.first_name} {item.last_name}
                            </p>
                            <p className="font-mono text-[10px] text-muted-foreground">{item.candidate_number}</p>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="secondary" className="font-mono text-[10px] py-0">
                              {item.batch_code || "General"}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-xs text-foreground font-medium">
                            {item.track_title || "Data Science & AI"}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs">
                                {item.business_days_elapsed} / 15 days
                              </span>
                              <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={`h-full ${
                                    item.is_overdue ? "bg-rose-500" : "bg-emerald-500"
                                  }`}
                                  style={{
                                    width: `${Math.min(100, (item.business_days_elapsed / 15) * 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {item.is_overdue ? (
                              <Badge variant="destructive" className="text-[10px] py-0 gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                <span>SLA Exceeded (+{item.business_days_elapsed - 15}d)</span>
                              </Badge>
                            ) : (
                              <Badge variant="success" className="text-[10px] py-0 gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Within Target ({15 - item.business_days_elapsed}d left)</span>
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {item.allocation_status}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-muted-foreground text-xs">
                          No candidates currently pending project allocation.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 2: Project Groups */}
      {activeTab === "groups" && (
        <div className="space-y-4">
          <Card className="bg-card border-border overflow-hidden">
            <CardHeader className="py-3 px-6 border-b border-border/60 bg-muted/30">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Collaborative Student Groups &amp; Deliverables
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/60">
                {isGroupsLoading ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    Loading project groups from Track360...
                  </div>
                ) : groupsData?.items && groupsData.items.length > 0 ? (
                  groupsData.items.map((group) => (
                    <div key={group.id} className="p-5 hover:bg-muted/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-primary">{group.project_code}</span>
                          <span className="text-muted-foreground text-xs">&bull;</span>
                          <span className="font-semibold text-foreground text-sm">{group.project_title}</span>
                          <Badge
                            variant={
                              group.group_status === "COMPLETED"
                                ? "success"
                                : group.group_status === "DROPPED"
                                ? "destructive"
                                : "secondary"
                            }
                            className="text-[10px] py-0"
                          >
                            {group.group_status}
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          Team: <strong>{group.group_name}</strong> &bull; Mentor: {group.mentor_name || "Unassigned"} &bull; Stage: {group.current_milestone}
                        </p>

                        {group.group_status === "DROPPED" && group.drop_reason && (
                          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                            <strong>Drop Reason:</strong> {group.drop_reason}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {group.group_status !== "DROPPED" && group.group_status !== "COMPLETED" && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleOpenDrop(group)}
                            className="text-xs h-7 gap-1"
                          >
                            <span>Drop Project</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-10 text-center text-muted-foreground text-xs">
                    No project groups found.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mandatory Dropped Reason Dialog */}
      <Dialog
        isOpen={isDropModalOpen}
        onClose={() => setIsDropModalOpen(false)}
        title="Mandatory Justification for Dropping Project"
        description="ExcelR compliance requires a documented, coordinator-approved justification. Historical records are preserved; no hard deletes occur."
      >
        <div className="space-y-4 py-2">
          <div className="p-2.5 rounded-lg bg-muted text-xs">
            <p><strong>Project:</strong> {selectedGroup?.project_code} - {selectedGroup?.project_title}</p>
            <p><strong>Group:</strong> {selectedGroup?.group_name}</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Coordinator Drop Justification *
            </label>
            <textarea
              rows={4}
              value={dropReason}
              onChange={(e) => {
                setDropReason(e.target.value);
                setDropError(null);
              }}
              placeholder="State the explicit reasons, learner circumstances, or administrative approval details..."
              className="w-full p-2.5 rounded-lg border border-border bg-background text-xs focus:ring-1 focus:ring-rose-500 outline-hidden"
            />
            <span className="text-[10px] text-muted-foreground float-right">
              {dropReason.trim().length} characters (min 10)
            </span>
          </div>

          {dropError && (
            <p className="text-xs text-rose-500 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{dropError}</span>
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="ghost" size="sm" onClick={() => setIsDropModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDrop}
              disabled={dropReason.trim().length < 10 || dropMutation.isPending}
              className="gap-1.5"
            >
              <span>Confirm &amp; Log Drop Action</span>
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

