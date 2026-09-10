import { RecordValidatorService } from './services/record-validator.service';
import { DateNormalizerService } from './services/date-normalizer.service';
import { UpdateIfNewerStrategy } from './strategies/deduplication.strategy';
import { IngestionService } from './services/ingestion.service';

describe('Ingestion Idempotency & Deduplication (Requirement R3)', () => {
  let ingestionService: IngestionService;
  let mockPrisma: any;
  let dbAcceptedRecords: Map<string, any>;
  let dbRejectedRecords: any[];
  let dbIngestRuns: any[];

  beforeEach(() => {
    dbAcceptedRecords = new Map();
    dbRejectedRecords = [];
    dbIngestRuns = [];
    const dbRecordHistory: any[] = [];

    mockPrisma = {
      ingestRun: {
        create: jest.fn().mockImplementation(({ data }) => {
          const run = { id: `run-${Date.now()}-${Math.random()}`, ...data };
          dbIngestRuns.push(run);
          return Promise.resolve(run);
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const run = dbIngestRuns.find((r) => r.id === where.id);
          if (run) Object.assign(run, data);
          return Promise.resolve(run);
        }),
      },
      acceptedRecord: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(dbAcceptedRecords.get(where.id) || null);
        }),
        create: jest.fn().mockImplementation(({ data }) => {
          dbAcceptedRecords.set(data.id, { ...data, version: 1 });
          return Promise.resolve(data);
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const existing = dbAcceptedRecords.get(where.id);
          const updated = { ...existing, ...data, version: (existing?.version || 1) + 1 };
          dbAcceptedRecords.set(where.id, updated);
          return Promise.resolve(updated);
        }),
      },
      recordHistory: {
        create: jest.fn().mockImplementation(({ data }) => {
          const hist = { id: `hist-${Date.now()}-${Math.random()}`, ...data };
          dbRecordHistory.push(hist);
          return Promise.resolve(hist);
        }),
      },
      rejectedRecord: {
        create: jest.fn().mockImplementation(({ data }) => {
          const rec = { id: `rej-${Date.now()}`, ...data };
          dbRejectedRecords.push(rec);
          return Promise.resolve(rec);
        }),
      },
    };

    const normalizer = new DateNormalizerService();
    const validator = new RecordValidatorService(normalizer);
    const strategy = new UpdateIfNewerStrategy();
    ingestionService = new IngestionService(mockPrisma, validator, strategy);
  });

  it('R3: Running ingestion twice over the exact same dataset must NOT duplicate records', async () => {
    const dataset = [
      { id: 'uuid-1', source: 'alpha', recordedAt: '2026-03-14T10:00:00Z', value: 50, status: 'OK' },
      { id: 'uuid-2', source: 'beta', recordedAt: '2026-03-14T10:01:00Z', value: 60, status: 'WARN' },
      { id: 'uuid-3', source: 'gamma', recordedAt: '2026-03-14T10:02:00Z', value: 70, status: 'FAIL' },
    ];

    // First Run
    const run1 = await ingestionService.ingestPayload(dataset, 'batch_test_1');
    expect(run1.accepted).toBe(3);
    expect(run1.rejected).toBe(0);
    expect(run1.skippedDuplicates).toBe(0);
    expect(dbAcceptedRecords.size).toBe(3);

    // Second Run (Exact Same Dataset)
    const run2 = await ingestionService.ingestPayload(dataset, 'batch_test_2');
    expect(run2.accepted).toBe(0);
    expect(run2.rejected).toBe(0);
    expect(run2.skippedDuplicates).toBe(3); // All 3 records were idempotently skipped!

    // Database state remains exactly 3 records
    expect(dbAcceptedRecords.size).toBe(3);
  });

  it('Handles conflicting intra-batch and cross-batch updates with parent/child history', async () => {
    // 1. Initial ingestion (Master version 1)
    await ingestionService.ingestPayload([
      { id: 'r-100', source: 'alpha', recordedAt: '2026-03-14T10:00:00Z', value: 20, status: 'OK' },
    ]);
    expect(dbAcceptedRecords.get('r-100').value).toBe(20);

    // 2. Newer timestamp -> updates master and archives previous version to recordHistory
    const updateRun = await ingestionService.ingestPayload([
      { id: 'r-100', source: 'alpha', recordedAt: '2026-03-14T10:30:00Z', value: 85, status: 'WARN' },
    ]);
    expect(updateRun.accepted).toBe(1);
    expect(dbAcceptedRecords.get('r-100').value).toBe(85);
    expect(dbAcceptedRecords.get('r-100').status).toBe('WARN');
    expect(mockPrisma.recordHistory.create).toHaveBeenCalledTimes(1);

    // 3. Older timestamp -> accepted into recordHistory as child revision; master remains latest
    const staleRun = await ingestionService.ingestPayload([
      { id: 'r-100', source: 'alpha', recordedAt: '2026-03-14T09:00:00Z', value: 10, status: 'FAIL' },
    ]);
    expect(staleRun.accepted).toBe(1);
    expect(dbAcceptedRecords.get('r-100').value).toBe(85);
    expect(mockPrisma.recordHistory.create).toHaveBeenCalledTimes(2);

    // 4. Same timestamp with conflicting payload -> rejected with DUPLICATE_ID_CONFLICT and acceptedRecordId linked
    const conflictRun = await ingestionService.ingestPayload([
      { id: 'r-100', source: 'alpha', recordedAt: '2026-03-14T10:30:00Z', value: 99, status: 'FAIL' },
    ]);
    expect(conflictRun.rejected).toBe(1);
    expect(conflictRun.rejectionSummary['DUPLICATE_ID_CONFLICT']).toBe(1);
    const lastRejection = dbRejectedRecords[dbRejectedRecords.length - 1];
    expect(lastRejection.acceptedRecordId).toBe('r-100');
  });
});
