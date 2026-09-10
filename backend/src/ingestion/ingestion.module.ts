import { Module } from '@nestjs/common';
import { DateNormalizerService } from './services/date-normalizer.service';
import { RecordValidatorService } from './services/record-validator.service';
import { UpdateIfNewerStrategy, StrictRejectDuplicateStrategy } from './strategies/deduplication.strategy';
import { IngestionService } from './services/ingestion.service';
import { IngestionController } from './ingestion.controller';

@Module({
  providers: [
    DateNormalizerService,
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
    UpdateIfNewerStrategy,
  ],
})
export class IngestionModule {}
