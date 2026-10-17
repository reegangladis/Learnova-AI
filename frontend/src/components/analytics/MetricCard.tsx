import React from "react";
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  variant?: "default" | "primary" | "success" | "warning" | "purple" | "cyan";
  isLoading?: boolean;
  className?: string;
  id?: string;
}

const variantStyles: Record<string, { bg: string; text: string; iconBg: string }> = {
  default: {
    bg: "hover:border-border",
    text: "text-foreground",
    iconBg: "bg-muted text-muted-foreground",
  },
  primary: {
    bg: "hover:border-primary/50",
    text: "text-primary",
    iconBg: "bg-primary/10 text-primary",
  },
  success: {
    bg: "hover:border-emerald-500/50",
    text: "text-emerald-500",
    iconBg: "bg-emerald-500/10 text-emerald-500",
  },
  warning: {
    bg: "hover:border-amber-500/50",
    text: "text-amber-500",
    iconBg: "bg-amber-500/10 text-amber-500",
  },
  purple: {
    bg: "hover:border-purple-500/50",
    text: "text-purple-500",
    iconBg: "bg-purple-500/10 text-purple-500",
  },
  cyan: {
    bg: "hover:border-cyan-500/50",
    text: "text-cyan-500",
    iconBg: "bg-cyan-500/10 text-cyan-500",
  },
};

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  isLoading = false,
  className,
  id,
}) => {
  const styles = variantStyles[variant] || variantStyles.default;

  if (isLoading) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="flex items-center justify-between pb-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-20 my-2" />
        <Skeleton className="h-3 w-36" />
      </Card>
    );
  }

  return (
    <Card
      id={id}
      className={cn(
        "relative overflow-hidden transition-all duration-200 border-border/80 shadow-xs",
        styles.bg,
        className
      )}
      tabIndex={0}
      aria-label={`${title}: ${value}${subtitle ? `. ${subtitle}` : ""}`}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-x-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
            {title}
          </span>
          {Icon && (
            <div
              className={cn(
                "p-2 rounded-lg flex items-center justify-center shrink-0",
                styles.iconBg
              )}
              aria-hidden="true"
            >
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>

        <div className="mt-3 flex items-baseline justify-between gap-2">
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            {value}
          </div>
          {trend && (
            <span
              className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full inline-flex items-center",
                trend.isPositive
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
              )}
              aria-label={`Trend: ${trend.value} ${trend.label || ""}`}
            >
              {trend.value}
            </span>
          )}
        </div>

        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground truncate">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
