import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
  ReferenceLine,
} from "recharts";

const PHASE_COLORS = [
  "rgba(217, 119, 6, 0.12)",
  "rgba(59, 130, 246, 0.10)",
  "rgba(16, 185, 129, 0.10)",
  "rgba(168, 85, 247, 0.10)",
];

export default function BrewCurveChart({ series, phases, events }) {
  if (!series) {
    return (
      <div className="flex h-full items-center justify-center text-stone-400 text-sm">
        Upload a brew to see the curve
      </div>
    );
  }

  const timeMap = new Map();
  const addSeries = (arr, key) => {
    if (!arr) return;
    arr.forEach(({ t, v }) => {
      if (!timeMap.has(t)) timeMap.set(t, { t });
      timeMap.get(t)[key] = v;
    });
  };

  addSeries(series.flow_out, "flow_out");
  addSeries(series.flow_in, "flow_in");
  addSeries(series.weight, "weight");

  const data = [...timeMap.values()].sort((a, b) => a.t - b.t);

  const eventLines = (events || []).filter(
    (e) => e.type === "bloom_end" || e.type === "drawdown",
  );

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold text-coffee-800 flex items-center gap-2">
        <span>📈</span> Brew Curve
      </h2>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
            <XAxis
              dataKey="t"
              tick={{ fontSize: 11 }}
              label={{ value: "Time (s)", position: "insideBottomRight", offset: -5, fontSize: 11 }}
            />
            <YAxis
              yAxisId="flow"
              tick={{ fontSize: 11 }}
              label={{ value: "ml/s", angle: -90, position: "insideLeft", fontSize: 11 }}
            />
            <YAxis
              yAxisId="weight"
              orientation="right"
              tick={{ fontSize: 11 }}
              label={{ value: "g", angle: 90, position: "insideRight", fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{ fontSize: 12 }}
              formatter={(val, name) => [
                typeof val === "number" ? val.toFixed(1) : val,
                name,
              ]}
              labelFormatter={(t) => `${Number(t).toFixed(1)}s`}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />

            {(phases || []).map((phase, i) => (
              <ReferenceArea
                key={phase.name}
                yAxisId="flow"
                x1={phase.start_s}
                x2={phase.end_s}
                fill={PHASE_COLORS[i % PHASE_COLORS.length]}
                label={{
                  value: phase.name,
                  position: "insideTop",
                  fontSize: 10,
                  fill: "#78716c",
                }}
              />
            ))}

            {eventLines.map((ev, i) => (
              <ReferenceLine
                key={`${ev.type}-${i}`}
                yAxisId="flow"
                x={ev.time_s}
                stroke={ev.type === "bloom_end" ? "#d97706" : "#6366f1"}
                strokeDasharray="4 4"
                label={{
                  value: ev.type === "bloom_end" ? "Bloom End" : "Drawdown",
                  position: "top",
                  fontSize: 10,
                  fill: ev.type === "bloom_end" ? "#d97706" : "#6366f1",
                }}
              />
            ))}

            <Line
              yAxisId="flow"
              type="monotone"
              dataKey="flow_in"
              name="Flow In"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="flow"
              type="monotone"
              dataKey="flow_out"
              name="Flow Out"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
            />
            <Area
              yAxisId="weight"
              type="monotone"
              dataKey="weight"
              name="Weight"
              fill="rgba(16,185,129,0.15)"
              stroke="#10b981"
              strokeWidth={1.5}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
