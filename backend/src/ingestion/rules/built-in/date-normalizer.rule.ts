import { Injectable } from '@nestjs/common';
import { IngestionRule, RuleContext } from '../rule.interface';
import { RawRecord, REJECTION_REASONS } from '../../../domain/types';
import { DateNormalizerService } from '../../services/date-normalizer.service';

@Injectable()
export class DateNormalizerRule implements IngestionRule {
  readonly code = REJECTION_REASONS.INVALID_DATE_FORMAT;
  readonly name = 'Cascading Date Normalizer Rule';
  readonly description = 'Parses heterogeneous timestamps (ISO 8601 UTC/offsets, Epoch sec/ms, SQL, RFC 2822) into canonical UTC Date.';
  readonly priority = 40;

  constructor(private readonly dateNormalizer: DateNormalizerService) {}

  execute(raw: RawRecord, context: RuleContext): boolean {
    if (raw.recordedAt === undefined || raw.recordedAt === null) {
      return false;
    }

    const normalized = this.dateNormalizer.normalize(raw.recordedAt);
    if (!normalized) {
      context.errors.push(this.code);
      return false;
    }

    context.sanitizedFields.set('recordedAt', normalized);
    return true;
  }
}
