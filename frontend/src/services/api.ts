// frontend/src/services/api.ts
// Typed client for the /api/tariff/* endpoints (HS Code Lookup).
// Set VITE_API_BASE_URL in frontend/.env(.local), e.g.:
//   VITE_API_BASE_URL=http://localhost:8000        (local FastAPI/uvicorn)
//   VITE_API_BASE_URL=https://your-app.onrender.com (Render deployment)

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export interface HsCodeSearchResult {
  id: number;
  ahtn_code: string;
  description: string;
  indent_level: number;
  is_quota: boolean;
  quota_type: "in_quota" | "out_quota" | null;
  chapter_no: number | null;
  footnote: string | null;
  rate: number | null;
  year: number;
}

export interface TariffRateItem {
  year: number;
  rate: number | null;
}

export interface HsCodeDetail {
  id: number;
  ahtn_code: string;
  description: string;
  indent_level: number;
  is_quota: boolean;
  quota_type: "in_quota" | "out_quota" | null;
  chapter_no: number | null;
  footnote: string | null;
  tariff_rates: TariffRateItem[];
}

export interface TariffChapter {
  chapter_no: number;
  chapter_title: string | null;
  section_no: number | null;
  section_title: string | null;
}

export interface SearchHsCodesParams {
  q?: string;
  codePrefix?: string;
  chapter?: number;
  code?: string;
  year?: number;
  limit?: number;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed with status ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/** GET /api/tariff/codes — search/filter HS codes. Returns [] when nothing matches. */
export async function searchHsCodes(
  params: SearchHsCodesParams = {}
): Promise<HsCodeSearchResult[]> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.codePrefix) qs.set("code_prefix", params.codePrefix);
  if (params.chapter != null) qs.set("chapter", String(params.chapter));
  if (params.code) qs.set("code", params.code);
  if (params.year != null) qs.set("year", String(params.year));
  if (params.limit != null) qs.set("limit", String(params.limit));

  const res = await fetch(`${API_BASE_URL}/api/tariff/codes?${qs.toString()}`);
  return handleResponse<HsCodeSearchResult[]>(res);
}

/** GET /api/tariff/code/{ahtnCode} — full detail + all years of rates. Throws on 404. */
export async function getHsCode(ahtnCode: string): Promise<HsCodeDetail> {
  const res = await fetch(`${API_BASE_URL}/api/tariff/code/${encodeURIComponent(ahtnCode)}`);
  return handleResponse<HsCodeDetail>(res);
}

/** GET /api/tariff/chapters — for a chapter filter dropdown. */
export async function listTariffChapters(): Promise<TariffChapter[]> {
  const res = await fetch(`${API_BASE_URL}/api/tariff/chapters`);
  return handleResponse<TariffChapter[]>(res);
}
