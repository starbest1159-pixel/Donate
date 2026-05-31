import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { ContributionStatus } from '@prisma/client';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('*/60 * * * * *')
  async handleExpiration(): Promise<void> {
    const now = new Date();

    const expiredRequests = await this.prisma.contributionRequest.findMany({
      where: {
        status: ContributionStatus.WAITING,
        expiresAt: { lt: now },
      },
      select: { id: true },
    });

    if (expiredRequests.length === 0) {
      return;
    }

    const expiredIds = expiredRequests.map((r) => r.id);

    await this.prisma.contributionRequest.updateMany({
      where: {
        id: { in: expiredIds },
        status: ContributionStatus.WAITING,
      },
      data: {
        status: ContributionStatus.EXPIRED,
      },
    });

    await this.prisma.qrSession.deleteMany({
      where: {
        requestId: { in: expiredIds },
      },
    });

    const redis = this.getRedisClient();
    if (redis) {
      const pipeline = redis.pipeline();
      for (const id of expiredIds) {
        pipeline.del(`qr:session:${id}`);
      }
      await pipeline.exec();
    }

    this.logger.log(
      `Expired ${expiredIds.length} contribution requests: [${expiredIds.join(', ')}]`,
    );
  }

  private getRedisClient() {
    const cacheManager = (global as Record<string, unknown>).__REDIS_CLIENT__;
    return cacheManager as ReturnType<typeof import('ioredis').default> | null;
  }
}
