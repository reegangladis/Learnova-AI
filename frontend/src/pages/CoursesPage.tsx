import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Filter,
  PlusCircle,
  Search,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { courseService } from "@/services/courseService";
import { useAuth } from "@/hooks/useAuth";
import { Course } from "@/types/course";

export function CoursesPage() {
  const { hasRole } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("");
  const [page, setPage] = useState(1);
  const [peekCourse, setPeekCourse] = useState<Course | null>(null);
  const pageSize = 9;

  const isInstructorOrAdmin = hasRole("INSTRUCTOR", "ADMIN", "SUPER_ADMIN");

  const { data: categories = [] } = useQuery({
    queryKey: ["course-categories-active"],
    queryFn: () => courseService.listCategories(true),
  });

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
    <div className="space-y-7 max-w-7xl mx-auto">
      {/* Studio Catalog Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-teal-700 dark:text-teal-400 font-semibold">
            Learnova AI Catalog
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-0.5">
            Explore Courses
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Peer-reviewed tracks equipped with slide decks, video lectures, and RAG Study Copilot support.
          </p>
        </div>

        {isInstructorOrAdmin && (
          <div className="flex items-center gap-3">
            <Link to="/instructor/courses">
              <Button variant="outline" size="sm" className="gap-2 rounded-xl">
                <BookOpen className="h-4 w-4" />
                Instructor Studio
              </Button>
            </Link>
            <Link to="/instructor/courses/new">
              <Button size="sm" className="gap-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl">
                <PlusCircle className="h-4 w-4" />
                New Course
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="studio-card p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by course title or keywords..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full h-10 pl-10 pr-4 bg-background border border-input rounded-xl text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/40"
            />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-teal-600 hidden sm:block" />
              <select
                aria-label="Filter by Category"
                value={selectedCategory}
                onChange={handleCategoryChange}
                className="h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/40 w-full sm:w-48"
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
                className="h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/40 w-full sm:w-44"
              >
                <option value="">All Difficulties</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <div className="p-6 bg-rose-500/10 border border-rose-500/25 rounded-2xl text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-rose-600 mx-auto" />
          <p className="text-sm font-medium text-rose-700 dark:text-rose-300">
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
            <div key={i} className="studio-card p-5 space-y-4">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-9 w-full rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && courses.length === 0 && (
        <div className="studio-card text-center py-16 space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-teal-500/10 flex items-center justify-center mx-auto text-teal-600">
            <BookOpen className="h-7 w-7" />
          </div>
          <h3 className="font-display text-lg font-bold text-foreground">No Courses Found</h3>
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
            {courses.map((course, idx) => {
              const headerBars = [
                "from-teal-600 to-emerald-600",
                "from-orange-500 to-rose-500",
                "from-blue-600 to-cyan-600",
                "from-emerald-600 to-teal-700",
              ];
              return (
                <div
                  key={course.id}
                  className="studio-card flex flex-col justify-between hover:shadow-lg hover:border-teal-500/40 transition-all duration-200 group overflow-hidden"
                >
                  <div>
                    {course.thumbnail_url ? (
                      <div className="h-36 w-full overflow-hidden bg-muted">
                        <img
                          src={course.thumbnail_url}
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div
                        className={`h-24 w-full bg-gradient-to-r ${headerBars[idx % headerBars.length]} px-5 py-4 flex items-end justify-between text-white`}
                      >
                        <Badge className="bg-black/25 text-white border-white/20 text-[11px] font-mono">
                          {course.category?.name || "General"}
                        </Badge>
                        <span className="text-[11px] font-mono uppercase bg-white/20 px-2 py-0.5 rounded-md">
                          {course.difficulty}
                        </span>
                      </div>
                    )}

                    <div className="p-5 space-y-2.5">
                      <Link to={`/courses/${course.id}`}>
                        <h3 className="font-display text-lg font-bold text-foreground group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors line-clamp-2">
                          {course.title}
                        </h3>
                      </Link>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {course.short_description}
                      </p>
                    </div>
                  </div>

                  <div className="px-5 pb-5 space-y-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="h-3.5 w-3.5 text-teal-600" />
                        {course.duration_minutes > 0 ? `${course.duration_minutes} mins` : "Self-paced"}
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <BookOpen className="h-3.5 w-3.5 text-orange-500" />
                        {course.lessons_count} Lessons
                      </span>
                      <span className="flex items-center gap-1 truncate max-w-[110px]">
                        <User className="h-3.5 w-3.5" />
                        {course.instructor?.first_name || "Instructor"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link to={`/courses/${course.id}`} className="flex-1">
                        <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl">
                          View Syllabus &amp; Details
                        </Button>
                      </Link>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setPeekCourse(course)}
                        title="Quick-peek learning objectives"
                        aria-label={`Quick peek ${course.title}`}
                        className="rounded-xl shrink-0"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
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
                  className="gap-1 rounded-xl"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="gap-1 rounded-xl"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Interactive Syllabus Quick-Peek Modal */}
      {peekCourse && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPeekCourse(null)}
        >
          <div
            className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
              <div>
                <span className="text-[11px] font-mono uppercase text-teal-700 dark:text-teal-400 font-semibold">
                  Syllabus Quick-Peek · {peekCourse.category?.name || "Course"}
                </span>
                <h3 className="font-display text-lg font-bold text-foreground mt-0.5">
                  {peekCourse.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPeekCourse(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {peekCourse.description || peekCourse.short_description}
            </p>

            {peekCourse.learning_objectives && peekCourse.learning_objectives.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                  Key Learning Outcomes
                </span>
                <ul className="space-y-1.5">
                  {peekCourse.learning_objectives.slice(0, 4).map((obj, oIdx) => (
                    <li key={oIdx} className="text-xs text-foreground flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setPeekCourse(null)}>
                Close
              </Button>
              <Link to={`/courses/${peekCourse.id}`}>
                <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white font-bold">
                  Open Full Curriculum
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
