import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarEvent {
  id: string;
  day: number;
  time: string;
  title: string;
  courseId: "devops" | "ai-llm" | "python-data" | "cybersecurity" | "general";
  courseName: string;
  type: "deadline" | "course" | "live" | "user" | "site";
}

export function CalendarPage() {
  const navigate = useNavigate();
  const [selectedView, setSelectedView] = useState<"month" | "week" | "day" | "upcoming">("month");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [selectedDayNum, setSelectedDayNum] = useState<number>(21);

  const courseRouteMap: Record<CalendarEvent["courseId"], string> = {
    devops: "/courses/c-devops-01",
    "ai-llm": "/courses/c-ai-01",
    "python-data": "/courses/c-python-01",
    cybersecurity: "/courses/c-security-01",
    general: "/courses",
  };

  // Real Learnova curriculum events based on the 4 enterprise courses seeded in Learnova AI
  const events: CalendarEvent[] = [
    {
      id: "e1",
      day: 3,
      time: "15:00",
      title: "Container Architecture & Dockerfile Optimization",
      courseId: "devops",
      courseName: "Full-Stack Cloud & DevOps",
      type: "course",
    },
    {
      id: "e2",
      day: 4,
      time: "23:59",
      title: "Docker Multi-Stage Build Self-Assessment",
      courseId: "devops",
      courseName: "Full-Stack Cloud & DevOps",
      type: "deadline",
    },
    {
      id: "e3",
      day: 6,
      time: "15:00",
      title: "Transformer Attention Mechanics Masterclass",
      courseId: "ai-llm",
      courseName: "Enterprise AI & LLMs",
      type: "live",
    },
    {
      id: "e4",
      day: 6,
      time: "18:00",
      title: "Cloud & DevOps Architecture Check-in",
      courseId: "devops",
      courseName: "Full-Stack Cloud & DevOps",
      type: "course",
    },
    {
      id: "e5",
      day: 7,
      time: "09:00",
      title: "Cloud & Containers Competency Quiz",
      courseId: "devops",
      courseName: "Full-Stack Cloud & DevOps",
      type: "course",
    },
    {
      id: "e6",
      day: 7,
      time: "14:30",
      title: "Kubernetes Cluster Pod Networking Lab",
      courseId: "devops",
      courseName: "Full-Stack Cloud & DevOps",
      type: "live",
    },
    {
      id: "e7",
      day: 9,
      time: "09:00",
      title: "Python Concurrency & GIL Internals Module",
      courseId: "python-data",
      courseName: "Advanced Python & Distributed Data",
      type: "course",
    },
    {
      id: "e8",
      day: 11,
      time: "23:59",
      title: "Asyncio Event Loop Benchmark Submission",
      courseId: "python-data",
      courseName: "Advanced Python & Distributed Data",
      type: "deadline",
    },
    {
      id: "e9",
      day: 13,
      time: "16:00",
      title: "Zero Trust Network Architecture & mTLS",
      courseId: "cybersecurity",
      courseName: "Cybersecurity & Zero Trust",
      type: "course",
    },
    {
      id: "e10",
      day: 14,
      time: "14:30",
      title: "Enterprise LLM Prompting & RAG Live Workshop",
      courseId: "ai-llm",
      courseName: "Enterprise AI & LLMs",
      type: "live",
    },
    {
      id: "e11",
      day: 14,
      time: "23:00",
      title: "Vector Embedding Benchmark Milestone",
      courseId: "ai-llm",
      courseName: "Enterprise AI & LLMs",
      type: "deadline",
    },
    {
      id: "e12",
      day: 17,
      time: "16:00",
      title: "Distributed Data with PySpark & Kafka",
      courseId: "python-data",
      courseName: "Advanced Python & Distributed Data",
      type: "course",
    },
    {
      id: "e13",
      day: 17,
      time: "19:00",
      title: "Kubernetes Ingress & GitOps CI/CD Lab",
      courseId: "devops",
      courseName: "Full-Stack Cloud & DevOps",
      type: "live",
    },
    {
      id: "e14",
      day: 18,
      time: "16:00",
      title: "Zero Trust Identity & Microsegmentation",
      courseId: "cybersecurity",
      courseName: "Cybersecurity & Zero Trust",
      type: "course",
    },
    {
      id: "e15",
      day: 18,
      time: "19:00",
      title: "PySpark Cluster Computing Live Coding",
      courseId: "python-data",
      courseName: "Advanced Python & Distributed Data",
      type: "live",
    },
    {
      id: "e16",
      day: 19,
      time: "16:00",
      title: "Cloud Attack Vectors & Threat Modeling",
      courseId: "cybersecurity",
      courseName: "Cybersecurity & Zero Trust",
      type: "course",
    },
    {
      id: "e17",
      day: 19,
      time: "23:00",
      title: "Python Internals & Memory Management Quiz",
      courseId: "python-data",
      courseName: "Advanced Python & Distributed Data",
      type: "deadline",
    },
    {
      id: "e18",
      day: 20,
      time: "15:00",
      title: "Enterprise RAG & Vector Systems Knowledge Check",
      courseId: "ai-llm",
      courseName: "Enterprise AI & LLMs",
      type: "course",
    },
    {
      id: "e19",
      day: 21,
      time: "09:00",
      title: "Kubernetes Production Ingress & Storage Exam",
      courseId: "devops",
      courseName: "Full-Stack Cloud & DevOps",
      type: "deadline",
    },
    {
      id: "e20",
      day: 21,
      time: "14:30",
      title: "Cloud Security Incident Response Live Simulation",
      courseId: "cybersecurity",
      courseName: "Cybersecurity & Zero Trust",
      type: "live",
    },
    {
      id: "e21",
      day: 24,
      time: "16:00",
      title: "PySpark Streaming Pipeline Architecture",
      courseId: "python-data",
      courseName: "Advanced Python & Distributed Data",
      type: "course",
    },
    {
      id: "e22",
      day: 26,
      time: "18:00",
      title: "OWASP Cloud Top 10 Defense Workshop",
      courseId: "cybersecurity",
      courseName: "Cybersecurity & Zero Trust",
      type: "live",
    },
    {
      id: "e23",
      day: 28,
      time: "14:30",
      title: "Enterprise AI Model Guardrails Live Stream",
      courseId: "ai-llm",
      courseName: "Enterprise AI & LLMs",
      type: "live",
    },
    {
      id: "e24",
      day: 28,
      time: "23:59",
      title: "Zero Trust & mTLS Knowledge Check Assessment",
      courseId: "cybersecurity",
      courseName: "Cybersecurity & Zero Trust",
      type: "deadline",
    },
    {
      id: "e25",
      day: 30,
      time: "16:00",
      title: "Learnova Capstone Project Submissions",
      courseId: "general",
      courseName: "Learnova Academy",
      type: "deadline",
    },
  ];

  // Filter events by selected course
  const filteredEvents =
    selectedCourse === "all" ? events : events.filter((e) => e.courseId === selectedCourse);

  const weekdays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const paddingDays = 6; // November 1, 2026 is a Sunday (index 6 in Mon-based week)
  const totalDays = 30;

  const getEventBadge = (type: CalendarEvent["type"]) => {
    switch (type) {
      case "deadline":
        return "bg-rose-500/12 text-rose-700 dark:text-rose-300 border-rose-500/25";
      case "live":
        return "bg-orange-500/12 text-orange-700 dark:text-orange-300 border-orange-500/25";
      case "course":
        return "bg-teal-500/12 text-teal-700 dark:text-teal-300 border-teal-500/25";
      default:
        return "bg-secondary text-foreground border-border";
    }
  };

  const getEventDot = (type: CalendarEvent["type"]) => {
    switch (type) {
      case "deadline":
        return "bg-rose-500";
      case "live":
        return "bg-orange-500";
      case "course":
        return "bg-teal-600";
      case "user":
        return "bg-emerald-500";
      case "site":
        return "bg-foreground";
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header Controls */}
      <div className="studio-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 border border-border rounded-xl p-0.5 bg-background">
            <button
              type="button"
              onClick={() => setSelectedDayNum((d) => Math.max(1, d - 1))}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              title="Previous day focus"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setSelectedDayNum((d) => Math.min(30, d + 1))}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              title="Next day focus"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            November 2026
          </h2>

          <button
            type="button"
            onClick={() => {
              setSelectedDayNum(21);
              setSelectedView("day");
            }}
            className="text-xs font-bold bg-secondary hover:bg-secondary/80 text-foreground px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
          >
            Today (21st)
          </button>
        </div>

        {/* Course Filter Dropdown & View Toggles */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="text-xs font-semibold bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/40"
            >
              <option value="all">All Learnova Courses</option>
              <option value="devops">Full-Stack Cloud &amp; DevOps Engineering</option>
              <option value="ai-llm">Enterprise AI Engineering &amp; Large Language Models</option>
              <option value="python-data">Advanced Python &amp; Distributed Data Systems</option>
              <option value="cybersecurity">Enterprise Cybersecurity &amp; Zero Trust Systems</option>
            </select>
          </div>

          <div className="inline-flex rounded-xl bg-secondary p-1 gap-1 text-xs font-semibold">
            {(["month", "week", "day", "upcoming"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setSelectedView(v)}
                className={`px-3 py-1 rounded-lg capitalize transition-colors cursor-pointer ${
                  selectedView === v
                    ? "bg-teal-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Legend Row */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-muted-foreground px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span>Deadlines</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
          <span>Course Modules</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
          <span>Live Workshops</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Self-Assessments</span>
        </div>
      </div>

      {/* Views Rendering */}
      {selectedView === "month" && (
        <div className="studio-card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border bg-secondary/50 text-center py-2.5 text-[11px] font-mono font-bold text-muted-foreground tracking-wider">
            {weekdays.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border">
            {Array.from({ length: paddingDays }).map((_, i) => (
              <div key={`pad-${i}`} className="min-h-[105px] p-2 bg-secondary/20" />
            ))}

            {Array.from({ length: totalDays }).map((_, i) => {
              const dayNum = i + 1;
              const isToday = dayNum === 21;
              const isPicked = dayNum === selectedDayNum;
              const dayEvents = filteredEvents.filter((e) => e.day === dayNum);

              return (
                <div
                  key={`day-${dayNum}`}
                  onClick={() => setSelectedDayNum(dayNum)}
                  className={`min-h-[115px] p-2 transition-colors flex flex-col justify-between cursor-pointer ${
                    isPicked
                      ? "bg-teal-500/8 ring-1 ring-inset ring-teal-500/40"
                      : isToday
                      ? "bg-orange-500/5"
                      : "hover:bg-secondary/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-mono font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                        isPicked
                          ? "bg-teal-600 text-white shadow-xs"
                          : isToday
                          ? "bg-orange-500 text-white"
                          : "text-foreground"
                      }`}
                    >
                      {dayNum}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {dayEvents.length} {dayEvents.length === 1 ? "item" : "items"}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 flex-1 overflow-y-auto max-h-[85px]">
                    {dayEvents.map((evt) => (
                      <button
                        key={evt.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(courseRouteMap[evt.courseId]);
                        }}
                        title={`${evt.time} · [${evt.courseName}] ${evt.title}`}
                        className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate border flex items-center gap-1 cursor-pointer hover:opacity-90 ${getEventBadge(
                          evt.type
                        )}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getEventDot(evt.type)}`} />
                        <span className="font-mono font-bold shrink-0">{evt.time}</span>
                        <span className="truncate">{evt.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedView === "week" && (
        <div className="studio-card p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h3 className="font-display text-base font-bold text-foreground">
                Week of 16 Nov – 22 Nov 2026
              </h3>
              <p className="text-xs text-muted-foreground">
                Learnova course lectures, hands-on labs, and assessment checkpoints.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-teal-700 dark:text-teal-300 bg-teal-500/10 px-2.5 py-1 rounded-full">
              Current Week
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {[16, 17, 18, 19, 20, 21, 22].map((dayNum, idx) => {
              const dayName = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"][idx];
              const dayEvents = filteredEvents.filter((e) => e.day === dayNum);
              const isToday = dayNum === 21;
              return (
                <div
                  key={dayNum}
                  className={`rounded-xl border p-3 flex flex-col justify-between min-h-[240px] ${
                    isToday ? "border-teal-500 bg-teal-500/5" : "border-border bg-secondary/30"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">
                        {dayName}
                      </span>
                      <span
                        className={`text-xs font-mono font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                          isToday ? "bg-teal-600 text-white" : "text-foreground"
                        }`}
                      >
                        {dayNum}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {dayEvents.map((evt) => (
                        <button
                          key={evt.id}
                          type="button"
                          onClick={() => navigate(courseRouteMap[evt.courseId])}
                          className={`w-full text-left p-2 rounded-lg text-[10px] border cursor-pointer ${getEventBadge(
                            evt.type
                          )}`}
                        >
                          <div className="flex items-center justify-between text-[9px] font-mono font-bold mb-0.5 opacity-80">
                            <span>{evt.time}</span>
                            <span className="uppercase">{evt.type}</span>
                          </div>
                          <span className="font-semibold line-clamp-2 block">{evt.title}</span>
                          <span className="text-[9px] opacity-75 block truncate mt-1">
                            {evt.courseName}
                          </span>
                        </button>
                      ))}
                      {dayEvents.length === 0 && (
                        <p className="text-[11px] text-muted-foreground italic pt-6 text-center">
                          No schedule
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedView === "day" && (
        <div className="studio-card p-8 space-y-6">
          <div className="max-w-xl mx-auto space-y-1 text-center">
            <h3 className="font-display text-xl font-bold text-foreground">
              November {selectedDayNum}, 2026 {selectedDayNum === 21 ? "(Today)" : ""}
            </h3>
            <p className="text-sm text-muted-foreground">
              Click any day or event to jump straight into its Learnova course track.
            </p>
          </div>

          <div className="max-w-2xl mx-auto space-y-3">
            {filteredEvents.filter((e) => e.day === selectedDayNum).length > 0 ? (
              filteredEvents
                .filter((e) => e.day === selectedDayNum)
                .map((evt) => (
                  <div
                    key={evt.id}
                    className="p-4 rounded-xl border border-border bg-secondary/40 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-10 rounded-full ${getEventDot(evt.type)}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-teal-700 dark:text-teal-400">
                            {evt.time}
                          </span>
                          <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground bg-card px-2 py-0.5 rounded border border-border">
                            {evt.type}
                          </span>
                        </div>
                        <h4 className="font-display text-sm font-bold text-foreground mt-0.5">
                          {evt.title}
                        </h4>
                        <p className="text-xs text-muted-foreground">{evt.courseName}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(courseRouteMap[evt.courseId])}
                      className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-teal-600 text-white hover:bg-teal-700 cursor-pointer shrink-0"
                    >
                      Open Course →
                    </button>
                  </div>
                ))
            ) : (
              <div className="py-12 border border-dashed border-border rounded-xl text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  No scheduled sessions on November {selectedDayNum}.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedView === "upcoming" && (
        <div className="studio-card p-6 space-y-6">
          <div className="border-b border-border pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-foreground">
                Upcoming Learnova Course Milestones
              </h3>
              <p className="text-xs text-muted-foreground">
                Live workshops, module deadlines, and certification checkpoints
              </p>
            </div>
            <span className="text-xs font-mono text-muted-foreground">Chronological</span>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-xl border border-border bg-secondary/35 flex items-center justify-between gap-4 hover:border-teal-500/40 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-10 rounded-full bg-rose-500" />
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-foreground">
                    Kubernetes Production Ingress &amp; Storage Exam
                  </h4>
                  <p className="text-[11px] font-mono text-muted-foreground">
                    Saturday, 21 Nov · 09:00 AM · Full-Stack Cloud &amp; DevOps Engineering
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/courses/c-devops-01")}
                className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-teal-600 text-white hover:bg-teal-700 cursor-pointer shrink-0"
              >
                Open Track →
              </button>
            </div>

            <div className="p-4 rounded-xl border border-border bg-secondary/35 flex items-center justify-between gap-4 hover:border-orange-500/40 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-10 rounded-full bg-orange-500" />
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-foreground">
                    Cloud Security Incident Response Live Simulation
                  </h4>
                  <p className="text-[11px] font-mono text-muted-foreground">
                    Saturday, 21 Nov · 02:30 PM · Enterprise Cybersecurity &amp; Zero Trust Systems
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/courses/c-security-01")}
                className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-orange-500 text-white hover:bg-orange-600 cursor-pointer shrink-0"
              >
                Join Workshop →
              </button>
            </div>

            <div className="p-4 rounded-xl border border-border bg-secondary/35 flex items-center justify-between gap-4 hover:border-teal-500/40 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-10 rounded-full bg-teal-600" />
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-foreground">
                    Enterprise AI Model Guardrails &amp; Evals Live Stream
                  </h4>
                  <p className="text-[11px] font-mono text-muted-foreground">
                    Saturday, 28 Nov · 02:30 PM · Enterprise AI Engineering &amp; Large Language Models
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/courses/c-ai-01")}
                className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-teal-600 text-white hover:bg-teal-700 cursor-pointer shrink-0"
              >
                Open Track →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
