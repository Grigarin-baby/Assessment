import { Injectable } from '@nestjs/common';
import { IngestionRule, RuleContext } from '../rule.interface';
import { RawRecord, REJECTION_REASONS } from '../../../domain/types';

@Injectable()
export class IdSanityRule implements IngestionRule {
  readonly code = REJECTION_REASONS.EMPTY_OR_WHITESPACE_STRING;
  readonly name = 'ID String Sanity Rule';
  readonly description = 'Validates that ID is a non-empty, non-whitespace string, and trims padding.';
  readonly priority = 20;

  execute(raw: RawRecord, context: RuleContext): boolean {
    if (raw.id === undefined || raw.id === null) {
      return false;
    }

    if (typeof raw.id !== 'string') {
      context.errors.push(this.code);
      return false;
    }

    const trimmed = raw.id.trim();
    if (trimmed.length === 0) {
      context.errors.push(this.code);
      return false;
    }

    context.sanitizedFields.set('id', trimmed);
    return true;
  }
}
