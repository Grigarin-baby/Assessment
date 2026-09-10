import { Injectable } from '@nestjs/common';
import { IngestionRule, RuleContext } from '../rule.interface';
import { RawRecord, REJECTION_REASONS } from '../../../domain/types';

@Injectable()
export class IntegerRangeRule implements IngestionRule {
  readonly code = REJECTION_REASONS.VALUE_OUT_OF_RANGE;
  readonly name = 'Integer & Range (0-100) Rule';
  readonly description = 'Enforces strict integer validation and inclusive bounds between 0 and 100.';
  readonly priority = 50;

  execute(raw: RawRecord, context: RuleContext): boolean {
    if (raw.value === undefined || raw.value === null) {
      return false;
    }

    let hasViolation = false;

    // Sub-rule 5A: Strict Integer validation (rejects floats, strings, booleans)
    if (typeof raw.value !== 'number' || !Number.isInteger(raw.value)) {
      context.errors.push(REJECTION_REASONS.VALUE_NOT_AN_INTEGER);
      hasViolation = true;
    }

    // Sub-rule 5B: Range check (0 to 100 inclusive)
    if (typeof raw.value === 'number' && (raw.value < 0 || raw.value > 100)) {
      context.errors.push(REJECTION_REASONS.VALUE_OUT_OF_RANGE);
      hasViolation = true;
    }

    if (!hasViolation) {
      context.sanitizedFields.set('value', raw.value);
      return true;
    }

    return false;
  }
}
