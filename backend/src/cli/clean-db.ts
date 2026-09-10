import { PrismaClient } from '@prisma/client';

async function cleanDb() {
  const prisma = new PrismaClient();
  try {
    console.log('======================================================');
    console.log('🧹 CLEANING INGESTION DATABASE TABLES');
    console.log('======================================================');
    
    const hist = await prisma.recordHistory.deleteMany();
    const rej = await prisma.rejectedRecord.deleteMany();
    const acc = await prisma.acceptedRecord.deleteMany();
    const runs = await prisma.ingestRun.deleteMany();

    console.log(`• Removed ${hist.count} rows from record_history`);
    console.log(`• Removed ${rej.count} rows from rejected_records`);
    console.log(`• Removed ${acc.count} rows from accepted_records`);
    console.log(`• Removed ${runs.count} rows from ingest_runs`);
    console.log('------------------------------------------------------');
    console.log('✅ Database cleaned successfully! User accounts preserved.');
    console.log('======================================================');
  } catch (err) {
    console.error('❌ Error cleaning database:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDb();
