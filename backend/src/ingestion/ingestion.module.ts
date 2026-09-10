import { Module } from '@nestjs/common';
import { DateNormalizerService } from './services/date-normalizer.service';
import { RecordValidatorService } from './services/record-validator.service';
import { UpdateIfNewerStrategy, StrictRejectDuplicateStrategy } from './strategies/deduplication.strategy';
import { IngestionService } from './services/ingestion.service';
import { IngestionController } from './ingestion.controller';
import { RuleEngineService } from './rules/rule-engine.service';
import { RequiredFieldsRule } from './rules/built-in/required-fields.rule';
import { IdSanityRule } from './rules/built-in/id-sanity.rule';
import { SourceSanityRule } from './rules/built-in/source-sanity.rule';
import { DateNormalizerRule } from './rules/built-in/date-normalizer.rule';
import { IntegerRangeRule } from './rules/built-in/integer-range.rule';
import { StatusEnumRule } from './rules/built-in/status-enum.rule';

@Module({
  providers: [
    DateNormalizerService,
    RequiredFieldsRule,
    IdSanityRule,
    SourceSanityRule,
    DateNormalizerRule,
    IntegerRangeRule,
    StatusEnumRule,
    RuleEngineService,
    RecordValidatorService,
    UpdateIfNewerStrategy,
    StrictRejectDuplicateStrategy,
    IngestionService,
  ],
  controllers: [IngestionController],
  exports: [
    IngestionService,
    DateNormalizerService,
    RecordValidatorService,
    RuleEngineService,
    UpdateIfNewerStrategy,
  ],
})
export class IngestionModule {}
