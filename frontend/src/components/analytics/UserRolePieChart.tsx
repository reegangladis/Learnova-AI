import React from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { RoleCountItem } from "@/types/analytics";
import { cn } from "@/lib/utils";

interface UserRolePieChartProps {
  title?: string;
  description?: string;
  roles: RoleCountItem[];
  height?: number;
  className?: string;
}

const roleColors: Record<string, string> = {
  STUDENT: "#3b82f6",
  INSTRUCTOR: "#8b5cf6",
  ADMIN: "#10b981",
  SUPER_ADMIN: "#f59e0b",
};

export const UserRolePieChart: React.FC<UserRolePieChartProps> = ({
  title = "User Distribution by Role",
  description = "Demographic breakdown of registered accounts",
  roles,
  height = 240,
  className,
}) => {
  const safeRoles: RoleCountItem[] = Array.isArray(roles)
    ? roles
    : roles && typeof roles === "object"
    ? Object.entries(roles).map(([role, count]) => ({ role, count: Number(count) }))
    : [];

  const chartData = safeRoles
    .filter((r) => r.count > 0)
    .map((r) => ({
      name: r.role.replace("_", " "),
      roleKey: r.role,
      value: r.count,
    }));

  const totalUsers = chartData.reduce((acc, r) => acc + r.value, 0);

  return (
    <Card className={cn("overflow-hidden border-border/80", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold tracking-tight">{title}</CardTitle>
        <CardDescription className="text-xs">
          {description} • {totalUsers} total users
        </CardDescription>
      </CardHeader>
      <CardContent>
        {totalUsers === 0 ? (
          <div
            className="flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-lg bg-muted/20"
            style={{ height }}
          >
            <p className="text-sm font-medium text-muted-foreground">No users registered in this scope.</p>
          </div>
        ) : (
          <div className="w-full" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={roleColors[entry.roleKey] || "#64748b"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "0.5rem",
                    color: "#f8fafc",
                    fontSize: "12px",
                  }}
                  formatter={(val: number) => [`${val} users (${((val / totalUsers) * 100).toFixed(1)}%)`, "Count"]}
                />
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Accessible Alternative Table */}
        <div className="sr-only">
          <p>{title}</p>
          <table>
            <thead>
              <tr>
                <th>Role</th>
                <th>Users</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((d, idx) => (
                <tr key={idx}>
                  <td>{d.name}</td>
                  <td>{d.value}</td>
                  <td>{((d.value / totalUsers) * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
