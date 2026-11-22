export function InterestZonePage() {
  const topics = [
    { title: "Generative AI & LLMs in Production", category: "Artificial Intelligence", tag: "Hot" },
    { title: "Zero Trust Cloud Infrastructure", category: "Cybersecurity", tag: "Trending" },
    { title: "Micro-Frontend Architectures with Vite", category: "Web Development", tag: "Tech" },
    { title: "Quantum Computing Algorithms", category: "Emerging Tech", tag: "Research" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="bg-gradient-to-r from-[#0C3E56] via-[#093043] to-[#072433] rounded-2xl p-6 sm:p-8 text-white shadow-md border border-[#144E6D]/40">
        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-sm">
          Exploration
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
          Interest Zone
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-1">
          Curated tech breakthroughs, industry webinars, and interdisciplinary learning paths.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {topics.map((t, idx) => (
          <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-3">
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              {t.tag}
            </span>
            <h3 className="text-sm font-bold text-slate-900 line-clamp-2">{t.title}</h3>
            <p className="text-xs text-slate-500">{t.category}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
