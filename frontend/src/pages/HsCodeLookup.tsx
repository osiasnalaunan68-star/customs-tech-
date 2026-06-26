import { useEffect, useState } from "react";
import { searchHsCodes, getHsCode, listTariffChapters, type HsCodeSearchResult, type HsCodeDetail, type TariffChapter } from "../services/tariffApi";

const CURRENT_YEAR = new Date().getFullYear();

export default function HsCodeLookup() {
  const [query, setQuery] = useState("");
  const [chapterValue, setChapterValue] = useState("all");
  const [chapters, setChapters] = useState<TariffChapter[]>([]);
  const [results, setResults] = useState<HsCodeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<HsCodeDetail | null>(null);

  useEffect(() => {
    listTariffChapters().then(setChapters).catch(() => setChapters([]));
  }, []);

  useEffect(() => {
    const hasFilter = query.trim() !== "" || chapterValue !== "all";
    if (!hasFilter) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    const timer = setTimeout(() => {
      searchHsCodes({
        q: query.trim() || undefined,
        chapter: chapterValue === "all" ? undefined : Number(chapterValue),
        year: CURRENT_YEAR,
        limit: 50,
      })
        .then(setResults)
        .catch((err: Error) => setError(err.message))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, chapterValue]);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 font-sans">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">HS Code Lookup</h1>
        <p className="text-gray-500 mt-1">Search the AHTN tariff schedule by description or code.</p>
      </div>

      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search e.g. live horses, 0101.21.00"
            className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={chapterValue}
            onChange={(e) => setChapterValue(e.target.value)}
            className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Chapters</option>
            {chapters.map((c) => (
              <option key={c.chapter_no} value={String(c.chapter_no)}>
                Ch. {c.chapter_no} — {c.chapter_title?.substring(0, 40)}...
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-red-600 bg-red-50 p-2 rounded">{error}</p>}
        {loading && <p className="text-gray-500">Searching...</p>}

        {results.length > 0 && (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-700 text-sm">
                  <th className="p-3 border-b">AHTN Code</th>
                  <th className="p-3 border-b">Description</th>
                  <th className="p-3 border-b">Rate ({CURRENT_YEAR})</th>
                  <th className="p-3 border-b">Quota</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 text-sm border-b cursor-pointer">
                    <td className="p-3 font-mono text-blue-600">{r.ahtn_code}</td>
                    <td className="p-3" style={{ paddingLeft: `${1 + r.indent_level * 1.5}rem` }}>
                      {r.description}
                    </td>
                    <td className="p-3">{r.rate != null ? `${r.rate}%` : "—"}</td>
                    <td className="p-3">
                      {r.is_quota ? (
                        <span className="px-2 py-1 text-xs rounded bg-orange-100 text-orange-800">
                          {r.quota_type === "in_quota" ? "In-Quota" : "Out-Quota"}
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
