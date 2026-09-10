import { Injectable } from '@nestjs/common';
import { IngestionRule, RuleContext } from '../rule.interface';
import { RawRecord, REJECTION_REASONS } from '../../../domain/types';

@Injectable()
export class SourceSanityRule implements IngestionRule {
  readonly code = REJECTION_REASONS.EMPTY_OR_WHITESPACE_STRING;
  readonly name = 'Source String Sanity Rule';
  readonly description = 'Validates that source is a non-empty string, and trims leading/trailing whitespace.';
  readonly priority = 30;

  execute(raw: RawRecord, context: RuleContext): boolean {
    if (raw.source === undefined || raw.source === null) {
      return false;
    }

    if (typeof raw.source !== 'string') {
      context.errors.push(this.code);
      return false;
    }

    const trimmed = raw.source.trim();
    if (trimmed.length === 0) {
      context.errors.push(this.code);
      return false;
    }

    context.sanitizedFields.set('source', trimmed);
    return true;
  }
}
