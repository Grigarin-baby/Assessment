import { RecordValidatorService } from './record-validator.service';
import { DateNormalizerService } from './date-normalizer.service';
import { REJECTION_REASONS } from '../../domain/types';

describe('RecordValidatorService', () => {
  let validator: RecordValidatorService;

  beforeEach(() => {
    const normalizer = new DateNormalizerService();
    validator = new RecordValidatorService(normalizer);
  });

  it('should accept a fully valid record', () => {
    const record = {
      id: 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
      source: 'alpha',
      recordedAt: '2026-03-14T09:12:00Z',
      value: 42,
      status: 'OK',
    };

    const res = validator.validate(record);
    expect(res.isValid).toBe(true);
    expect(res.normalizedRecord).toBeDefined();
    expect(res.normalizedRecord?.value).toBe(42);
    expect(res.normalizedRecord?.status).toBe('OK');
    expect(res.normalizedRecord?.payloadHash).toBeDefined();
  });

  it('should reject a record with missing fields', () => {
    const record = {
      id: 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
      source: 'alpha',
      // recordedAt missing
      value: 42,
      status: 'OK',
    };

    const res = validator.validate(record);
    expect(res.isValid).toBe(false);
    expect(res.allReasons).toContain(REJECTION_REASONS.MISSING_FIELD);
  });

  it('should reject whitespace-only strings for text fields', () => {
    const record = {
      id: '   ',
      source: 'alpha',
      recordedAt: '2026-03-14T09:12:00Z',
      value: 42,
      status: 'OK',
    };

    const res = validator.validate(record);
    expect(res.isValid).toBe(false);
    expect(res.allReasons).toContain(REJECTION_REASONS.EMPTY_OR_WHITESPACE_STRING);
  });

  it('should trim valid text fields that have padding whitespace', () => {
    const record = {
      id: 'r-001',
      source: '  alpha-sensor  ',
      recordedAt: '2026-03-14T09:12:00Z',
      value: 42,
      status: 'OK',
    };

    const res = validator.validate(record);
    expect(res.isValid).toBe(true);
    expect(res.normalizedRecord?.source).toBe('alpha-sensor');
  });

  it('should reject non-integer float values', () => {
    const record = {
      id: 'r-001',
      source: 'alpha',
      recordedAt: '2026-03-14T09:12:00Z',
      value: 42.5,
      status: 'OK',
    };

    const res = validator.validate(record);
    expect(res.isValid).toBe(false);
    expect(res.allReasons).toContain(REJECTION_REASONS.VALUE_NOT_AN_INTEGER);
  });

  it('should reject values out of range (< 0 or > 100)', () => {
    const neg = validator.validate({
      id: 'r-001',
      source: 'alpha',
      recordedAt: '2026-03-14T09:12:00Z',
      value: -1,
      status: 'OK',
    });
    expect(neg.isValid).toBe(false);
    expect(neg.allReasons).toContain(REJECTION_REASONS.VALUE_OUT_OF_RANGE);

    const over = validator.validate({
      id: 'r-001',
      source: 'alpha',
      recordedAt: '2026-03-14T09:12:00Z',
      value: 101,
      status: 'OK',
    });
    expect(over.isValid).toBe(false);
    expect(over.allReasons).toContain(REJECTION_REASONS.VALUE_OUT_OF_RANGE);
  });

  it('should reject status not in OK, WARN, FAIL', () => {
    const res = validator.validate({
      id: 'r-001',
      source: 'alpha',
      recordedAt: '2026-03-14T09:12:00Z',
      value: 50,
      status: 'PENDING',
    });
    expect(res.isValid).toBe(false);
    expect(res.allReasons).toContain(REJECTION_REASONS.INVALID_STATUS);
  });

  it('should accumulate multiple errors for forensic recoverability', () => {
    const record = {
      id: '   ', // whitespace
      source: 'alpha',
      recordedAt: 'bad-date', // invalid date
      value: 999, // out of range
      status: 'ERROR', // invalid status
    };

    const res = validator.validate(record);
    expect(res.isValid).toBe(false);
    expect(res.allReasons).toContain(REJECTION_REASONS.EMPTY_OR_WHITESPACE_STRING);
    expect(res.allReasons).toContain(REJECTION_REASONS.INVALID_DATE_FORMAT);
    expect(res.allReasons).toContain(REJECTION_REASONS.VALUE_OUT_OF_RANGE);
    expect(res.allReasons).toContain(REJECTION_REASONS.INVALID_STATUS);
    expect(res.primaryReason).toBeDefined();
  });
});
