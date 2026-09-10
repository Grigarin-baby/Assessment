export type RecordStatusType = 'OK' | 'WARN' | 'FAIL';

export const VALID_STATUSES: RecordStatusType[] = ['OK', 'WARN', 'FAIL'];

export interface RawRecord {
  id?: unknown;
  source?: unknown;
  recordedAt?: unknown;
  value?: unknown;
  status?: unknown;
  [key: string]: unknown;
}

export interface NormalizedRecord {
  id: string;
  source: string;
  recordedAt: Date;
  value: number;
  status: RecordStatusType;
  payloadHash: string;
}

export interface ValidationResult {
  isValid: boolean;
  normalizedRecord?: NormalizedRecord;
  primaryReason?: string;
  allReasons: string[];
}

export const REJECTION_REASONS = {
  MALFORMED_RECORD: 'MALFORMED_RECORD',
  MISSING_FIELD: 'MISSING_FIELD',
  EMPTY_OR_WHITESPACE_STRING: 'EMPTY_OR_WHITESPACE_STRING',
  INVALID_DATE_FORMAT: 'INVALID_DATE_FORMAT',
  VALUE_NOT_AN_INTEGER: 'VALUE_NOT_AN_INTEGER',
  VALUE_OUT_OF_RANGE: 'VALUE_OUT_OF_RANGE',
  INVALID_STATUS: 'INVALID_STATUS',
  DUPLICATE_ID_CONFLICT: 'DUPLICATE_ID_CONFLICT',
  OUT_OF_ORDER_DUPLICATE: 'OUT_OF_ORDER_DUPLICATE',
} as const;

export type RejectionReasonType = typeof REJECTION_REASONS[keyof typeof REJECTION_REASONS];

export interface IngestionSummary {
  runId: string;
  sourceFile: string;
  totalProcessed: number;
  accepted: number;
  rejected: number;
  skippedDuplicates: number;
  rejectionSummary: Record<string, number>;
  durationMs: number;
}
