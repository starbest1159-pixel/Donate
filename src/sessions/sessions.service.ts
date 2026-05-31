import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ContributionStatus } from '@prisma/client';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generate(requestId: number) {
    const request = await this.prisma.contributionRequest.findUnique({
      where: { id: requestId },
      include: { paymentMethod: true },
    });

    if (!request) {
      throw new NotFoundException(
        `Contribution request with ID ${requestId} not found`,
      );
    }

    if (request.status !== ContributionStatus.WAITING) {
      throw new BadRequestException(
        'Cannot generate session for a non-waiting request',
      );
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const qrSession = await this.prisma.qrSession.upsert({
      where: { requestId },
      update: {
        qrData: JSON.stringify({
          referenceCode: request.referenceCode,
          amount: request.amount,
          method: request.paymentMethod.methodType,
          accountNo: request.paymentMethod.accountNo,
        }),
        expiresAt,
      },
      create: {
        requestId,
        qrData: JSON.stringify({
          referenceCode: request.referenceCode,
          amount: request.amount,
          method: request.paymentMethod.methodType,
          accountNo: request.paymentMethod.accountNo,
        }),
        expiresAt,
      },
    });

    const redis = this.getRedisClient();
    if (redis) {
      const ttlSeconds = 5 * 60;
      await redis.set(
        `qr:session:${requestId}`,
        JSON.stringify({
          referenceCode: request.referenceCode,
          status: ContributionStatus.WAITING,
        }),
        { EX: ttlSeconds },
      );
    }

    this.logger.log(`QR session generated for request: ${requestId}`);
    return qrSession;
  }

  async validate(requestId: number) {
    const request = await this.prisma.contributionRequest.findUnique({
      where: { id: requestId },
      include: { qrSession: true },
    });

    if (!request) {
      throw new NotFoundException(
        `Contribution request with ID ${requestId} not found`,
      );
    }

    if (request.status !== ContributionStatus.WAITING) {
      return {
        valid: false,
        reason: `Request status is ${request.status}, expected WAITING`,
      };
    }

    if (request.expiresAt < new Date()) {
      return {
        valid: false,
        reason: 'Session has expired',
      };
    }

    if (!request.qrSession) {
      return {
        valid: false,
        reason: 'No QR session found for this request',
      };
    }

    if (request.qrSession.expiresAt < new Date()) {
      return {
        valid: false,
        reason: 'QR session has expired',
      };
    }

    return {
      valid: true,
      request: {
        id: request.id,
        referenceCode: request.referenceCode,
        amount: request.amount,
        status: request.status,
        expiresAt: request.expiresAt,
      },
    };
  }

  async expire(requestId: number) {
    const request = await this.prisma.contributionRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException(
        `Contribution request with ID ${requestId} not found`,
      );
    }

    if (request.status !== ContributionStatus.WAITING) {
      throw new BadRequestException(
        'Can only expire waiting contribution requests',
      );
    }

    const updated = await this.prisma.contributionRequest.update({
      where: { id: requestId },
      data: {
        status: ContributionStatus.EXPIRED,
      },
    });

    await this.close(requestId);

    this.logger.log(`Session expired for request: ${requestId}`);
    return updated;
  }

  async close(requestId: number) {
    await this.prisma.qrSession.deleteMany({
      where: { requestId },
    });

    const redis = this.getRedisClient();
    if (redis) {
      await redis.del(`qr:session:${requestId}`);
    }

    this.logger.log(`Session closed for request: ${requestId}`);
  }

  private getRedisClient() {
    const cacheManager = (global as Record<string, unknown>).__REDIS_CLIENT__;
    return cacheManager as ReturnType<typeof import('ioredis').default> | null;
  }
}
