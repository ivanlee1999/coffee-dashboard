export default function AnalysisPanel({ data }) {
  if (!data) {
    return (
      <div className="flex h-full items-center justify-center text-stone-400 text-sm">
        Analysis will appear here after uploading a brew
      </div>
    );
  }

  const { stats, issues, suggestions, grinder_suggestion, score, brew } = data;

  const scoreColor =
    score >= 80
      ? "text-emerald-600"
      : score >= 50
        ? "text-amber-600"
        : "text-red-600";

  const scoreBg =
    score >= 80
      ? "bg-emerald-50 border-emerald-200"
      : score >= 50
        ? "bg-amber-50 border-amber-200"
        : "bg-red-50 border-red-200";

  return (
    <div className="space-y-4 text-sm">
      <h2 className="text-lg font-semibold text-coffee-800 flex items-center gap-2">
        <span>🔬</span> Analysis
      </h2>

      {/* Score badge */}
      <div
        className={`flex items-center justify-between rounded-lg border p-3 ${scoreBg}`}
      >
        <span className="font-medium text-stone-700">Brew Score</span>
        <span className={`text-3xl font-bold ${scoreColor}`}>{score}</span>
      </div>

      {/* Summary stats */}
      {stats && (
        <div className="rounded-lg border border-stone-200 bg-white p-3">
          <h3 className="font-semibold text-stone-700 mb-2">Summary</h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <Stat label="Total Yield" value={`${stats.total_yield}g`} />
            <Stat label="Total Time" value={`${stats.total_time_s}s`} />
            <Stat label="Bloom Weight" value={`${stats.bloom_weight}g`} />
            <Stat label="Pours" value={stats.number_of_pours} />
            <Stat label="Dose" value={`${stats.dose_weight}g`} />
            <Stat
              label="Ratio"
              value={`1:${stats.brew_ratio}`}
            />
          </dl>
          {stats.avg_flow_rate_per_pour?.length > 0 && (
            <div className="mt-2 text-xs text-stone-500">
              Avg flow/pour:{" "}
              {stats.avg_flow_rate_per_pour.map((f, i) => (
                <span key={i} className="font-mono">
                  {i > 0 && " · "}
                  {f} ml/s
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Issues */}
      {issues && issues.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <h3 className="font-semibold text-red-700 mb-1">Issues</h3>
          <ul className="list-disc list-inside space-y-0.5 text-red-800 text-xs">
            {issues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <h3 className="font-semibold text-blue-700 mb-1">Suggestions</h3>
          <ul className="list-disc list-inside space-y-0.5 text-blue-800 text-xs">
            {suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Grinder suggestion */}
      {grinder_suggestion && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <h3 className="font-semibold text-amber-700 mb-1">Grinder</h3>
          <p className="text-amber-800 text-xs">{grinder_suggestion}</p>
        </div>
      )}

      {/* Taste info */}
      {brew && (
        <div className="text-xs text-stone-500 space-y-1">
          {brew.taste_tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {brew.taste_tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-stone-200 px-2 py-0.5 text-stone-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {brew.taste_notes && (
            <p className="italic text-stone-400">"{brew.taste_notes}"</p>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <>
      <dt className="text-stone-500">{label}</dt>
      <dd className="font-medium text-stone-800 text-right">{value}</dd>
    </>
  );
}
