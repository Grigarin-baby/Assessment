import { Injectable } from '@nestjs/common';
import { IngestionRule, RuleContext } from '../rule.interface';
import {
  RawRecord,
  RecordStatusType,
  REJECTION_REASONS,
  VALID_STATUSES,
} from '../../../domain/types';

@Injectable()
export class StatusEnumRule implements IngestionRule {
  readonly code = REJECTION_REASONS.INVALID_STATUS;
  readonly name = 'Status Enum (OK, WARN, FAIL) Rule';
  readonly description = 'Strictly validates that status is one of OK, WARN, or FAIL in uppercase.';
  readonly priority = 60;

  execute(raw: RawRecord, context: RuleContext): boolean {
    if (raw.status === undefined || raw.status === null) {
      return false;
    }

    if (
      typeof raw.status !== 'string' ||
      !VALID_STATUSES.includes(raw.status as RecordStatusType)
    ) {
      context.errors.push(this.code);
      return false;
    }

    context.sanitizedFields.set('status', raw.status as RecordStatusType);
    return true;
  }
}
