import { useState } from "react";
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
  const [selectedView, setSelectedView] = useState<"month" | "week" | "day" | "upcoming">("month");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");

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
        return "bg-rose-500/10 text-rose-700 border-rose-300";
      case "live":
        return "bg-purple-500/10 text-purple-700 border-purple-300";
      case "course":
        return "bg-blue-500/10 text-blue-700 border-blue-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-300";
    }
  };

  const getEventDot = (type: CalendarEvent["type"]) => {
    switch (type) {
      case "deadline":
        return "bg-rose-500";
      case "live":
        return "bg-purple-500";
      case "course":
        return "bg-blue-500";
      case "user":
        return "bg-emerald-500";
      case "site":
        return "bg-slate-900";
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Month selector & arrows */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5">
            <button
              type="button"
              className="p-1 rounded-md text-slate-600 hover:bg-slate-100 transition-colors"
              title="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="p-1 rounded-md text-slate-600 hover:bg-slate-100 transition-colors"
              title="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            November 2026
          </h2>

          <button
            type="button"
            className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            Today
          </button>
        </div>

        {/* Course Filter Dropdown & View Toggles */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Real Learnova course filter select */}
          <div className="flex items-center gap-2">
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              <option value="all">All Learnova Courses</option>
              <option value="devops">Full-Stack Cloud & DevOps Engineering</option>
              <option value="ai-llm">Enterprise AI Engineering & Large Language Models</option>
              <option value="python-data">Advanced Python & Distributed Data Systems</option>
              <option value="cybersecurity">Enterprise Cybersecurity & Zero Trust Systems</option>
            </select>
          </div>

          {/* View selector pills */}
          <div className="inline-flex rounded-lg bg-slate-100 p-1 gap-1 text-xs font-semibold">
            {(["month", "week", "day", "upcoming"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setSelectedView(v)}
                className={`px-3 py-1 rounded-md capitalize transition-colors ${
                  selectedView === v
                    ? "bg-[#0B374D] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Legend Row */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600 px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span>Deadlines</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span>Course Modules</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
          <span>Live Workshops</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Self-Assessments</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
          <span>Platform Exams</span>
        </div>
      </div>

      {/* Views Rendering */}
      {selectedView === "month" && (
        /* Full Monthly Grid */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center py-2 text-[11px] font-bold text-slate-500 tracking-wider">
            {weekdays.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
            {/* Empty padding cells for days prior to 1st */}
            {Array.from({ length: paddingDays }).map((_, i) => (
              <div key={`pad-${i}`} className="min-h-[105px] p-2 bg-slate-50/30 text-slate-300 text-xs font-semibold" />
            ))}

            {/* Actual days of November */}
            {Array.from({ length: totalDays }).map((_, i) => {
              const dayNum = i + 1;
              const isToday = dayNum === 21;
              const dayEvents = filteredEvents.filter((e) => e.day === dayNum);

              return (
                <div
                  key={`day-${dayNum}`}
                  className={`min-h-[115px] p-2 transition-colors flex flex-col justify-between ${
                    isToday ? "bg-amber-50/40" : "hover:bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-extrabold w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-700"
                      }`}
                    >
                      {dayNum}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        {dayEvents.length} {dayEvents.length === 1 ? "item" : "items"}
                      </span>
                    )}
                  </div>

                  {/* Event pills inside the day */}
                  <div className="space-y-1 flex-1 overflow-y-auto max-h-[85px]">
                    {dayEvents.map((evt) => (
                      <div
                        key={evt.id}
                        title={`${evt.time} · [${evt.courseName}] ${evt.title}`}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate border flex items-center gap-1 ${getEventBadge(
                          evt.type
                        )}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getEventDot(evt.type)}`} />
                        <span className="font-mono font-bold shrink-0">{evt.time}</span>
                        <span className="truncate">{evt.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedView === "week" && (
        /* Week View (16 Nov - 22 Nov 2026) */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Week of 16 Nov – 22 Nov 2026</h3>
              <p className="text-xs text-slate-500">Learnova course lectures, hands-on labs, and assessment checkpoints.</p>
            </div>
            <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-2.5 py-1 rounded-full">Current Week</span>
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
                    isToday ? "border-indigo-500 bg-indigo-50/20 shadow-xs" : "border-slate-200 bg-slate-50/40"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{dayName}</span>
                      <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-indigo-600 text-white" : "text-slate-700"}`}>
                        {dayNum}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {dayEvents.map((evt) => (
                        <div
                          key={evt.id}
                          className={`p-2 rounded-lg text-[10px] border ${getEventBadge(evt.type)}`}
                        >
                          <div className="flex items-center justify-between text-[9px] text-slate-500 font-bold mb-0.5">
                            <span className="font-mono">{evt.time}</span>
                            <span className="uppercase">{evt.type}</span>
                          </div>
                          <span className="font-semibold line-clamp-2">{evt.title}</span>
                          <span className="text-[9px] text-slate-400 block truncate mt-1">{evt.courseName}</span>
                        </div>
                      ))}
                      {dayEvents.length === 0 && (
                        <p className="text-[11px] text-slate-400 italic pt-6 text-center">No schedule</p>
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
        /* Day View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-8 space-y-6">
          <div className="max-w-xl mx-auto space-y-2 text-center">
            <h3 className="text-xl font-bold text-slate-900">Saturday, 21 November 2026 (Today)</h3>
            <p className="text-sm text-slate-500">Scheduled events for Learnova courses on this date.</p>
          </div>

          <div className="max-w-2xl mx-auto space-y-3">
            {filteredEvents.filter((e) => e.day === 21).length > 0 ? (
              filteredEvents
                .filter((e) => e.day === 21)
                .map((evt) => (
                  <div
                    key={evt.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-10 rounded-full ${getEventDot(evt.type)}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-indigo-700">{evt.time}</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-200/80 px-2 py-0.5 rounded">
                            {evt.type}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mt-0.5">{evt.title}</h4>
                        <p className="text-xs text-slate-500">{evt.courseName}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="text-xs font-bold px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs"
                    >
                      Access →
                    </button>
                  </div>
                ))
            ) : (
              <div className="py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50/60 text-center">
                <p className="text-sm font-medium text-slate-400">No scheduled sessions for the selected course on this date.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedView === "upcoming" && (
        /* Upcoming View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Upcoming Learnova Course Milestones</h3>
              <p className="text-xs text-slate-500">Live workshops, module deadlines, and certification checkpoints</p>
            </div>
            <span className="text-xs text-slate-500 font-medium">Sorted chronologically</span>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">THIS WEEK'S ACTIVE SESSIONS</span>
              
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4 hover:border-indigo-300 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-10 rounded-full bg-rose-500" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      Kubernetes Production Ingress & Storage Exam
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Saturday, 21 Nov · 09:00 AM · Full-Stack Cloud & DevOps Engineering
                    </p>
                  </div>
                </div>
                <button type="button" className="text-xs font-bold px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
                  Open Quiz →
                </button>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4 hover:border-purple-300 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-10 rounded-full bg-purple-500" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      Cloud Security Incident Response Live Simulation
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Saturday, 21 Nov · 02:30 PM · Enterprise Cybersecurity & Zero Trust Systems
                    </p>
                  </div>
                </div>
                <button type="button" className="text-xs font-bold px-3.5 py-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700">
                  Join Workshop →
                </button>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4 hover:border-purple-300 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-10 rounded-full bg-purple-500" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      Enterprise AI Model Guardrails & Evals Live Stream
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Saturday, 28 Nov · 02:30 PM · Enterprise AI Engineering & Large Language Models
                    </p>
                  </div>
                </div>
                <button type="button" className="text-xs font-bold px-3.5 py-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700">
                  Join Stream →
                </button>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4 hover:border-rose-300 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-10 rounded-full bg-rose-500" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      Zero Trust & mTLS Knowledge Check Assessment
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Saturday, 28 Nov · 11:59 PM · Enterprise Cybersecurity & Zero Trust Systems
                    </p>
                  </div>
                </div>
                <button type="button" className="text-xs font-bold px-3.5 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700">
                  Take Exam →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
