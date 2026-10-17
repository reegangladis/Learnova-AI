import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { InstructorScoreDistribution } from "@/types/analytics";
import { cn } from "@/lib/utils";

interface ScoreDistributionBarChartProps {
  title?: string;
  description?: string;
  distribution: InstructorScoreDistribution;
  height?: number;
  className?: string;
}

const colors = ["#ef4444", "#f59e0b", "#3b82f6", "#10b981"];

export const ScoreDistributionBarChart: React.FC<ScoreDistributionBarChartProps> = ({
  title = "Assessment Score Distribution",
  description = "Quartile distribution of finalized student quiz attempts",
  distribution,
  height = 240,
  className,
}) => {
  const chartData = [
    { range: "0–50%", count: distribution.range_0_50, label: "Needs Remediation" },
    { range: "51–70%", count: distribution.range_51_70, label: "Developing" },
    { range: "71–85%", count: distribution.range_71_85, label: "Proficient" },
    { range: "86–100%", count: distribution.range_86_100, label: "Mastery" },
  ];

  const totalAttempts = chartData.reduce((acc, d) => acc + d.count, 0);

  return (
    <Card className={cn("overflow-hidden border-border/80", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold tracking-tight">{title}</CardTitle>
        <CardDescription className="text-xs">
          {description} • {totalAttempts} total finalized {totalAttempts === 1 ? "attempt" : "attempts"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {totalAttempts === 0 ? (
          <div
            className="flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-lg bg-muted/20"
            style={{ height }}
          >
            <p className="text-sm font-medium text-muted-foreground">No finalized attempts recorded for this quiz.</p>
          </div>
        ) : (
          <div className="w-full" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis
                  dataKey="range"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  className="text-muted-foreground"
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  className="text-muted-foreground"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "0.5rem",
                    color: "#f8fafc",
                    fontSize: "12px",
                  }}
                  formatter={(val: number, _name: string, item) => [
                    `${val} student attempts (${item?.payload?.label})`,
                    "Count",
                  ]}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Accessible Alternative Table */}
        <div className="sr-only">
          <p>{title}</p>
          <table>
            <thead>
              <tr>
                <th>Score Range</th>
                <th>Attempt Count</th>
                <th>Performance Category</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((d, idx) => (
                <tr key={idx}>
                  <td>{d.range}</td>
                  <td>{d.count}</td>
                  <td>{d.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
