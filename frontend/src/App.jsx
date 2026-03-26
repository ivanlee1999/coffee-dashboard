import { useState, useEffect, useCallback } from "react";
import BrewLogger from "./components/BrewLogger";
import BrewCurveChart from "./components/BrewCurveChart";
import AnalysisPanel from "./components/AnalysisPanel";
import BrewHistory from "./components/BrewHistory";

export default function App() {
  const [currentBrew, setCurrentBrew] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reloadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/brews");
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch {
      // silently ignore history load errors
    }
  }, []);

  useEffect(() => {
    reloadHistory();
  }, [reloadHistory]);

  async function handleSubmit(formData) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/brews", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || `Server error (${res.status})`);
      }
      const data = await res.json();
      setCurrentBrew(data);
      reloadHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectBrew(brewId) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/brews/${brewId}`);
      if (!res.ok) throw new Error("Failed to load brew");
      const data = await res.json();
      setCurrentBrew(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-coffee-800 text-white px-6 py-3 shadow-md">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            ☕ Coffee Brew Dashboard
          </h1>
          <span className="text-xs text-coffee-200">
            Pour-over analysis & logging
          </span>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="bg-red-100 border-b border-red-300 px-6 py-2 text-sm text-red-800">
          <strong>Error:</strong> {error}
          <button
            className="ml-3 underline text-red-600"
            onClick={() => setError(null)}
          >
            dismiss
          </button>
        </div>
      )}

      {/* Main grid */}
      <main className="flex-1 max-w-screen-2xl mx-auto w-full p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Brew Logger */}
          <div className="lg:col-span-3">
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <BrewLogger onSubmit={handleSubmit} loading={loading} />
            </div>
          </div>

          {/* Center: Chart */}
          <div className="lg:col-span-6">
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm min-h-[400px]">
              <BrewCurveChart
                series={currentBrew?.series}
                phases={currentBrew?.phases}
                events={currentBrew?.events}
              />
            </div>
          </div>

          {/* Right: Analysis */}
          <div className="lg:col-span-3">
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm min-h-[400px]">
              <AnalysisPanel data={currentBrew} />
            </div>
          </div>
        </div>

        {/* Bottom: History */}
        <div className="mt-6 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <BrewHistory
            history={history}
            onSelect={handleSelectBrew}
            selectedId={currentBrew?.brew?.id}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-stone-100 border-t border-stone-200 px-6 py-3 text-center text-xs text-stone-400">
        Coffee Brew Dashboard &middot; FastAPI + React + Recharts
      </footer>
    </div>
  );
}
