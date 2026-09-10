import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import {
  IngestionRule,
  RuleContext,
  RuleEngineResult,
} from './rule.interface';
import {
  NormalizedRecord,
  RawRecord,
  RecordStatusType,
  REJECTION_REASONS,
} from '../../domain/types';
import { RequiredFieldsRule } from './built-in/required-fields.rule';
import { IdSanityRule } from './built-in/id-sanity.rule';
import { SourceSanityRule } from './built-in/source-sanity.rule';
import { DateNormalizerRule } from './built-in/date-normalizer.rule';
import { IntegerRangeRule } from './built-in/integer-range.rule';
import { StatusEnumRule } from './built-in/status-enum.rule';

@Injectable()
export class RuleEngineService {
  private readonly logger = new Logger(RuleEngineService.name);
  private readonly rules: IngestionRule[] = [];

  constructor(
    requiredFieldsRule: RequiredFieldsRule,
    idSanityRule: IdSanityRule,
    sourceSanityRule: SourceSanityRule,
    dateNormalizerRule: DateNormalizerRule,
    integerRangeRule: IntegerRangeRule,
    statusEnumRule: StatusEnumRule,
  ) {
    this.registerRule(requiredFieldsRule);
    this.registerRule(idSanityRule);
    this.registerRule(sourceSanityRule);
    this.registerRule(dateNormalizerRule);
    this.registerRule(integerRangeRule);
    this.registerRule(statusEnumRule);
  }

  registerRule(rule: IngestionRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => a.priority - b.priority);
  }

  getActiveRules(): { code: string; name: string; description: string; priority: number }[] {
    return this.rules.map((r) => ({
      code: r.code,
      name: r.name,
      description: r.description,
      priority: r.priority,
    }));
  }

  evaluate(raw: unknown): RuleEngineResult {
    // 1. Structure check: must be a valid JSON object (not null, not array, not primitive)
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return {
        isValid: false,
        primaryReason: REJECTION_REASONS.MALFORMED_RECORD,
        allReasons: [REJECTION_REASONS.MALFORMED_RECORD],
      };
    }

    const record = raw as RawRecord;
    const context: RuleContext = {
      sanitizedFields: new Map<string, unknown>(),
      errors: [],
    };

    // 2. Sequential rule execution pipeline
    for (const rule of this.rules) {
      rule.execute(record, context);
    }

    // 3. Validation result check
    if (context.errors.length > 0) {
      const uniqueReasons = Array.from(new Set(context.errors));
      const primaryReason = this.resolvePrimaryReason(uniqueReasons);

      return {
        isValid: false,
        primaryReason,
        allReasons: uniqueReasons,
      };
    }

    // 4. Extract sanitized values
    const id = context.sanitizedFields.get('id') as string;
    const source = context.sanitizedFields.get('source') as string;
    const recordedAt = context.sanitizedFields.get('recordedAt') as Date;
    const value = context.sanitizedFields.get('value') as number;
    const status = context.sanitizedFields.get('status') as RecordStatusType;

    if (!id || !source || !recordedAt || value === undefined || !status) {
      return {
        isValid: false,
        primaryReason: REJECTION_REASONS.MISSING_FIELD,
        allReasons: [REJECTION_REASONS.MISSING_FIELD],
      };
    }

    // 5. Deterministic fingerprint computation (SHA-256)
    const payloadHash = this.computePayloadHash(id, source, recordedAt, value, status);

    const normalizedRecord: NormalizedRecord = {
      id,
      source,
      recordedAt,
      value,
      status,
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
