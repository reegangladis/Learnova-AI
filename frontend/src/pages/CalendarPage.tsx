import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarEvent {
  id: string;
  day: number;
  time: string;
  title: string;
  type: "deadline" | "course" | "live" | "user" | "site";
}

export function CalendarPage() {
  const [selectedView, setSelectedView] = useState<"month" | "week" | "day" | "upcoming">("month");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");

  const events: CalendarEvent[] = [
    { id: "e1", day: 4, time: "23:59", title: "FEEDBACK-International Business", type: "deadline" },
    { id: "e2", day: 6, time: "15:00", title: "What's New? What's Next in AI", type: "course" },
    { id: "e3", day: 6, time: "18:00", title: "Learners' Check-in Session", type: "course" },
    { id: "e4", day: 7, time: "09:00", title: "26VMC0C101 Internal Assessment", type: "course" },
    { id: "e5", day: 7, time: "14:30", title: "Operating Systems by Prof. K", type: "live" },
    { id: "e6", day: 9, time: "09:00", title: "Continuous Assessment 1", type: "deadline" },
    { id: "e7", day: 11, time: "23:59", title: "FEEDBACK-International Business", type: "deadline" },
    { id: "e8", day: 14, time: "14:30", title: "Nexora July 2026 Batch", type: "live" },
    { id: "e9", day: 14, time: "23:00", title: "FEEDBACK-International Business", type: "deadline" },
    { id: "e10", day: 17, time: "16:00", title: "Data Structures and Algorithms", type: "course" },
    { id: "e11", day: 17, time: "19:00", title: "Artificial Intelligence Lab", type: "live" },
    { id: "e12", day: 18, time: "16:00", title: "Operating Systems Lecture", type: "course" },
    { id: "e13", day: 18, time: "19:00", title: "Python Programming Live Coding", type: "live" },
    { id: "e14", day: 19, time: "16:00", title: "Mathematical Foundations", type: "course" },
    { id: "e15", day: 19, time: "23:00", title: "FEEDBACK-International Business", type: "deadline" },
    { id: "e16", day: 20, time: "15:00", title: "What's New? System Design", type: "course" },
    { id: "e17", day: 21, time: "09:00", title: "26VMC0C101 Mid-term Exam", type: "deadline" },
    { id: "e18", day: 21, time: "14:30", title: "Operating Systems Review", type: "live" },
    { id: "e19", day: 28, time: "14:30", title: "Operating Systems Capstone", type: "live" },
    { id: "e20", day: 30, time: "16:00", title: "Monthly Assessment Round", type: "deadline" },
  ];

  // Days in November 2026 (Starts on Sunday in standard calendar, Monday in ISO: Nov 1, 2026 is Sunday)
  // Matching Screenshot 3 layout:
  // Mon, Tue, Wed, Thu, Fri, Sat, Sun
  // Days 1..30 with empty padding for days before the 1st
  const weekdays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  // November 1, 2026 is a Sunday (index 6 in Mon-based week)
  const paddingDays = 6; 
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
      {/* Top Header Controls (Screenshot 3) */}
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
          {/* Course filter select */}
          <div className="flex items-center gap-2">
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#0B374D]"
            >
              <option value="all">All courses</option>
              <option value="py">1.2 Python Programming</option>
              <option value="ai">1.3 Artificial Intelligence</option>
              <option value="mf">1.4 Mathematical Foundation</option>
              <option value="os">1.5 Operating System</option>
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

      {/* Legend Row (Screenshot 3) */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600 px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span>Deadlines</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span>Course</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
          <span>Live class</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>User</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
          <span>Site</span>
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
              const dayEvents = events.filter((e) => e.day === dayNum);

              return (
                <div
                  key={`day-${dayNum}`}
                  className={`min-h-[110px] p-2 transition-colors flex flex-col justify-between ${
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
                  </div>

                  {/* Event pills inside the day */}
                  <div className="space-y-1 flex-1 overflow-y-auto max-h-[85px]">
                    {dayEvents.map((evt) => (
                      <div
                        key={evt.id}
                        title={`${evt.time} ${evt.title}`}
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
            <h3 className="text-base font-bold text-slate-900">Week of 16 Nov – 22 Nov 2026</h3>
            <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-2.5 py-1 rounded-full">Current Week</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {[16, 17, 18, 19, 20, 21, 22].map((dayNum, idx) => {
              const dayName = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"][idx];
              const dayEvents = events.filter((e) => e.day === dayNum);
              const isToday = dayNum === 21;
              return (
                <div
                  key={dayNum}
                  className={`rounded-xl border p-3 flex flex-col justify-between min-h-[220px] ${
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
                          className={`p-1.5 rounded-lg text-[10px] border ${getEventBadge(evt.type)}`}
                        >
                          <span className="font-mono font-bold block">{evt.time}</span>
                          <span className="line-clamp-2 mt-0.5">{evt.title}</span>
                        </div>
                      ))}
                      {dayEvents.length === 0 && (
                        <p className="text-[11px] text-slate-400 italic pt-4 text-center">No schedule</p>
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-8 text-center space-y-4">
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-xl font-bold text-slate-900">Sunday, 22 November 2026</h3>
            <p className="text-sm text-slate-500">Scheduled live classes, lab milestones, and assignment deadlines.</p>
            <div className="py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50/60 mt-4">
              <p className="text-sm font-medium text-slate-400">Nothing here for this date.</p>
              <button
                type="button"
                onClick={() => setSelectedView("month")}
                className="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline"
              >
                Return to full month calendar
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedView === "upcoming" && (
        /* Upcoming View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Upcoming Academic Schedule</h3>
            <span className="text-xs text-slate-500">Sorted chronologically</span>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">THIS WEEK</span>
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-10 rounded-full bg-rose-500" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">26VMC0C101 Mid-term Exam Submission</h4>
                    <p className="text-[11px] text-slate-500">Saturday, 21 Nov · 09:00 AM</p>
                  </div>
                </div>
                <button type="button" className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Open →</button>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-10 rounded-full bg-purple-500" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Operating Systems Review Live Stream</h4>
                    <p className="text-[11px] text-slate-500">Saturday, 21 Nov · 02:30 PM</p>
                  </div>
                </div>
                <button type="button" className="text-xs font-bold px-3 py-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700">Join →</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
