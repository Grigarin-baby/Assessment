import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import { DateNormalizerService } from '../ingestion/services/date-normalizer.service';
import { RecordValidatorService } from '../ingestion/services/record-validator.service';
import { UpdateIfNewerStrategy } from '../ingestion/strategies/deduplication.strategy';
import { IngestionService } from '../ingestion/services/ingestion.service';
import { IngestionSummary } from '../domain/types';

async function runCli() {
  const args = process.argv.slice(2);
  const inputArg = args[0] || path.resolve(__dirname, '../../../sample-data/records_sample_250.json');

  const resolvedPath = path.resolve(process.cwd(), inputArg);
  console.log(`\n======================================================`);
  console.log(`🚀 RECORD INGESTION PIPELINE (CLI RUNNER)`);
  console.log(`======================================================`);
  console.log(`Target File: ${resolvedPath}\n`);

  const prisma = new PrismaClient();
  await prisma.$connect();

  const dateNormalizer = new DateNormalizerService();
  const validator = new RecordValidatorService(dateNormalizer);
  const deduplication = new UpdateIfNewerStrategy();
  const ingestionService = new IngestionService(prisma as any, validator, deduplication);

  try {
    const summary: IngestionSummary = await ingestionService.ingestFile(resolvedPath);
    printSummaryReport(summary);
  } catch (error) {
    console.error(`\n❌ Ingestion Failed: ${(error as Error).message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function printSummaryReport(summary: IngestionSummary) {
  const acceptRate = ((summary.accepted / (summary.totalProcessed || 1)) * 100).toFixed(1);
  const rejectRate = ((summary.rejected / (summary.totalProcessed || 1)) * 100).toFixed(1);

  console.log(`------------------------------------------------------`);
  console.log(`📊 INGESTION SUMMARY REPORT (Requirement R5)`);
  console.log(`------------------------------------------------------`);
  console.log(`Run ID:              ${summary.runId}`);
  console.log(`Source File:         ${summary.sourceFile}`);
  console.log(`Duration:            ${summary.durationMs} ms`);
  console.log(`Total Processed:     ${summary.totalProcessed} records`);
  console.log(`Accepted:            ✅ ${summary.accepted} (${acceptRate}%)`);
  console.log(`Rejected:            ❌ ${summary.rejected} (${rejectRate}%)`);
  console.log(`Skipped Duplicates:  ⏭️  ${summary.skippedDuplicates}`);
  console.log(`------------------------------------------------------`);
  console.log(`📋 REJECTIONS GROUPED BY REASON:`);
  console.log(`------------------------------------------------------`);

  const reasons = Object.entries(summary.rejectionSummary);
  if (reasons.length === 0) {
    console.log(`  (No records were rejected)`);
  } else {
    // Sort descending by count
    reasons.sort((a, b) => b[1] - a[1]);
    for (const [reason, count] of reasons) {
      const percentage = ((count / summary.rejected) * 100).toFixed(1);
      const paddedReason = reason.padEnd(30, ' ');
      console.log(`  • ${paddedReason} : ${count.toString().padStart(4, ' ')} (${percentage}%)`);
    }
  }

  console.log(`======================================================\n`);
}

runCli().catch((err) => {
  console.error(err);
  process.exit(1);
});
