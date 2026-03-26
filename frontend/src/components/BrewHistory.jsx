export default function BrewHistory({ history, onSelect, selectedId }) {
  if (!history || history.length === 0) {
    return (
      <div className="text-center text-stone-400 text-sm py-8">
        No brews recorded yet
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-coffee-800 mb-3 flex items-center gap-2">
        <span>📋</span> Brew History
      </h2>
      <div className="overflow-x-auto rounded-lg border border-stone-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-100 text-left text-xs text-stone-500 uppercase tracking-wider">
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Bean</th>
              <th className="px-3 py-2">Roast</th>
              <th className="px-3 py-2">Grinder</th>
              <th className="px-3 py-2">Setting</th>
              <th className="px-3 py-2">Dose</th>
              <th className="px-3 py-2">Yield</th>
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Tags</th>
              <th className="px-3 py-2 text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {history.map((brew) => {
              const isSelected = brew.id === selectedId;
              return (
                <tr
                  key={brew.id}
                  onClick={() => onSelect(brew.id)}
                  className={`cursor-pointer border-t border-stone-100 transition-colors ${
                    isSelected
                      ? "bg-coffee-50"
                      : "hover:bg-stone-50"
                  }`}
                >
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-stone-500">
                    {formatDate(brew.date)}
                  </td>
                  <td className="px-3 py-2 font-medium">{brew.bean_name}</td>
                  <td className="px-3 py-2 capitalize text-stone-600">
                    {brew.roast_level}
                  </td>
                  <td className="px-3 py-2 text-stone-600">
                    {brew.grinder_brand}
                  </td>
                  <td className="px-3 py-2 font-mono text-stone-600">
                    {brew.grinder_setting}
                  </td>
                  <td className="px-3 py-2 font-mono text-stone-600">
                    {brew.dose_weight}g
                  </td>
                  <td className="px-3 py-2 font-mono text-stone-600">
                    {brew.actual_yield}g
                  </td>
                  <td className="px-3 py-2 font-mono text-stone-600">
                    {brew.total_time_s}s
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {(brew.taste_tags || []).slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-stone-200 px-1.5 py-0.5 text-xs text-stone-600"
                        >
                          {tag}
                        </span>
                      ))}
                      {(brew.taste_tags || []).length > 3 && (
                        <span className="text-xs text-stone-400">
                          +{brew.taste_tags.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <ScoreBadge score={brew.score} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScoreBadge({ score }) {
  const color =
    score >= 80
      ? "bg-emerald-100 text-emerald-700"
      : score >= 50
        ? "bg-amber-100 text-amber-700"
        : "bg-red-100 text-red-700";

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${color}`}
    >
      {score}
    </span>
  );
}

function formatDate(isoStr) {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoStr;
  }
}
