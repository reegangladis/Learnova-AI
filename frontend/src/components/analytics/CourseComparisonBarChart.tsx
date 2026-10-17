import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface CourseComparisonItem {
  title: string;
  total_enrollments: number;
  completed_enrollments?: number;
  completion_rate: number;
  average_quiz_score?: number;
}

interface CourseComparisonBarChartProps {
  title: string;
  description?: string;
  courses: CourseComparisonItem[];
  height?: number;
  className?: string;
}

export const CourseComparisonBarChart: React.FC<CourseComparisonBarChartProps> = ({
  title,
  description,
  courses,
  height = 320,
  className,
}) => {
  const chartData = courses.slice(0, 8).map((c) => ({
    name: c.title.length > 18 ? `${c.title.slice(0, 16)}...` : c.title,
    fullName: c.title,
    enrollments: c.total_enrollments,
    completionRate: c.completion_rate,
    avgScore: c.average_quiz_score ?? 0,
  }));

  const hasData = chartData.length > 0 && chartData.some((d) => d.enrollments > 0 || d.completionRate > 0);

  return (
    <Card className={cn("overflow-hidden border-border/80", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold tracking-tight">{title}</CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div
            className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-lg bg-muted/20"
            style={{ height }}
          >
            <p className="text-sm font-medium text-muted-foreground">No course performance data available yet.</p>
            <p className="text-xs text-muted-foreground/80 mt-1">
              Course comparison metrics will display once courses have active student enrollments.
            </p>
          </div>
        ) : (
          <div className="w-full" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  className="text-muted-foreground"
                />
                <YAxis
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
                  formatter={(val: number, name: string) => [
                    name === "Completion Rate (%)" ? `${val.toFixed(1)}%` : val,
                    name,
                  ]}
                  labelFormatter={(_label, payload) => {
                    const full = payload?.[0]?.payload?.fullName;
                    return full || _label;
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ fontSize: "12px", paddingBottom: "10px" }}
                />
                <Bar
                  dataKey="enrollments"
                  name="Total Enrollments"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="completionRate"
                  name="Completion Rate (%)"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
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
                <th>Course</th>
                <th>Total Enrollments</th>
                <th>Completion Rate (%)</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c, idx) => (
                <tr key={idx}>
                  <td>{c.title}</td>
                  <td>{c.total_enrollments}</td>
                  <td>{c.completion_rate.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
