export default function AnalysisPanel({ data }) {
  if (!data) {
    return (
      <div className="flex items-center justify-center py-8 text-stone-400 text-xs">
        Upload a brew to see analysis
      </div>
    );
  }

  const { stats, issues, suggestions, grinder_suggestion, score, brew } = data;

  const scoreColor = score >= 80 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-red-600";
  const scoreBg = score >= 80 ? "bg-emerald-50 border-emerald-200" : score >= 50 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";

  return (
    <div className="space-y-2 text-xs">
      {/* Score + quick stats row */}
      <div className={`flex items-center justify-between rounded border px-3 py-2 ${scoreBg}`}>
        <div className="space-y-0.5">
          {stats && (
            <div className="flex gap-3 text-stone-600">
              <span><b>{stats.total_yield}g</b> yield</span>
              <span><b>{stats.total_time_s}s</b></span>
              <span><b>1:{stats.brew_ratio}</b> ratio</span>
              <span><b>{stats.number_of_pours}</b> pours</span>
            </div>
          )}
          {stats?.avg_flow_rate_per_pour?.length > 0 && (
            <div className="text-stone-400">
              Flow: {stats.avg_flow_rate_per_pour.map((f, i) => (
                <span key={i}>{i > 0 && " · "}{f} ml/s</span>
              ))}
            </div>
          )}
        </div>
        <span className={`text-2xl font-bold ml-3 ${scoreColor}`}>{score}</span>
      </div>

      {/* Issues */}
      {issues?.length > 0 && (
        <div className="rounded border border-red-200 bg-red-50 px-2 py-1.5">
          <div className="font-semibold text-red-700 mb-0.5">Issues</div>
          <ul className="space-y-0.5 text-red-800">
            {issues.map((issue, i) => <li key={i} className="flex gap-1"><span>·</span><span>{issue}</span></li>)}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      {suggestions?.length > 0 && (
        <div className="rounded border border-blue-200 bg-blue-50 px-2 py-1.5">
          <div className="font-semibold text-blue-700 mb-0.5">Suggestions</div>
          <ul className="space-y-0.5 text-blue-800">
            {suggestions.map((s, i) => <li key={i} className="flex gap-1"><span>·</span><span>{s}</span></li>)}
          </ul>
        </div>
      )}

      {/* Grinder */}
      {grinder_suggestion && (
        <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5">
          <span className="font-semibold text-amber-700">Grinder: </span>
          <span className="text-amber-800">{grinder_suggestion}</span>
        </div>
      )}

      {/* Taste tags */}
      {brew?.taste_tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {brew.taste_tags.map((tag) => (
            <span key={tag} className="rounded-full bg-stone-100 border border-stone-200 px-2 py-0.5 text-stone-600">{tag}</span>
          ))}
        </div>
      )}
      {brew?.taste_notes && (
        <p className="italic text-stone-400 text-xs">"{brew.taste_notes}"</p>
      )}
    </div>
  );
}
