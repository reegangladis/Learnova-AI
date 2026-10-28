import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  ShieldCheck,
  QrCode,
  Download,
  ExternalLink,
  Search,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { track360Service } from "@/services/track360Service";
import type { CertificateItem } from "@/types/track360";

export const CertificatesPage: React.FC = () => {
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCert, setSelectedCert] = useState<CertificateItem | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["excelr_certificates", selectedStatus],
    queryFn: () =>
      track360Service.getCertificates({
        status: selectedStatus === "ALL" ? undefined : selectedStatus,
      }),
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Award className="h-6 w-6 text-purple-500" />
            <span>ExcelR Certificate Tracking &amp; Issuance</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Course Completion and Live Project Internship credentials governed by ExcelR Track360 two-tier approvals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs px-2.5 py-1">
            Total Registry: {data?.total || 3} Credentials
          </Badge>
        </div>
      </div>

      {/* Internship Duration Policy Explainer */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
          <div className="space-y-1">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Accredited Internship Duration Rules (Track360 Governed)</span>
            </span>
            <p className="text-muted-foreground">
              Internship accreditation strictly enforces: <strong>1 project = 3 months</strong> &bull; <strong>2 projects = 6 months</strong> &bull; <strong>3 projects = 9 months</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono text-[10px]">1 Proj &rarr; 3 Mo</Badge>
            <Badge variant="secondary" className="font-mono text-[10px]">2 Proj &rarr; 6 Mo</Badge>
            <Badge variant="secondary" className="font-mono text-[10px]">3 Proj &rarr; 9 Mo</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Filter and Search Bar */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by candidate or serial number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" /> Approval Status:
            </span>
            <div className="inline-flex rounded-lg bg-muted p-1 text-xs">
              {["ALL", "ISSUED", "PENDING_STAGE2", "DRAFT"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSelectedStatus(st)}
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

      {/* Certificates Registry Table */}
      <Card className="bg-card border-border overflow-hidden">
        <CardHeader className="py-3 px-6 border-b border-border/60 bg-muted/30">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Official Credentials Registry
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Serial Number</th>
                  <th className="py-3 px-4">Candidate</th>
                  <th className="py-3 px-4">Credential Type</th>
                  <th className="py-3 px-4">Accredited Duration</th>
                  <th className="py-3 px-4">Two-Stage Approval</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground text-sm">
                      Loading certificate records from Track360...
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-rose-400 text-sm">
                      Failed to retrieve certificate records from authoritative system.
                    </td>
                  </tr>
                ) : data?.items && data.items.length > 0 ? (
                  data.items
                    .filter((c) => {
                      if (!searchQuery) return true;
                      const q = searchQuery.toLowerCase();
                      return (
                        c.candidate_name.toLowerCase().includes(q) ||
                        c.candidate_number.toLowerCase().includes(q) ||
                        c.serial_number.toLowerCase().includes(q)
                      );
                    })
                    .map((cert) => (
                      <tr key={cert.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-xs text-primary">
                          {cert.serial_number}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-foreground text-xs">{cert.candidate_name}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">{cert.candidate_number}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs font-medium text-foreground block">
                            {cert.certificate_type === "COURSE_COMPLETION"
                              ? "Course Completion"
                              : "Internship Experience"}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate max-w-xs block">
                            {cert.course_or_track_title}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {cert.accredited_duration_months ? (
                            <Badge variant="secondary" className="font-mono text-[10px] py-0">
                              {cert.accredited_duration_months} Months
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground font-mono">N/A</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                cert.stage1_approved ? "bg-emerald-500" : "bg-muted-foreground"
                              }`}
                              title="Stage 1: Reviewer Verification"
                            />
                            <span className="text-[10px] text-muted-foreground">S1</span>
                            <span className="text-muted-foreground">&rarr;</span>
                            <span
                              className={`h-2 w-2 rounded-full ${
                                cert.stage2_approved ? "bg-emerald-500" : "bg-amber-500"
                              }`}
                              title="Stage 2: Final Approver Sign-off"
                            />
                            <span className="text-[10px] text-muted-foreground">S2</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              cert.status === "ISSUED"
                                ? "success"
                                : cert.status === "PENDING_STAGE2"
                                ? "warning"
                                : "secondary"
                            }
                            className="text-[10px] py-0"
                          >
                            {cert.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedCert(cert)}
                            className="h-7 text-xs gap-1"
                          >
                            <QrCode className="h-3 w-3" />
                            <span>Verify Portal</span>
                          </Button>
                        </td>
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground text-xs">
                      No certificate records match the current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Verification Portal Modal */}
      <Dialog
        isOpen={Boolean(selectedCert)}
        onClose={() => setSelectedCert(null)}
        title="Cryptographic Certificate Verification"
        description="Track360 public tokenized verification requiring zero authentication."
      >
        {selectedCert && (
          <div className="space-y-4 py-3 text-xs">
            <div className="p-4 rounded-xl bg-muted/60 border border-border/80 space-y-2 text-center">
              <Badge variant={selectedCert.status === "ISSUED" ? "success" : "warning"} className="mb-1">
                {selectedCert.status}
              </Badge>
              <h4 className="font-bold text-foreground text-base">{selectedCert.candidate_name}</h4>
              <p className="text-muted-foreground text-xs">{selectedCert.course_or_track_title}</p>
              <p className="font-mono text-xs text-primary font-semibold">{selectedCert.serial_number}</p>
              {selectedCert.accredited_duration_months && (
                <p className="text-[11px] text-muted-foreground">
                  Accredited Duration: <strong>{selectedCert.accredited_duration_months} Months</strong>
                </p>
              )}
            </div>

            <div className="p-3 rounded-lg bg-background border border-border space-y-1">
              <span className="text-[10px] uppercase text-muted-foreground font-semibold">Public Verification URL:</span>
              <p className="font-mono text-xs text-foreground truncate">
                {selectedCert.verification_url || `http://localhost:8000/verify/${selectedCert.serial_number}`}
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <a
                href={selectedCert.verification_url || `http://localhost:8000/verify/${selectedCert.serial_number}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-primary hover:underline font-semibold"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Open Public Portal</span>
              </a>

              {selectedCert.status === "ISSUED" && (
                <Button size="sm" className="gap-1.5 text-xs">
                  <Download className="h-3.5 w-3.5" />
                  <span>Download PDF</span>
                </Button>
              )}
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};

