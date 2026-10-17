import { Link, Outlet } from "react-router-dom";
import { GraduationCap, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-muted/30 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute top-6 left-6">
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </Button>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md mb-2">
          <GraduationCap className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Learnova <span className="text-primary font-black">AI</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          "Learn Smarter. Learn Personally. Learn with AI."
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Outlet />
      </div>
    </div>
  );
}
