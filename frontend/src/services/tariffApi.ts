// frontend/src/services/tariffApi.ts
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
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || 
