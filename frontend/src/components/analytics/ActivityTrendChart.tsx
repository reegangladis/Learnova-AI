import React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export interface ActivitySeriesConfig {
  dataKey: string;
  name: string;
  stroke: string;
  fill: string;
}

interface ActivityTrendChartProps {
  title: string;
  description?: string;
  data: Array<Record<string, unknown>>;
  series: ActivitySeriesConfig[];
  xAxisKey?: string;
  height?: number;
  className?: string;
  emptyMessage?: string;
}

export const ActivityTrendChart: React.FC<ActivityTrendChartProps> = ({
  title,
  description,
  data,
  series,
  xAxisKey = "date",
  height = 300,
  className,
  emptyMessage = "No historical activity recorded for the selected date window.",
}) => {
  const hasData = data && data.length > 0 && data.some((d) =>
    series.some((s) => Number(d[s.dataKey] ?? 0) > 0)
  );

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
            <p className="text-sm font-medium text-muted-foreground">{emptyMessage}</p>
            <p className="text-xs text-muted-foreground/80 mt-1">
              Activity trends will populate automatically as users complete lessons and assessments.
            </p>
          </div>
        ) : (
          <div className="w-full" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  {series.map((s) => (
                    <linearGradient
                      key={s.dataKey}
                      id={`gradient-${s.dataKey}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor={s.fill} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={s.fill} stopOpacity={0.0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis
                  dataKey={xAxisKey}
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
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ fontSize: "12px", paddingBottom: "10px" }}
                />
                {series.map((s) => (
                  <Area
                    key={s.dataKey}
                    type="monotone"
                    dataKey={s.dataKey}
                    name={s.name}
                    stroke={s.stroke}
                    fillOpacity={1}
                    fill={`url(#gradient-${s.dataKey})`}
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Accessible Alternative for Screen Readers */}
        <div className="sr-only">
          <p>{title}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                {series.map((s) => (
                  <th key={s.dataKey}>{s.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.slice(-7).map((row, idx) => (
                <tr key={idx}>
                  <td>{String(row[xAxisKey] ?? "")}</td>
                  {series.map((s) => (
                    <td key={s.dataKey}>{String(row[s.dataKey] ?? 0)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
