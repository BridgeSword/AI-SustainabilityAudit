const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:9092").replace(/\/$/, "");

export interface ApiCompany {
  id: number;
  name: string;
  sector: string | null;
  country: string | null;
}

export interface ApiReport {
  id: number;
  user_id: number | null;
  company_id: number | null;
  year: number;
  extracted_json: Record<string, unknown>;
  extraction_status: string | null;
  scoring_status: string | null;
  anomaly_status: string | null;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!res.ok) {
    let detail = `Request failed with status ${res.status}`;
    try {
      const payload = await res.json();
      detail = payload?.detail || detail;
    } catch {
      // ignore json parse error
    }
    throw new Error(detail);
  }

  return res.json();
}

export const listCompanies = () => apiFetch<ApiCompany[]>("/companies/");

export const createCompany = (payload: { name: string; sector?: string | null; country?: string | null }) =>
  apiFetch<ApiCompany>("/companies/", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const listReports = () => apiFetch<ApiReport[]>("/reports/");

export const createReport = (payload: {
  company_id?: number | null;
  user_id?: number | null;
  year: number;
  extracted_json: Record<string, unknown>;
}) =>
  apiFetch<ApiReport>("/reports/", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateReport = (
  reportId: number,
  payload: {
    year?: number;
    extracted_json?: Record<string, unknown>;
  }
) =>
  apiFetch<ApiReport>(`/reports/${reportId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const deleteReport = (reportId: number) =>
  apiFetch<{ message: string; report_id: number }>(`/reports/${reportId}`, {
    method: "DELETE",
  });

export async function uploadReportPdf(reportId: number, file: File): Promise<{ job_id: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/pdf/v1/upload?report_id=${reportId}`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.detail || "Failed to upload PDF");
  }

  return data;
}

export async function replacePdf(reportId: number, file: File): Promise<{ job_id: string | null }> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/pdf/v1/replace/${reportId}`, {
    method: "PUT",
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.detail || "Failed to replace PDF");
  }

  return data;
}

export const getPdfDownloadUrl = (reportId: number) =>
  `${API_BASE_URL}/pdf/v1/download/${reportId}`;

export const fixStuckReport = (reportId: number) =>
  apiFetch<{ message: string; report_id: number }>(`/pdf/v1/fix-stuck/${reportId}`, {
    method: "POST",
  });

export const getPdfJobStatus = (jobId: string, reportId: number) =>
  apiFetch<{ job_id: string; report_id: number; status: string; raw_status?: any }>(
    `/pdf/v1/jobs/${jobId}/status?report_id=${reportId}`
  );

export const getPdfJobResult = (jobId: string) =>
  apiFetch<any>(`/pdf/v1/jobs/${jobId}/result`);
