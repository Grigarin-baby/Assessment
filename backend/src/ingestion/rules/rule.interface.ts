import { NormalizedRecord, RawRecord } from '../../domain/types';

export interface RuleContext {
  sanitizedFields: Map<string, unknown>;
  errors: string[];
}

export interface IngestionRule {
  readonly code: string;
  readonly name: string;
  readonly description: string;
  readonly priority: number;

  /**
   * Evaluates the raw input.
   * If valid, stores normalized values in context.sanitizedFields.
   * If invalid, appends error reason code(s) to context.errors.
   * Returns true if rule passed, false if violation occurred.
   */
  execute(raw: RawRecord, context: RuleContext): Promise<boolean> | boolean;
}

export interface RuleEngineResult {
  isValid: boolean;
  normalizedRecord?: NormalizedRecord;
  primaryReason?: string;
  allReasons: string[];
}
