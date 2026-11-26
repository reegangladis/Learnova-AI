import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Award, RotateCcw, Sliders, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface CourseGradeItem {
  id: string;
  code: string;
  title: string;
  score: number;
  credits: number;
  status: "Passed" | "In progress";
}

const INITIAL_GRADES: CourseGradeItem[] = [
  {
    id: "c-devops-01",
    code: "CLD-101",
    title: "Full-Stack Cloud & DevOps Engineering",
    score: 91,
    credits: 4,
    status: "Passed",
  },
  {
    id: "c-ai-01",
    code: "AIE-201",
    title: "Enterprise AI Engineering & Large Language Models",
    score: 88,
    credits: 4,
    status: "In progress",
  },
  {
    id: "c-python-01",
    code: "DSE-104",
    title: "Advanced Python & Distributed Data Systems",
    score: 94,
    credits: 4,
    status: "Passed",
  },
  {
    id: "c-security-01",
    code: "SEC-302",
    title: "Enterprise Cybersecurity & Zero Trust Systems",
    score: 84,
    credits: 3,
    status: "In progress",
  },
];

function computeLetterGrade(score: number): string {
  if (score >= 93) return "A+";
  if (score >= 88) return "A";
  if (score >= 83) return "A-";
  if (score >= 78) return "B+";
  if (score >= 70) return "B";
  return "C";
}

function computeGpaPoints(score: number): number {
  if (score >= 93) return 4.0;
  if (score >= 88) return 3.85;
  if (score >= 83) return 3.7;
  if (score >= 78) return 3.3;
  if (score >= 70) return 3.0;
  return 2.4;
}

export function GradesPage() {
  const [grades, setGrades] = useState<CourseGradeItem[]>(INITIAL_GRADES);
  const [simulatorOpen, setSimulatorOpen] = useState<boolean>(false);

  const metrics = useMemo(() => {
    const totalCredits = grades.reduce((acc, g) => acc + g.credits, 0);
    const weightedPoints = grades.reduce(
      (acc, g) => acc + computeGpaPoints(g.score) * g.credits,
      0
    );
    const avgScore = Math.round(
      grades.reduce((acc, g) => acc + g.score, 0) / Math.max(1, grades.length)
    );
    return {
      totalCredits,
      cgpa: totalCredits > 0 ? (weightedPoints / totalCredits).toFixed(2) : "0.00",
      avgScore,
    };
  }, [grades]);

  const updateScore = (id: string, nextScore: number) => {
    setGrades((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              score: nextScore,
              status: nextScore >= 75 ? item.status : "In progress",
            }
          : item
      )
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Studio Header Card */}
      <div className="studio-card border-t-4 border-t-teal-600 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300 bg-teal-500/10 border border-teal-500/20 px-2.5 py-0.5 rounded-full">
            Academic Telemetry
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Grades &amp; CGPA Explorer
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Consolidated curriculum scores paired with an interactive what-if GPA simulator.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-secondary/60 p-4 rounded-2xl border border-border shrink-0">
          <div className="text-center px-2">
            <span className="font-display text-2xl font-bold text-teal-700 dark:text-teal-400 block leading-none">
              {metrics.cgpa}
            </span>
            <span className="text-[9px] font-mono uppercase text-muted-foreground mt-1 block">
              {simulatorOpen ? "PROJECTED GPA" : "CGPA"}
            </span>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center px-2">
            <span className="font-display text-2xl font-bold text-orange-600 dark:text-orange-400 block leading-none">
              {metrics.avgScore}%
            </span>
            <span className="text-[9px] font-mono uppercase text-muted-foreground mt-1 block">
              AVG SCORE
            </span>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center px-2">
            <span className="font-display text-2xl font-bold text-foreground block leading-none">
              {metrics.totalCredits}
            </span>
            <span className="text-[9px] font-mono uppercase text-muted-foreground mt-1 block">
              CREDITS
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
          <Award className="w-4 h-4 text-teal-600" />
          <span>Active Track Transcript ({grades.length} Curricula)</span>
        </div>

        <div className="flex items-center gap-2">
          {simulatorOpen && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setGrades(INITIAL_GRADES)}
              className="text-xs gap-1.5 rounded-xl h-8"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Actuals
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={() => setSimulatorOpen((v) => !v)}
            className={`text-xs gap-1.5 rounded-xl h-8 font-bold ${
              simulatorOpen
                ? "bg-orange-500 hover:bg-orange-600 text-white"
                : "bg-teal-600 hover:bg-teal-700 text-white"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{simulatorOpen ? "Exit What-If Simulator" : "Open What-If Simulator"}</span>
          </Button>
        </div>
      </div>

      {/* Grades Table */}
      <div className="studio-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/60 border-b border-border text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Course Code &amp; Curriculum</th>
                <th className="py-3.5 px-4">Credits</th>
                <th className="py-3.5 px-4">Score</th>
                <th className="py-3.5 px-4">Grade</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {grades.map((item) => {
                const letter = computeLetterGrade(item.score);
                return (
                  <tr key={item.id} className="hover:bg-secondary/35 transition-colors">
                    <td className="py-4 px-6 font-semibold text-foreground">
                      <span className="text-teal-700 dark:text-teal-400 font-mono mr-2.5">
                        {item.code}
                      </span>
                      <span>{item.title}</span>
                    </td>
                    <td className="py-4 px-4 font-mono text-muted-foreground">{item.credits}</td>
                    <td className="py-4 px-4 font-mono font-bold text-foreground">
                      {simulatorOpen ? (
                        <div className="flex items-center gap-2 min-w-[150px]">
                          <input
                            type="range"
                            min={60}
                            max={100}
                            value={item.score}
                            onChange={(e) => updateScore(item.id, Number(e.target.value))}
                            className="w-24 accent-orange-500 cursor-pointer"
                          />
                          <span>{item.score}%</span>
                        </div>
                      ) : (
                        <span>{item.score}%</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-mono font-bold px-2.5 py-0.5 rounded-md bg-secondary text-foreground border border-border">
                        {letter}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          item.status === "Passed"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
                            : "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/25"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        to={`/courses/${item.id}`}
                        className="inline-flex items-center gap-1 text-teal-700 dark:text-teal-400 hover:underline font-bold"
                      >
                        Open <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
