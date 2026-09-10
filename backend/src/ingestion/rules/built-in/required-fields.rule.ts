import { Injectable } from '@nestjs/common';
import { IngestionRule, RuleContext } from '../rule.interface';
import { RawRecord, REJECTION_REASONS } from '../../../domain/types';

@Injectable()
export class RequiredFieldsRule implements IngestionRule {
  readonly code = REJECTION_REASONS.MISSING_FIELD;
  readonly name = 'Required Fields Presence Rule';
  readonly description = 'Ensures all 5 required attributes (id, source, recordedAt, value, status) are present.';
  readonly priority = 10;

  execute(raw: RawRecord, context: RuleContext): boolean {
    const requiredFields = ['id', 'source', 'recordedAt', 'value', 'status'];
    const missing = requiredFields.filter((field) => raw[field] === undefined || raw[field] === null);

    if (missing.length > 0) {
      context.errors.push(this.code);
      return false;
    }

    return true;
  }
}
