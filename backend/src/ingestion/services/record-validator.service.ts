import { Injectable, Optional } from '@nestjs/common';
import { DateNormalizerService } from './date-normalizer.service';
import { ValidationResult } from '../../domain/types';
import { RuleEngineService } from '../rules/rule-engine.service';
import { RequiredFieldsRule } from '../rules/built-in/required-fields.rule';
import { IdSanityRule } from '../rules/built-in/id-sanity.rule';
import { SourceSanityRule } from '../rules/built-in/source-sanity.rule';
import { DateNormalizerRule } from '../rules/built-in/date-normalizer.rule';
import { IntegerRangeRule } from '../rules/built-in/integer-range.rule';
import { StatusEnumRule } from '../rules/built-in/status-enum.rule';

@Injectable()
export class RecordValidatorService {
  private readonly ruleEngine: RuleEngineService;

  constructor(
    @Optional() private readonly dateNormalizer?: DateNormalizerService,
    @Optional() ruleEngine?: RuleEngineService,
  ) {
    if (ruleEngine) {
      this.ruleEngine = ruleEngine;
    } else {
      const normalizer = dateNormalizer || new DateNormalizerService();
      this.ruleEngine = new RuleEngineService(
        new RequiredFieldsRule(),
        new IdSanityRule(),
        new SourceSanityRule(),
        new DateNormalizerRule(normalizer),
        new IntegerRangeRule(),
        new StatusEnumRule(),
      );
    }
  }

  /**
   * Evaluates an incoming record against the modular rule engine.
   */
  validate(raw: unknown): ValidationResult {
    return this.ruleEngine.evaluate(raw);
  }

  /**
   * Returns the underlying rule engine instance.
   */
  getRuleEngine(): RuleEngineService {
    return this.ruleEngine;
  }
}
