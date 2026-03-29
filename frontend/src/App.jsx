import { useState, useEffect, useCallback } from "react";
import BrewLogger from "./components/BrewLogger";
import BrewCurveChart from "./components/BrewCurveChart";
import AnalysisPanel from "./components/AnalysisPanel";
import ChatPanel from "./components/ChatPanel";
import BrewHistory from "./components/BrewHistory";

export default function App() {
  const [currentBrew, setCurrentBrew] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rightTab, setRightTab] = useState("analysis"); // "analysis" | "chat"

  const reloadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/brews");
      if (res.ok) setHistory(await res.json());
    } catch { /* silent */ }
  }, []);

  useEffect(() => { reloadHistory(); }, [reloadHistory]);

  async function handleSubmit(formData) {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/brews", { method: "POST", body: formData });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.detail || `Server error (${res.status})`);
      }
      const data = await res.json();
      setCurrentBrew(data);
      setRightTab("analysis");
      reloadHistory();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function handleSelectBrew(brewId) {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/brews/${brewId}`);
      if (!res.ok) throw new Error("Failed to load brew");
      setCurrentBrew(await res.json());
      setRightTab("analysis");
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-sm">
      {/* Header */}
      <header className="bg-coffee-800 text-white px-4 py-2 shadow-md">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <h1 className="font-bold tracking-tight flex items-center gap-2">
            ☕ Coffee Brew Dashboard
          </h1>
          <span className="text-xs text-coffee-200 hidden sm:block">Pour-over analysis & logging</span>
        </div>
      </header>

      {error && (
        <div className="bg-red-100 border-b border-red-300 px-4 py-1 text-xs text-red-800 flex items-center gap-2">
          <strong>Error:</strong> {error}
          <button className="underline text-red-600" onClick={() => setError(null)}>dismiss</button>
        </div>
      )}

      <main className="flex-1 max-w-screen-2xl mx-auto w-full p-3 md:p-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">

          {/* Left: Brew Logger */}
          <div className="lg:col-span-3">
            <div className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
              <BrewLogger onSubmit={handleSubmit} loading={loading} />
            </div>
          </div>

          {/* Center: Chart */}
          <div className="lg:col-span-6">
            <div className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
              <BrewCurveChart
                series={currentBrew?.series}
                phases={currentBrew?.phases}
                events={currentBrew?.events}
              />
            </div>
          </div>

          {/* Right: Analysis / Chat tabs */}
          <div className="lg:col-span-3">
            <div className="rounded-lg border border-stone-200 bg-white shadow-sm overflow-hidden">
              {/* Tab bar */}
              <div className="flex border-b border-stone-200 text-xs font-medium">
                <button
                  onClick={() => setRightTab("analysis")}
                  className={`flex-1 px-3 py-2 ${rightTab === "analysis" ? "bg-white border-b-2 border-coffee-600 text-coffee-700" : "bg-stone-50 text-stone-500 hover:text-stone-700"}`}
                >
                  🔬 Analysis
                </button>
                <button
                  onClick={() => setRightTab("chat")}
                  className={`flex-1 px-3 py-2 ${rightTab === "chat" ? "bg-white border-b-2 border-coffee-600 text-coffee-700" : "bg-stone-50 text-stone-500 hover:text-stone-700"}`}
                >
                  💬 Chat
                </button>
              </div>
              <div className="p-3">
                {rightTab === "analysis"
                  ? <AnalysisPanel data={currentBrew} />
                  : <ChatPanel brew={currentBrew} />
                }
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: History */}
        <div className="mt-3 rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
          <BrewHistory
            history={history}
            onSelect={handleSelectBrew}
            selectedId={currentBrew?.brew?.id}
          />
        </div>
      </main>

      <footer className="bg-stone-100 border-t border-stone-200 px-4 py-2 text-center text-xs text-stone-400">
        Coffee Brew Dashboard · FastAPI + React + Recharts
      </footer>
    </div>
  );
}
