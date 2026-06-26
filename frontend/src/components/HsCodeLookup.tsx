// frontend/src/components/HsCodeLookup.tsx
import { useEffect, useState } from "react";
import {
  searchHsCodes,
  getHsCode,
  listTariffChapters,
  type HsCodeSearchResult,
  type HsCodeDetail,
  type TariffChapter,
} from "../services/api";
import "./HsCodeLookup.css";

const CURRENT_YEAR = new Date().getFullYear();

export default function HsCodeLookup() {
  const [query, setQuery] = useState("");
  const [chapter, setChapter] = useState<number | "">("");
  const [chapters, setChapters] = useState<TariffChapter[]>([]);
  const [results, setResults] = useState<HsCodeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<HsCodeDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    listTariffChapters()
      .then(setChapters)
      .catch(() => setChapters([]));
  }, []);

  useEffect(() => {
    if (!query.trim() && chapter === "") {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    const timer = setTimeout(() => {
      searchHsCodes({
        q: query.trim() || undefined,
        chapter: chapter === "" ? undefined : Number(chapter),
        year: CURRENT_YEAR,
        limit: 50,
      })
        .then(setResults)
        .catch((err: Error) => setError(err.message))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, chapter]);

  async function openDetail(ahtnCode: string) {
    setDetailLoading(true);
    setSelected(null);
    setError(null);
    try {
      setSelected(await getHsCode(ahtnCode));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDetailLoading(false);
    }
  }

  const hasQuery = query.trim() !== "" || chapter !== "";

  return (
    <div className="hs-lookup">
      <div className="hs-lookup__controls">
        <input
          className="hs-lookup__search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by description or code (e.g. live horses, 0101.21.00)"
          aria-label="Search HS codes"
        />
        <select
          className="hs-lookup__chapter"
          value={chapter}
          onChange={(e) => setChapter(e.target.value === "" ? "" : Number(e.target.value))}
          aria-label="Filter by chapter"
        >
          <option value="">All chapters</option>
          {chapters.map((c) => (
            <option key={c.chapter_no} value={c.chapter_no}>
              Ch. {c.chapter_no} — {c.chapter_title ?? "Untitled"}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="hs-lookup__error">{error}</p>}
      {loading && <p className="hs-lookup__status">Searching…</p>}
      {!loading && hasQuery && results.length === 0 && !error && (
        <p className="hs-lookup__status">
          No HS codes match that search. Try a broader term or a different chapter.
        </p>
      )}
      {!hasQuery && !loading && (
        <p className="hs-lookup__status">Start typing a description or AHTN code to search.</p>
      )}

      {results.length > 0 && (
        <table className="hs-lookup__table">
          <thead>
            <tr>
              <th>AHTN Code</th>
              <th>Description</th>
              <th>Rate ({CURRENT_YEAR})</th>
              <th>Quota</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.id} onClick={() => openDetail(r.ahtn_code)} tabIndex={0}>
                <td className="hs-lookup__code">{r.ahtn_code}</td>
                <td style={{ paddingLeft: `${r.indent_level * 1.25}rem` }}>{r.description}</td>
                <td>{r.rate != null ? `${r.rate}%` : "—"}</td>
                <td>
                  {r.is_quota ? (
                    <span className={`hs-lookup__badge hs-lookup__badge--${r.quota_type}`}>
                      {r.quota_type === "in_quota" ? "In-Quota" : "Out-Quota"}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {(detailLoading || selected) && (
        <div className="hs-lookup__detail" role="region" aria-label="HS code detail">
          {detailLoading && <p className="hs-lookup__status">Loading detail…</p>}
          {selected && !detailLoading && (
            <>
              <div className="hs-lookup__detail-header">
                <strong className="hs-lookup__code">{selected.ahtn_code}</strong>
                <button onClick={() => setSelected(null)} aria-label="Close detail">
                  ×
                </button>
              </div>
              <p>{selected.description}</p>
              <table className="hs-lookup__rates-table">
                <thead>
                  <tr>
                    <th>Year</th>
                    <th>Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.tariff_rates
                    .slice()
                    .sort((a, b) => a.year - b.year)
                    .map((tr) => (
                      <tr key={tr.year}>
                        <td>{tr.year}</td>
                        <td>{tr.rate != null ? `${tr.rate}%` : "—"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}
