import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Search,
  CheckCircle2,
  Clock,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { track360Service } from "@/services/track360Service";

export const LearnersPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["excelr_learners_list", searchQuery, page],
    queryFn: () => track360Service.getLearners({ search: searchQuery, page, page_size: 20 }),
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Users className="h-6 w-6 text-primary" />
            <span>ExcelR Learner Management</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Consolidated Golden Profile registry authoritative from ExcelR Track360.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs px-2.5 py-1">
            Total: {data?.total || 69420} Candidates
          </Badge>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by candidate number (e.g. EXCELR-2026-0001), name, or email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-9 bg-background"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Learners Table */}
      <Card className="bg-card border-border overflow-hidden">
        <CardHeader className="border-b border-border/60 py-4 px-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Authoritative Candidate Roster</CardTitle>
            <span className="text-xs text-muted-foreground">Showing page {page} of {data?.total_pages || 1}</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b border-border/80 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Candidate ID</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4">Cohort Batch</th>
                  <th className="py-3 px-4">Project Gating</th>
                  <th className="py-3 px-4">Projects Done</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground text-sm">
                      Loading authoritative candidate records...
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-rose-400 text-sm">
                      Failed to retrieve candidate records: {String(error)}
                    </td>
                  </tr>
                ) : data?.items && data.items.length > 0 ? (
                  data.items.map((learner) => (
                    <tr key={learner.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-primary text-xs">
                        {learner.candidate_number}
                      </td>
                      <td className="py-3 px-4 font-medium text-foreground">
                        {learner.first_name} {learner.last_name}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs font-mono">
                        {learner.email}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary" className="text-[10px] font-mono py-0">
                          {learner.batch_code || "General"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {learner.project_eligible ? (
                          <Badge variant="success" className="text-[10px] py-0 gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Eligible</span>
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="text-[10px] py-0 gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Gated</span>
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-foreground text-xs">
                          {learner.completed_projects_count} / 3
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link to={`/learners/${learner.id}`}>
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                            <Eye className="h-3 w-3" />
                            <span>360 Profile</span>
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      No matching learner records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

