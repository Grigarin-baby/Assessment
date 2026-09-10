import { UpdateIfNewerStrategy, StrictRejectDuplicateStrategy } from './deduplication.strategy';
import { NormalizedRecord, REJECTION_REASONS } from '../../domain/types';

describe('Deduplication Strategies', () => {
  describe('UpdateIfNewerStrategy', () => {
    let strategy: UpdateIfNewerStrategy;

    beforeEach(() => {
      strategy = new UpdateIfNewerStrategy();
    });

    it('should SKIP if payload hash is identical (idempotency)', () => {
      const existing = {
        id: 'r-001',
        recordedAt: new Date('2026-03-14T10:00:00Z'),
        value: 42,
        status: 'OK',
        payloadHash: 'hash-abc-123',
      };

      const incoming: NormalizedRecord = {
        id: 'r-001',
        source: 'alpha',
        recordedAt: new Date('2026-03-14T10:00:00Z'),
        value: 42,
        status: 'OK',
        payloadHash: 'hash-abc-123',
      };

      const decision = strategy.evaluate(existing, incoming);
      expect(decision.action).toBe('SKIP');
    });

    it('should UPDATE if incoming record has newer recordedAt timestamp', () => {
      const existing = {
        id: 'r-001',
        recordedAt: new Date('2026-03-14T10:00:00Z'),
        value: 42,
        status: 'OK',
        payloadHash: 'hash-old',
      };

      const incoming: NormalizedRecord = {
        id: 'r-001',
        source: 'alpha',
        recordedAt: new Date('2026-03-14T10:15:00Z'), // 15 mins newer
        value: 85,
        status: 'WARN',
        payloadHash: 'hash-new',
      };

      const decision = strategy.evaluate(existing, incoming);
      expect(decision.action).toBe('UPDATE');
    });

    it('should REJECT if incoming record has older recordedAt timestamp', () => {
      const existing = {
        id: 'r-001',
        recordedAt: new Date('2026-03-14T10:00:00Z'),
        value: 42,
        status: 'OK',
        payloadHash: 'hash-newer',
      };

      const incoming: NormalizedRecord = {
        id: 'r-001',
        source: 'alpha',
        recordedAt: new Date('2026-03-14T09:45:00Z'), // 15 mins older
        value: 10,
        status: 'FAIL',
        payloadHash: 'hash-older',
      };

      const decision = strategy.evaluate(existing, incoming);
      expect(decision.action).toBe('REJECT');
      if (decision.action === 'REJECT') {
        expect(decision.reason).toBe(REJECTION_REASONS.OUT_OF_ORDER_DUPLICATE);
      }
    });
  });

  describe('StrictRejectDuplicateStrategy', () => {
    let strategy: StrictRejectDuplicateStrategy;

    beforeEach(() => {
      strategy = new StrictRejectDuplicateStrategy();
    });

    it('should reject any conflict regardless of timestamp', () => {
      const existing = {
        id: 'r-001',
        recordedAt: new Date('2026-03-14T10:00:00Z'),
        value: 42,
        status: 'OK',
        payloadHash: 'hash-1',
      };

      const incoming: NormalizedRecord = {
        id: 'r-001',
        source: 'alpha',
        recordedAt: new Date('2026-03-14T11:00:00Z'),
        value: 50,
        status: 'OK',
        payloadHash: 'hash-2',
      };

      const decision = strategy.evaluate(existing, incoming);
      expect(decision.action).toBe('REJECT');
      if (decision.action === 'REJECT') {
        expect(decision.reason).toBe(REJECTION_REASONS.DUPLICATE_ID_CONFLICT);
      }
    });
  });
});
