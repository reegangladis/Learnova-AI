export function GradesPage() {
  const gradeItems = [
    {
      code: "1.1",
      title: "International Business",
      grade: "A",
      score: 88,
      status: "Passed",
      credits: 4,
    },
    {
      code: "1.2",
      title: "Python Programming",
      grade: "A+",
      score: 94,
      status: "Passed",
      credits: 4,
    },
    {
      code: "1.3",
      title: "Artificial Intelligence",
      grade: "B+",
      score: 79,
      status: "In progress",
      credits: 4,
    },
    {
      code: "1.4",
      title: "Mathematical Foundation for Computer Applications",
      grade: "A",
      score: 85,
      status: "Passed",
      credits: 3,
    },
    {
      code: "1.5",
      title: "Operating System",
      grade: "A-",
      score: 82,
      status: "In progress",
      credits: 4,
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0C3E56] via-[#093043] to-[#072433] rounded-2xl p-6 sm:p-8 text-white shadow-md border border-[#144E6D]/40 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-sm">
            Academic Performance
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
            Grades &amp; Transcripts
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Consolidated semester grades, credit breakdown, and grading rubrics.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-[#051C28]/80 p-4 rounded-xl border border-[#16506D]/60 shrink-0">
          <div className="text-center px-2">
            <span className="text-2xl font-extrabold text-amber-400 block leading-none">3.82</span>
            <span className="text-[9px] uppercase font-bold text-slate-400 mt-1 block">CGPA</span>
          </div>
          <div className="h-8 w-px bg-slate-700" />
          <div className="text-center px-2">
            <span className="text-2xl font-extrabold text-sky-400 block leading-none">19</span>
            <span className="text-[9px] uppercase font-bold text-slate-400 mt-1 block">EARNED CREDITS</span>
          </div>
        </div>
      </div>

      {/* Grades Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Semester 1 Courses
          </h3>
          <span className="text-xs text-slate-500 font-medium">5 Enrolled Courses</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-6">Course Code &amp; Title</th>
                <th className="py-3 px-4">Credits</th>
                <th className="py-3 px-4">Score</th>
                <th className="py-3 px-4">Grade</th>
                <th className="py-3 px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gradeItems.map((item) => (
                <tr key={item.code} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-6 font-semibold text-slate-900">
                    <span className="text-sky-700 font-mono mr-2">{item.code}</span>
                    <span>{item.title}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">{item.credits}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{item.score}%</td>
                  <td className="py-3.5 px-4">
                    <span className="font-extrabold px-2.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                      {item.grade}
                    </span>
                  </td>
                  <td className="py-3.5 px-6">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === "Passed"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
