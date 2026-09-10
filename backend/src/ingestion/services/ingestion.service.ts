import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RecordValidatorService } from './record-validator.service';
import {
  UpdateIfNewerStrategy,
  ExistingRecordSnapshot,
} from '../strategies/deduplication.strategy';
import { IngestionSummary, REJECTION_REASONS } from '../../domain/types';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly validator: RecordValidatorService,
    private readonly deduplicationStrategy: UpdateIfNewerStrategy,
  ) {}

  /**
   * Ingests records from a local file path.
   */
  async ingestFile(filePath: string): Promise<IngestionSummary> {
    const startTime = Date.now();

    if (!fs.existsSync(filePath)) {
      throw new Error(`Input file does not exist: ${filePath}`);
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const fileHash = createHash('sha256').update(fileContent).digest('hex');

    // Parse JSON array or NDJSON lines
    let rawRecords: unknown[] = [];
    try {
      rawRecords = this.parseContent(fileContent);
    } catch (err) {
      throw new Error(`Malformed file syntax: ${(err as Error).message}`);
    }

    return this.processRecords(rawRecords, filePath, fileHash, startTime);
  }

  /**
   * Ingests records from a memory buffer or array of objects.
   */
  async ingestPayload(records: unknown[], sourceName: string = 'memory_upload'): Promise<IngestionSummary> {
    const startTime = Date.now();
    const fileHash = createHash('sha256').update(JSON.stringify(records)).digest('hex');
    return this.processRecords(records, sourceName, fileHash, startTime);
  }

  private parseContent(content: string): unknown[] {
    const trimmed = content.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      return JSON.parse(trimmed);
    }

    // Attempt newline-delimited JSON (NDJSON)
    const lines = trimmed.split('\n').filter((l) => l.trim().length > 0);
    return lines.map((line, idx) => {
      try {
        return JSON.parse(line);
      } catch {
        return {
          __malformedLine: line,
          __lineIndex: idx + 1,
        };
      }
    });
  }

  private async processRecords(
    rawRecords: unknown[],
    sourceFile: string,
    fileHash: string,
    startTime: number,
  ): Promise<IngestionSummary> {
    // 1. Initialize IngestRun in database
    const ingestRun = await this.prisma.ingestRun.create({
      data: {
        sourceFile,
        fileHash,
        totalRecords: rawRecords.length,
      },
    });

    let acceptedCount = 0;
    let rejectedCount = 0;
    let skippedDuplicates = 0;
    const rejectionSummary: Record<string, number> = {};

    // In-memory cache for fast deduplication within the current batch
    const batchSeenRecords = new Map<string, ExistingRecordSnapshot>();

    for (const raw of rawRecords) {
      // Check if item was marked as a malformed NDJSON line
      if (raw && typeof raw === 'object' && '__malformedLine' in (raw as Record<string, unknown>)) {
        await this.persistRejection(
          ingestRun.id,
          null,
          JSON.stringify(raw),
          REJECTION_REASONS.MALFORMED_RECORD,
          [REJECTION_REASONS.MALFORMED_RECORD],
        );
        this.incrementRejection(rejectionSummary, REJECTION_REASONS.MALFORMED_RECORD);
        rejectedCount++;
        continue;
      }

      // 2. Validate & Normalize
      const validation = this.validator.validate(raw);

      if (!validation.isValid || !validation.normalizedRecord) {
        const rawObj = raw as Record<string, unknown> | null;
        const extractedId = rawObj && typeof rawObj.id === 'string' ? rawObj.id : null;

        await this.persistRejection(
          ingestRun.id,
          extractedId,
          JSON.stringify(raw),
          validation.primaryReason || 'VALIDATION_FAILED',
          validation.allReasons,
        );

        this.incrementRejection(rejectionSummary, validation.primaryReason || 'VALIDATION_FAILED');
        rejectedCount++;
        continue;
      }

      const candidate = validation.normalizedRecord;

      // 3. Deduplication Check (Check in-batch first, then check database)
      let existing = batchSeenRecords.get(candidate.id);
      if (!existing) {
        const dbRecord = await this.prisma.acceptedRecord.findUnique({
          where: { id: candidate.id },
        });

        if (dbRecord) {
          existing = {
            id: dbRecord.id,
            recordedAt: dbRecord.recordedAt,
            value: dbRecord.value,
            status: dbRecord.status,
            payloadHash: dbRecord.payloadHash,
          };
        }
      }

      if (existing) {
        const decision = this.deduplicationStrategy.evaluate(existing, candidate);

        if (decision.action === 'SKIP') {
          skippedDuplicates++;
          continue;
        }

        if (decision.action === 'REJECT') {
          await this.persistRejection(
            ingestRun.id,
            candidate.id,
            JSON.stringify(raw),
            decision.reason,
            [decision.reason],
          );
          this.incrementRejection(rejectionSummary, decision.reason);
          rejectedCount++;
          continue;
        }

        if (decision.action === 'UPDATE') {
          // Update existing accepted record
          await this.prisma.acceptedRecord.update({
            where: { id: candidate.id },
            data: {
              source: candidate.source,
              recordedAt: candidate.recordedAt,
              value: candidate.value,
              status: candidate.status,
              payloadHash: candidate.payloadHash,
              version: { increment: 1 },
              ingestRunId: ingestRun.id,
            },
          });

          batchSeenRecords.set(candidate.id, {
            id: candidate.id,
            recordedAt: candidate.recordedAt,
            value: candidate.value,
            status: candidate.status,
            payloadHash: candidate.payloadHash,
          });

          acceptedCount++;
          continue;
        }
      }

      // 4. Fresh Record Insertion
      await this.prisma.acceptedRecord.create({
        data: {
          id: candidate.id,
          source: candidate.source,
          recordedAt: candidate.recordedAt,
          value: candidate.value,
          status: candidate.status,
          payloadHash: candidate.payloadHash,
          ingestRunId: ingestRun.id,
        },
      });

      batchSeenRecords.set(candidate.id, {
        id: candidate.id,
        recordedAt: candidate.recordedAt,
        value: candidate.value,
        status: candidate.status,
        payloadHash: candidate.payloadHash,
      });

      acceptedCount++;
    }

    const durationMs = Date.now() - startTime;

    // 5. Finalize IngestRun record
    await this.prisma.ingestRun.update({
      where: { id: ingestRun.id },
      data: {
        completedAt: new Date(),
        acceptedCount,
        rejectedCount,
        rejectionSummary: JSON.stringify(rejectionSummary),
      },
    });

    return {
      runId: ingestRun.id,
      sourceFile,
      totalProcessed: rawRecords.length,
      accepted: acceptedCount,
      rejected: rejectedCount,
      skippedDuplicates,
      rejectionSummary,
      durationMs,
    };
  }

  private async persistRejection(
    ingestRunId: string,
    originalId: string | null,
    rawPayload: string,
    primaryReason: string,
    allReasons: string[],
  ): Promise<void> {
    await this.prisma.rejectedRecord.create({
      data: {
        originalId,
        rawPayload,
        primaryReason,
        allReasons: JSON.stringify(allReasons),
        ingestRunId,
      },
    });
  }

  private incrementRejection(summary: Record<string, number>, reason: string): void {
    summary[reason] = (summary[reason] || 0) + 1;
  }
}
