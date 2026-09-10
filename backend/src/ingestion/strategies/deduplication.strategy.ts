import { Injectable } from '@nestjs/common';
import { NormalizedRecord, REJECTION_REASONS } from '../../domain/types';

export interface ExistingRecordSnapshot {
  id: string;
  source?: string;
  recordedAt: Date;
  value: number;
  status: string;
  payloadHash: string;
  version?: number;
}

export type DeduplicationAction = 
  | { action: 'SKIP' }
  | { action: 'UPDATE' }
  | { action: 'INSERT_HISTORY' }
  | { action: 'REJECT'; reason: string };

export interface IDeduplicationStrategy {
  evaluate(
    existing: ExistingRecordSnapshot,
    incoming: NormalizedRecord,
  ): DeduplicationAction;
}

@Injectable()
export class UpdateIfNewerStrategy implements IDeduplicationStrategy {
  evaluate(
    existing: ExistingRecordSnapshot,
    incoming: NormalizedRecord,
  ): DeduplicationAction {
    // 1. Identical Payload: Idempotent skip
    if (existing.payloadHash === incoming.payloadHash) {
      return { action: 'SKIP' };
    }

    const existingTime = existing.recordedAt.getTime();
    const incomingTime = incoming.recordedAt.getTime();

    // 2. Incoming record has a strictly newer timestamp -> UPDATE master (archive old master to history)
    if (incomingTime > existingTime) {
      return { action: 'UPDATE' };
    }

    // 3. Incoming record has an older timestamp -> INSERT_HISTORY (archive incoming as historical child)
    if (incomingTime < existingTime) {
      return { action: 'INSERT_HISTORY' };
    }

    // 4. Same timestamp but conflicting payload -> REJECT conflict
    return {
      action: 'REJECT',
      reason: REJECTION_REASONS.DUPLICATE_ID_CONFLICT,
    };
  }
}

@Injectable()
export class StrictRejectDuplicateStrategy implements IDeduplicationStrategy {
  evaluate(
    existing: ExistingRecordSnapshot,
    incoming: NormalizedRecord,
  ): DeduplicationAction {
    if (existing.payloadHash === incoming.payloadHash) {
      return { action: 'SKIP' };
    }

    return {
      action: 'REJECT',
      reason: REJECTION_REASONS.DUPLICATE_ID_CONFLICT,
    };
  }
}
