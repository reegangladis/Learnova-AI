import { Link } from "react-router-dom";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-6">
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertCircle className="h-8 w-8" />
      </div>

      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold text-foreground">404 - Page Not Found</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          The requested route does not exist in the Learnova AI platform.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Link to="/">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Home</span>
          </Button>
        </Link>
        <Link to="/dashboard">
          <Button className="gap-2">
            <Home className="h-4 w-4" />
            <span>Go to Dashboard</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
