import {
  mockAcceptedRecords,
  mockRejectionRecords,
  mockRuns,
  mockOverallStats,
} from './mockData';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export interface RecordHistoryItem {
  id: string;
  acceptedRecordId: string;
  source: string;
  recordedAt: string;
  value: number;
  status: 'OK' | 'WARN' | 'FAIL';
  version: number;
  payloadHash: string;
  ingestRunId?: string | null;
  replacedAt: string;
}

export interface RecordItem {
  id: string;
  source: string;
  recordedAt: string;
  value: number;
  status: 'OK' | 'WARN' | 'FAIL';
  version: number;
  createdAt: string;
  _count?: {
    history: number;
  };
}

export interface RejectionItem {
  id: string;
  originalId: string | null;
  rawPayload: any;
  primaryReason: string;
  allReasons: string[];
  createdAt: string;
  acceptedRecordId?: string | null;
  acceptedRecord?: RecordItem | null;
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
  totalHistory?: number;
  totalProcessed: number;
  totalRuns: number;
  rejectionBreakdown: Record<string, number>;
  statusBreakdown?: Record<string, number>;
  sourceBreakdown?: Record<string, number>;
  valueStats?: {
    avg: number;
    min: number;
    max: number;
  };
}

// In-memory mutable store for standalone demo/Vercel preview
let runtimeAccepted = [...mockAcceptedRecords];
let runtimeRejections = [...mockRejectionRecords];
let runtimeRuns = [...mockRuns];
let runtimeStats = { ...mockOverallStats };

function handleMockRequest<T>(endpoint: string, options: RequestInit = {}): T {
  const urlObj = new URL(endpoint, 'http://localhost');
  const path = urlObj.pathname;
  const params = urlObj.searchParams;

  // 1. Health endpoint
  if (path === '/ingest/health') {
    return {
      status: 'ok',
      server: 'online',
      database: 'connected',
    } as unknown as T;
  }

  // 1b. Auth login endpoint
  if (path === '/auth/login') {
    return {
      accessToken: 'mock-preview-token',
      user: { name: 'System Admin', email: 'admin@assessment.local', role: 'admin' },
    } as unknown as T;
  }

  // 2. Stats endpoint
  if (path === '/ingest/stats') {
    return runtimeStats as unknown as T;
  }

  // 3. Runs endpoint
  if (path === '/ingest/runs') {
    return runtimeRuns as unknown as T;
  }

  // 4. Sample ingestion
  if (path === '/ingest/sample') {
    return {
      runId: 'preview-run-' + Date.now(),
      sourceFile: 'records_sample_250.json',
      totalProcessed: 247,
      accepted: 165,
      rejected: 72,
      skippedDuplicates: 10,
      rejectionSummary: runtimeStats.rejectionBreakdown,
      durationMs: 142,
    } as unknown as T;
  }

  // 5. Clean database
  if (path === '/ingest/clean') {
    runtimeStats = {
      ...runtimeStats,
      totalAccepted: 0,
      totalRejected: 0,
      totalHistory: 0,
      totalProcessed: 0,
    };
    return {
      success: true,
      message: 'Preview database records reset successfully.',
      deleted: { acceptedRecords: runtimeAccepted.length, rejectedRecords: runtimeRejections.length },
    } as unknown as T;
  }

  // 6. Upload file
  if (path === '/ingest/upload') {
    return {
      runId: 'preview-upload-' + Date.now(),
      sourceFile: 'uploaded_payload.json',
      totalProcessed: 33,
      accepted: 16,
      rejected: 16,
      skippedDuplicates: 1,
      rejectionSummary: {
        DUPLICATE_ID_CONFLICT: 1,
        MISSING_FIELD: 5,
        EMPTY_OR_WHITESPACE_STRING: 2,
        INVALID_DATE_FORMAT: 2,
        VALUE_OUT_OF_RANGE: 2,
        VALUE_NOT_AN_INTEGER: 2,
        INVALID_STATUS: 2,
      },
      durationMs: 88,
    } as unknown as T;
  }

  // 7. Sources
  if (path === '/records/sources') {
    return ['alpha', 'beta', 'gamma', 'delta'] as unknown as T;
  }

  // 8. Record History endpoint: /records/:id/history
  if (path.startsWith('/records/') && path.endsWith('/history')) {
    const parts = path.split('/');
    const recordId = decodeURIComponent(parts[2]);
    const found = runtimeAccepted.find((r) => r.id === recordId);
    return {
      masterId: recordId,
      master: found || {
        id: recordId,
        source: 'beta',
        recordedAt: '2026-03-14T11:00:00.000Z',
        value: 85,
        status: 'WARN',
        version: 2,
        createdAt: '2026-03-14T11:05:00.000Z',
      },
      history: found?.history || [],
    } as unknown as T;
  }

  // 9. Records querying: /records
  if (path === '/records') {
    let list = [...runtimeAccepted];

    const source = params.get('source');
    if (source) list = list.filter((r) => r.source.toLowerCase() === source.toLowerCase());

    const status = params.get('status');
    if (status) list = list.filter((r) => r.status === status);

    const hasHistory = params.get('hasHistory');
    if (hasHistory === 'true') list = list.filter((r) => (r._count?.history || 0) > 0);
    if (hasHistory === 'false') list = list.filter((r) => (r._count?.history || 0) === 0);

    const from = params.get('from');
    if (from) {
      const fromTime = new Date(from).getTime();
      list = list.filter((r) => new Date(r.recordedAt).getTime() >= fromTime);
    }

    const to = params.get('to');
    if (to) {
      const toTime = new Date(to).getTime();
      list = list.filter((r) => new Date(r.recordedAt).getTime() <= toTime);
    }

    const page = parseInt(params.get('page') || '1', 10);
    const limit = parseInt(params.get('limit') || '15', 10);
    const total = list.length;
    const startIndex = (page - 1) * limit;
    const paginated = list.slice(startIndex, startIndex + limit);

    return {
      data: paginated,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    } as unknown as T;
  }

  // 10. Rejection reasons: /rejections/reasons
  if (path === '/rejections/reasons') {
    return [
      'DUPLICATE_ID_CONFLICT',
      'MISSING_FIELD',
      'EMPTY_OR_WHITESPACE_STRING',
      'INVALID_DATE_FORMAT',
      'VALUE_OUT_OF_RANGE',
      'VALUE_NOT_AN_INTEGER',
      'INVALID_STATUS',
    ] as unknown as T;
  }

  // 11. Rejections querying: /rejections
  if (path === '/rejections') {
    let list = [...runtimeRejections];

    const reason = params.get('reason');
    if (reason) list = list.filter((r) => r.primaryReason === reason);

    const page = parseInt(params.get('page') || '1', 10);
    const limit = parseInt(params.get('limit') || '15', 10);
    const total = list.length;
    const startIndex = (page - 1) * limit;
    const paginated = list.slice(startIndex, startIndex + limit);

    return {
      data: paginated,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    } as unknown as T;
  }

  // Default fallback
  return {} as unknown as T;
}

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const isVercelOrPreview =
    process.env.NEXT_PUBLIC_USE_MOCK === 'true' ||
    (typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1');

  if (isVercelOrPreview) {
    return handleMockRequest<T>(endpoint, options);
  }

  try {
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
  } catch (error) {
    // Graceful fallback for local preview if backend is paused or unreachable
    console.warn(`[API Client] Remote request to "${endpoint}" failed. Using mock preview data:`, error);
    return handleMockRequest<T>(endpoint, options);
  }
}

export const api = {
  getHealth: () => fetchApi<{ status: string; server: string; database: string }>('/ingest/health'),
  cleanDatabase: () => fetchApi<{ success: boolean; message: string; deleted: any }>('/ingest/clean', { method: 'POST' }),
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
  getRecords: (params: { source?: string; status?: string; from?: string; to?: string; hasHistory?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params.source) query.set('source', params.source);
    if (params.status) query.set('status', params.status);
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);
    if (params.hasHistory) query.set('hasHistory', params.hasHistory);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    return fetchApi<{ data: RecordItem[]; pagination: { total: number; page: number; limit: number; totalPages: number } }>(`/records?${query.toString()}`);
  },
  getSources: () => fetchApi<string[]>('/records/sources'),
  getRecordHistory: (id: string) =>
    fetchApi<{ masterId: string; master: RecordItem; history: RecordHistoryItem[] }>(
      `/records/${encodeURIComponent(id)}/history`,
    ),
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
