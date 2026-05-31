import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PaginationResult } from '../common/interfaces/pagination.interface';

@Injectable()
export class LogsService {
  private readonly logger = new Logger(LogsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createLog(data: {
    userId: number;
    action: string;
    ipAddress?: string;
    details?: string;
  }) {
    return this.prisma.activityLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        ipAddress: data.ipAddress || null,
        details: data.details || null,
      },
    });
  }

  async getLogs(params: {
    page?: number;
    limit?: number;
    userId?: number;
    action?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<
    PaginationResult<{
      id: number;
      userId: number;
      action: string;
      ipAddress: string | null;
      details: string | null;
      createdAt: Date;
    }>
  > {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (params.userId) {
      where.userId = params.userId;
    }
    if (params.action) {
      where.action = { contains: params.action, mode: 'insensitive' };
    }
    if (params.startDate || params.endDate) {
      where.createdAt = {
        ...(params.startDate && { gte: new Date(params.startDate) }),
        ...(params.endDate && { lte: new Date(params.endDate) }),
      };
    }

    const [logs, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return {
      data: logs,
      total,
      page,
      limit,
    };
  }
}
