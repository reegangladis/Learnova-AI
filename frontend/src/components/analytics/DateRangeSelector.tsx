import React from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface DateRangeOption {
  label: string;
  days: number;
}

interface DateRangeSelectorProps {
  value: number;
  onChange: (days: number) => void;
  options?: DateRangeOption[];
  className?: string;
  id?: string;
}

const defaultOptions: DateRangeOption[] = [
  { label: "7 Days", days: 7 },
  { label: "30 Days", days: 30 },
  { label: "90 Days", days: 90 },
  { label: "1 Year", days: 365 },
];

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  value,
  onChange,
  options = defaultOptions,
  className,
  id = "analytics-date-range",
}) => {
  return (
    <div
      id={id}
      className={cn(
        "inline-flex items-center gap-1 p-1 bg-muted/60 border border-border/80 rounded-lg text-xs",
        className
      )}
      role="group"
      aria-label="Select analytics time range"
    >
      <div className="flex items-center px-2 text-muted-foreground gap-1.5" aria-hidden="true">
        <Calendar className="h-3.5 w-3.5" />
        <span className="font-medium hidden sm:inline">Range:</span>
      </div>
      {options.map((opt) => {
        const isSelected = value === opt.days;
        return (
          <Button
            key={opt.days}
            type="button"
            size="sm"
            variant={isSelected ? "primary" : "ghost"}
            className={cn(
              "h-7 px-2.5 py-1 text-xs font-medium rounded-md transition-all",
              isSelected
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => onChange(opt.days)}
            aria-pressed={isSelected}
            aria-label={`Time range ${opt.label}`}
          >
            {opt.label}
          </Button>
        );
      })}
    </div>
  );
};
