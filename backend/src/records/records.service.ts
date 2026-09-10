import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface QueryRecordsDto {
  source?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class RecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async findRecords(query: QueryRecordsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.source) {
      where.source = query.source.trim();
    }

    if (query.status) {
      where.status = query.status.toUpperCase();
    }

    if (query.from || query.to) {
      where.recordedAt = {};
      if (query.from) {
        where.recordedAt.gte = new Date(query.from);
      }
      if (query.to) {
        where.recordedAt.lte = new Date(query.to);
      }
    }

    const validSortFields = ['recordedAt', 'value', 'source', 'status', 'createdAt'];
    const sortBy = validSortFields.includes(query.sortBy || '') ? query.sortBy! : 'recordedAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const [records, total] = await Promise.all([
      this.prisma.acceptedRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.acceptedRecord.count({ where }),
    ]);

    return {
      data: records,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getRecordById(id: string) {
    return this.prisma.acceptedRecord.findUnique({
      where: { id },
    });
  }

  async getDistinctSources(): Promise<string[]> {
    const records = await this.prisma.acceptedRecord.findMany({
      select: { source: true },
      distinct: ['source'],
      orderBy: { source: 'asc' },
    });
    return records.map((r) => r.source);
  }
}
