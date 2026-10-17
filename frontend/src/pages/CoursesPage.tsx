import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Clock,
  BookOpen,
  User,
  PlusCircle,
  Filter,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { courseService } from "@/services/courseService";
import { useAuth } from "@/hooks/useAuth";

export function CoursesPage() {
  const { hasRole } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 9;

  const isInstructorOrAdmin = hasRole("INSTRUCTOR", "ADMIN", "SUPER_ADMIN");

  // Fetch categories for filtering
  const { data: categories = [] } = useQuery({
    queryKey: ["course-categories-active"],
    queryFn: () => courseService.listCategories(true),
  });

  // Fetch courses with real backend parameters
  const {
    data: coursesData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["courses", searchTerm, selectedCategory, selectedDifficulty, page],
    queryFn: () =>
      courseService.listCourses({
        search: searchTerm || undefined,
        category_id: selectedCategory || undefined,
        difficulty: selectedDifficulty || undefined,
        page,
        page_size: pageSize,
      }),
  });

  const courses = coursesData?.items || [];
  const totalPages = coursesData?.total_pages || 1;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value);
    setPage(1);
  };

  const handleDifficultyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDifficulty(e.target.value);
    setPage(1);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Explore Courses
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Discover peer-reviewed learning modules with interactive syllabi and AI-ready materials.
          </p>
        </div>

        {isInstructorOrAdmin && (
          <div className="flex items-center gap-3">
            <Link to="/instructor/courses">
              <Button variant="outline" size="sm" className="gap-2">
                <BookOpen className="h-4 w-4" />
                Instructor Studio
              </Button>
            </Link>
            <Link to="/instructor/courses/new">
              <Button size="sm" className="gap-2">
                <PlusCircle className="h-4 w-4" />
                New Course
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-card p-4 rounded-xl border border-border shadow-sm">
        {/* Search */}
        <div className="relative flex-1">
          <Input
            placeholder="Search by course title or keywords..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-9"
          />
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
            <select
              aria-label="Filter by Category"
              value={selectedCategory}
              onChange={handleCategoryChange}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-48"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-auto">
            <select
              aria-label="Filter by Difficulty Level"
              value={selectedDifficulty}
              onChange={handleDifficultyChange}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-40"
            >
              <option value="">All Difficulties</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-xl text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-sm font-medium text-destructive">
            {error instanceof Error ? error.message : "Failed to load courses from server."}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="flex flex-col justify-between">
              <CardHeader className="space-y-3">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </CardHeader>
              <CardContent>
                <div className="flex justify-between pt-4 border-t border-border">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-full rounded-md" />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && courses.length === 0 && (
        <div className="text-center py-16 bg-card border border-border rounded-xl space-y-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
            <BookOpen className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No Courses Found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {searchTerm || selectedCategory || selectedDifficulty
              ? "No courses matched your current filter criteria. Try clearing some filters."
              : "No courses have been published yet. Check back soon or visit the instructor studio."}
          </p>
          {(searchTerm || selectedCategory || selectedDifficulty) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("");
                setSelectedDifficulty("");
                setPage(1);
              }}
            >
              Reset Filters
            </Button>
          )}
        </div>
      )}

      {/* Course Cards Grid */}
      {!isLoading && !isError && courses.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Card
                key={course.id}
                className="flex flex-col justify-between hover:shadow-lg transition-all duration-200 border-border/80 group overflow-hidden"
              >
                {/* Thumbnail / Header Banner */}
                {course.thumbnail_url ? (
                  <div className="h-40 w-full overflow-hidden bg-muted">
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="h-32 w-full bg-gradient-to-br from-primary/10 via-accent/20 to-secondary/30 flex items-center justify-center border-b border-border">
                    <div className="flex items-center gap-2 text-primary font-semibold text-lg tracking-wide">
                      <Sparkles className="h-5 w-5" />
                      <span>Learnova AI</span>
                    </div>
                  </div>
                )}

                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-xs truncate max-w-[150px]">
                      {course.category?.name || "General"}
                    </Badge>
                    <Badge
                      variant={
                        course.difficulty === "beginner"
                          ? "default"
                          : course.difficulty === "intermediate"
                            ? "secondary"
                            : "outline"
                      }
                      className="capitalize text-xs"
                    >
                      {course.difficulty}
                    </Badge>
                  </div>

                  <CardTitle className="text-lg line-clamp-1 group-hover:text-primary transition-colors">
                    <Link to={`/courses/${course.id}`}>{course.title}</Link>
                  </CardTitle>

                  <CardDescription className="text-xs line-clamp-2">
                    {course.short_description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {course.duration_minutes > 0
                        ? `${course.duration_minutes} mins`
                        : "Self-paced"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5" />
                      {course.lessons_count} Lessons
                    </span>
                    <span className="flex items-center gap-1.5 truncate max-w-[120px]">
                      <User className="h-3.5 w-3.5" />
                      {course.instructor?.first_name || "Instructor"}
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="border-t border-border pt-4">
                  <Link to={`/courses/${course.id}`} className="w-full">
                    <Button variant="primary" className="w-full group-hover:bg-primary/90">
                      View Syllabus & Details
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border pt-6">
              <p className="text-xs text-muted-foreground">
                Showing page <span className="font-semibold text-foreground">{page}</span> of{" "}
                <span className="font-semibold text-foreground">{totalPages}</span>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
