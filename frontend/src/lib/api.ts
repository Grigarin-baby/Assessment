const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export interface RecordItem {
  id: string;
  source: string;
  recordedAt: string;
  value: number;
  status: 'OK' | 'WARN' | 'FAIL';
  version: number;
  createdAt: string;
}

export interface RejectionItem {
  id: string;
  originalId: string | null;
  rawPayload: any;
  primaryReason: string;
  allReasons: string[];
  createdAt: string;
}

export interface IngestRunItem {
  id: string;
  sourceFile: string;
  startedAt: string;
  completedAt: string | null;
  totalRecords: number;
  acceptedCount: number;
  rejectedCount: number;
  rejectionSummary: Record<string, number>;
}

export interface OverallStats {
  totalAccepted: number;
  totalRejected: number;
  totalProcessed: number;
  totalRuns: number;
  rejectionBreakdown: Record<string, number>;
}

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${res.statusText}`);
  }

  return res.json();
}

export const api = {
  getStats: () => fetchApi<OverallStats>('/ingest/stats'),
  getRuns: () => fetchApi<IngestRunItem[]>('/ingest/runs'),
  runSampleIngestion: () => fetchApi<any>('/ingest/sample', { method: 'POST' }),
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetchApi<any>('/ingest/upload', {
      method: 'POST',
      body: formData,
    });
  },
  getRecords: (params: { source?: string; status?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params.source) query.set('source', params.source);
    if (params.status) query.set('status', params.status);
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    return fetchApi<{ data: RecordItem[]; pagination: { total: number; page: number; limit: number; totalPages: number } }>(`/records?${query.toString()}`);
  },
  getSources: () => fetchApi<string[]>('/records/sources'),
  getRejections: (params: { reason?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params.reason) query.set('reason', params.reason);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    return fetchApi<{ data: RejectionItem[]; pagination: { total: number; page: number; limit: number; totalPages: number } }>(`/rejections?${query.toString()}`);
  },
  getReasons: () => fetchApi<string[]>('/rejections/reasons'),
  login: async (email: string, pass: string) => {
    const res = await fetchApi<{ accessToken: string; user: any }>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
    });
    if (typeof window !== 'undefined' && res.accessToken) {
      localStorage.setItem('auth_token', res.accessToken);
      localStorage.setItem('auth_user', JSON.stringify(res.user));
    }
    return res;
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    }
  },
};
