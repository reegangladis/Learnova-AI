import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "info" | "success" | "warning" | "destructive";
  title?: string;
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", title, children, ...props }, ref) => {
    const variants = {
      default: "bg-muted text-foreground border-border",
      info: "bg-blue-500/10 text-blue-800 dark:text-blue-300 border-blue-500/30",
      success: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30",
      warning: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30",
      destructive: "bg-destructive/10 text-destructive border-destructive/30",
    };

    const icons = {
      default: <Info className="h-4 w-4 shrink-0 text-muted-foreground" />,
      info: <Info className="h-4 w-4 shrink-0 text-blue-500" />,
      success: <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />,
      warning: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />,
      destructive: <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />,
    };

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          "relative flex w-full items-start gap-3 rounded-lg border p-4 text-sm",
          variants[variant],
          className
        )}
        {...props}
      >
        {icons[variant]}
        <div className="flex-1 space-y-1">
          {title && <h5 className="font-semibold leading-none tracking-tight">{title}</h5>}
          <div className="text-sm opacity-90">{children}</div>
        </div>
      </div>
    );
  }
);

Alert.displayName = "Alert";
