import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface QueryRejectionsDto {
  reason?: string;
  originalId?: string;
  ingestRunId?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class RejectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findRejections(query: QueryRejectionsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.reason) {
      where.primaryReason = query.reason;
    }

    if (query.originalId) {
      where.originalId = query.originalId;
    }

    if (query.ingestRunId) {
      where.ingestRunId = query.ingestRunId;
    }

    const [rawRejections, total] = await Promise.all([
      this.prisma.rejectedRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          acceptedRecord: true,
        },
      }),
      this.prisma.rejectedRecord.count({ where }),
    ]);

    const formatted = rawRejections.map((r) => ({
      ...r,
      rawPayload: this.safeParseJson(r.rawPayload),
      allReasons: this.safeParseJson(r.allReasons, [r.primaryReason]),
    }));

    return {
      data: formatted,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getRejectionById(id: string) {
    const record = await this.prisma.rejectedRecord.findUnique({
      where: { id },
      include: {
        acceptedRecord: true,
      },
    });

    if (!record) {
      return null;
    }

    return {
      ...record,
      rawPayload: this.safeParseJson(record.rawPayload),
      allReasons: this.safeParseJson(record.allReasons, [record.primaryReason]),
    };
  }

  async getDistinctReasons(): Promise<string[]> {
    const reasons = await this.prisma.rejectedRecord.findMany({
      select: { primaryReason: true },
      distinct: ['primaryReason'],
      orderBy: { primaryReason: 'asc' },
    });
    return reasons.map((r) => r.primaryReason);
  }

  private safeParseJson(str: string, fallback: any = {}): any {
    try {
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  }
}
