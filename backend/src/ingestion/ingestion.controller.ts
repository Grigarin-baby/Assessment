import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as path from 'path';
import { IngestionService } from './services/ingestion.service';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/guards/public.decorator';

@Controller('ingest')
export class IngestionController {
  constructor(
    private readonly ingestionService: IngestionService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Get('health')
  async getHealth() {
    let database = 'connected';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'disconnected';
    }

    return {
      status: 'ok',
      server: 'online',
      database,
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Post('clean')
  async cleanDatabase() {
    const hist = await this.prisma.recordHistory.deleteMany();
    const rej = await this.prisma.rejectedRecord.deleteMany();
    const acc = await this.prisma.acceptedRecord.deleteMany();
    const runs = await this.prisma.ingestRun.deleteMany();

    return {
      success: true,
      message: 'Database records, dead vault, and history wiped successfully.',
      deleted: {
        recordHistory: hist.count,
        rejectedRecords: rej.count,
        acceptedRecords: acc.count,
        ingestRuns: runs.count,
      },
    };
  }

  @Public()
  @Post('sample')
  async runSampleIngestion() {
    const samplePath = path.resolve(process.cwd(), '../sample-data/records_sample_250.json');
    return this.ingestionService.ingestFile(samplePath);
  }

  @Public()
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAndIngest(
    @UploadedFile() file?: { buffer: Buffer; originalname: string },
    @Body('records') jsonBody?: string,
  ) {
    if (file && file.buffer) {
      const content = file.buffer.toString('utf-8');
      let parsed: unknown[] = [];
      try {
        if (content.trim().startsWith('[')) {
          parsed = JSON.parse(content);
        } else {
          parsed = content.split('\n').filter((l) => l.trim().length > 0).map((l) => JSON.parse(l));
        }
      } catch (e) {
        throw new BadRequestException(`File is not valid JSON or NDJSON: ${(e as Error).message}`);
      }
      return this.ingestionService.ingestPayload(parsed, file.originalname);
    }

    if (jsonBody) {
      try {
        const parsed = typeof jsonBody === 'string' ? JSON.parse(jsonBody) : jsonBody;
        const records = Array.isArray(parsed) ? parsed : [parsed];
        return this.ingestionService.ingestPayload(records, 'raw_json_input');
      } catch (e) {
        throw new BadRequestException(`Invalid JSON payload: ${(e as Error).message}`);
      }
    }

    throw new BadRequestException('Please provide a file or a JSON records body');
  }

  @Public()
  @Get('runs')
  async getIngestRuns() {
    const runs = await this.prisma.ingestRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: 20,
    });

    return runs.map((run) => ({
      ...run,
      rejectionSummary: run.rejectionSummary ? JSON.parse(run.rejectionSummary) : {},
    }));
  }

  @Public()
  @Get('runs/:id')
  async getRunById(@Param('id') id: string) {
    const run = await this.prisma.ingestRun.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            acceptedRecords: true,
            rejectedRecords: true,
          },
        },
      },
    });

    if (!run) {
      throw new BadRequestException(`Ingest run with ID ${id} not found`);
    }

    return {
      ...run,
      rejectionSummary: run.rejectionSummary ? JSON.parse(run.rejectionSummary) : {},
    };
  }

  @Public()
  @Get('stats')
  async getOverallStats() {
    const totalAccepted = await this.prisma.acceptedRecord.count();
    const totalRejected = await this.prisma.rejectedRecord.count();
    const totalHistory = await this.prisma.recordHistory.count();
    const totalRuns = await this.prisma.ingestRun.count();

    // Group rejections by primaryReason
    const rejections = await this.prisma.rejectedRecord.findMany({
      select: { primaryReason: true },
    });

    const breakdown: Record<string, number> = {};
    for (const r of rejections) {
      breakdown[r.primaryReason] = (breakdown[r.primaryReason] || 0) + 1;
    }

    // Status breakdown of accepted records
    const statusGroups = await this.prisma.acceptedRecord.groupBy({
      by: ['status'],
      _count: { status: true },
    });
    const statusBreakdown: Record<string, number> = {};
    for (const s of statusGroups) {
      statusBreakdown[s.status] = s._count.status;
    }

    // Source breakdown of accepted records
    const sourceGroups = await this.prisma.acceptedRecord.groupBy({
      by: ['source'],
      _count: { source: true },
    });
    const sourceBreakdown: Record<string, number> = {};
    for (const src of sourceGroups) {
      sourceBreakdown[src.source] = src._count.source;
    }

    // Metric values aggregation
    const valueStats = await this.prisma.acceptedRecord.aggregate({
      _avg: { value: true },
      _min: { value: true },
      _max: { value: true },
    });

    return {
      totalAccepted,
      totalRejected,
      totalHistory,
      totalProcessed: totalAccepted + totalRejected,
      totalRuns,
      rejectionBreakdown: breakdown,
      statusBreakdown,
      sourceBreakdown,
      valueStats: {
        avg: valueStats._avg.value ? Number(valueStats._avg.value.toFixed(1)) : 0,
        min: valueStats._min.value ?? 0,
        max: valueStats._max.value ?? 0,
      },
    };
  }
}
