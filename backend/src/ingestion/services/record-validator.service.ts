import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { DateNormalizerService } from './date-normalizer.service';
import {
  RawRecord,
  ValidationResult,
  NormalizedRecord,
  VALID_STATUSES,
  RecordStatusType,
  REJECTION_REASONS,
} from '../../domain/types';

@Injectable()
export class RecordValidatorService {
  constructor(private readonly dateNormalizer: DateNormalizerService) {}

  validate(raw: unknown): ValidationResult {
    const allReasons: string[] = [];

    // 1. Check if raw input is a valid object
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return {
        isValid: false,
        primaryReason: REJECTION_REASONS.MALFORMED_RECORD,
        allReasons: [REJECTION_REASONS.MALFORMED_RECORD],
      };
    }

    const record = raw as RawRecord;

    // 2. Check for missing required fields
    const requiredFields = ['id', 'source', 'recordedAt', 'value', 'status'];
    const missingFields = requiredFields.filter(
      (f) => record[f] === undefined || record[f] === null,
    );

    if (missingFields.length > 0) {
      allReasons.push(REJECTION_REASONS.MISSING_FIELD);
    }

    // 3. String Sanity: id
    let sanitizedId: string | null = null;
    if (record.id !== undefined && record.id !== null) {
      if (typeof record.id !== 'string') {
        allReasons.push(REJECTION_REASONS.EMPTY_OR_WHITESPACE_STRING);
      } else {
        const trimmed = record.id.trim();
        if (trimmed.length === 0) {
          allReasons.push(REJECTION_REASONS.EMPTY_OR_WHITESPACE_STRING);
        } else {
          sanitizedId = trimmed;
        }
      }
    }

    // 4. String Sanity: source
    let sanitizedSource: string | null = null;
    if (record.source !== undefined && record.source !== null) {
      if (typeof record.source !== 'string') {
        allReasons.push(REJECTION_REASONS.EMPTY_OR_WHITESPACE_STRING);
      } else {
        const trimmed = record.source.trim();
        if (trimmed.length === 0) {
          allReasons.push(REJECTION_REASONS.EMPTY_OR_WHITESPACE_STRING);
        } else {
          sanitizedSource = trimmed;
        }
      }
    }

    // 5. Date Validation & Normalization
    let normalizedDate: Date | null = null;
    if (record.recordedAt !== undefined && record.recordedAt !== null) {
      normalizedDate = this.dateNormalizer.normalize(record.recordedAt);
      if (!normalizedDate) {
        allReasons.push(REJECTION_REASONS.INVALID_DATE_FORMAT);
      }
    }

    // 6. Numeric Value Validation
    let validValue: number | null = null;
    if (record.value !== undefined && record.value !== null) {
      if (typeof record.value !== 'number' || !Number.isInteger(record.value)) {
        allReasons.push(REJECTION_REASONS.VALUE_NOT_AN_INTEGER);
      } else if (record.value < 0 || record.value > 100) {
        allReasons.push(REJECTION_REASONS.VALUE_OUT_OF_RANGE);
      } else {
        validValue = record.value;
      }
    }

    // 7. Status Enum Validation
    let validStatus: RecordStatusType | null = null;
    if (record.status !== undefined && record.status !== null) {
      if (typeof record.status !== 'string' || !VALID_STATUSES.includes(record.status as RecordStatusType)) {
        allReasons.push(REJECTION_REASONS.INVALID_STATUS);
      } else {
        validStatus = record.status as RecordStatusType;
      }
    }

    // Determine validity
    if (allReasons.length > 0 || !sanitizedId || !sanitizedSource || !normalizedDate || validValue === null || !validStatus) {
      // Deduplicate reasons
      const uniqueReasons = Array.from(new Set(allReasons));
      const primaryReason = this.resolvePrimaryReason(uniqueReasons);

      return {
        isValid: false,
        primaryReason,
        allReasons: uniqueReasons,
      };
    }

    // Compute deterministic content hash for idempotency checking
    const payloadHash = this.computePayloadHash(
      sanitizedId,
      sanitizedSource,
      normalizedDate,
      validValue,
      validStatus,
    );

    const normalizedRecord: NormalizedRecord = {
      id: sanitizedId,
      source: sanitizedSource,
      recordedAt: normalizedDate,
      value: validValue,
      status: validStatus,
      payloadHash,
    };

    return {
      isValid: true,
      normalizedRecord,
      allReasons: [],
    };
  }

  private resolvePrimaryReason(reasons: string[]): string {
    const priority = [
      REJECTION_REASONS.MALFORMED_RECORD,
      REJECTION_REASONS.MISSING_FIELD,
      REJECTION_REASONS.EMPTY_OR_WHITESPACE_STRING,
      REJECTION_REASONS.INVALID_DATE_FORMAT,
      REJECTION_REASONS.VALUE_NOT_AN_INTEGER,
      REJECTION_REASONS.VALUE_OUT_OF_RANGE,
      REJECTION_REASONS.INVALID_STATUS,
      REJECTION_REASONS.DUPLICATE_ID_CONFLICT,
      REJECTION_REASONS.OUT_OF_ORDER_DUPLICATE,
    ];

    for (const p of priority) {
      if (reasons.includes(p)) {
        return p;
      }
    }

    return reasons[0] || 'UNKNOWN_ERROR';
  }

  private computePayloadHash(
    id: string,
    source: string,
    recordedAt: Date,
    value: number,
    status: string,
  ): string {
    const raw = `${id}|${source}|${recordedAt.toISOString()}|${value}|${status}`;
    return createHash('sha256').update(raw).digest('hex');
  }
}
