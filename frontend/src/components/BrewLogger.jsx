import { useState, useRef } from "react";

const TASTE_OPTIONS = [
  "Bitter",
  "Sour",
  "Flat",
  "Sweet",
  "Balanced",
  "Astringent",
  "Weak",
  "Strong",
];

const ROAST_LEVELS = ["light", "medium", "dark"];

export default function BrewLogger({ onSubmit, loading }) {
  const [form, setForm] = useState({
    bean_name: "",
    roast_level: "light",
    grinder_brand: "",
    grinder_setting: "",
    dose_weight: "",
    target_yield: "",
    taste_notes: "",
  });
  const [selectedTags, setSelectedTags] = useState([]);
  const [file, setFile] = useState(null);
  const fileRef = useRef(null);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function toggleTag(tag) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!file) return;

    const fd = new FormData();
    fd.append("bean_name", form.bean_name);
    fd.append("roast_level", form.roast_level);
    fd.append("grinder_brand", form.grinder_brand);
    fd.append("grinder_setting", form.grinder_setting);
    fd.append("dose_weight", form.dose_weight);
    fd.append("target_yield", form.target_yield);
    fd.append("taste_tags", JSON.stringify(selectedTags));
    fd.append("taste_notes", form.taste_notes);
    fd.append("file", file);

    onSubmit(fd);
  }

  const inputClass =
    "w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-coffee-500 focus:outline-none focus:ring-1 focus:ring-coffee-500";
  const labelClass = "block text-xs font-medium text-stone-600 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold text-coffee-800 flex items-center gap-2">
        <span>☕</span> Brew Logger
      </h2>

      {/* Bean name */}
      <div>
        <label className={labelClass}>Bean Name</label>
        <input
          name="bean_name"
          value={form.bean_name}
          onChange={handleChange}
          required
          placeholder="e.g. Kenya AA"
          className={inputClass}
        />
      </div>

      {/* Roast level */}
      <div>
        <label className={labelClass}>Roast Level</label>
        <select
          name="roast_level"
          value={form.roast_level}
          onChange={handleChange}
          className={inputClass}
        >
          {ROAST_LEVELS.map((r) => (
            <option key={r} value={r}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Grinder */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Grinder Brand</label>
          <input
            name="grinder_brand"
            value={form.grinder_brand}
            onChange={handleChange}
            required
            placeholder="e.g. Comandante"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Grinder Setting</label>
          <input
            name="grinder_setting"
            type="number"
            step="any"
            value={form.grinder_setting}
            onChange={handleChange}
            required
            placeholder="e.g. 24"
            className={inputClass}
          />
        </div>
      </div>

      {/* Dose / Yield */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Dose (g)</label>
          <input
            name="dose_weight"
            type="number"
            step="any"
            value={form.dose_weight}
            onChange={handleChange}
            required
            placeholder="e.g. 20"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Target Yield (g)</label>
          <input
            name="target_yield"
            type="number"
            step="any"
            value={form.target_yield}
            onChange={handleChange}
            required
            placeholder="e.g. 320"
            className={inputClass}
          />
        </div>
      </div>

      {/* File upload */}
      <div>
        <label className={labelClass}>Brew Curve (.xlsx)</label>
        <div
          className={`relative rounded-md border-2 border-dashed px-3 py-4 text-center text-sm cursor-pointer transition-colors ${
            file
              ? "border-coffee-400 bg-coffee-50 text-coffee-700"
              : "border-stone-300 text-stone-500 hover:border-coffee-400"
          }`}
          onClick={() => fileRef.current?.click()}
        >
          {file ? file.name : "Click to select .xlsx file"}
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>
      </div>

      {/* Taste tags */}
      <div>
        <label className={labelClass}>Taste Tags</label>
        <div className="flex flex-wrap gap-2">
          {TASTE_OPTIONS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedTags.includes(tag)
                  ? "bg-coffee-600 text-white shadow-sm"
                  : "bg-stone-200 text-stone-600 hover:bg-stone-300"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Taste notes */}
      <div>
        <label className={labelClass}>Taste Notes (free text)</label>
        <textarea
          name="taste_notes"
          value={form.taste_notes}
          onChange={handleChange}
          rows={2}
          placeholder="e.g. Dry finish, lingering bitterness"
          className={inputClass + " resize-none"}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !file}
        className="w-full rounded-md bg-coffee-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-coffee-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Analysing..." : "Upload & Analyse"}
      </button>
    </form>
  );
}
