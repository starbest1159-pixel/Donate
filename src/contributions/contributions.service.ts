import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { FilterContributionDto } from './dto/filter-contribution.dto';
import { PaginationResult } from '../common/interfaces/pagination.interface';
import { ContributionStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const SESSION_EXPIRY_MINUTES = 5;

@Injectable()
export class ContributionsService {
  private readonly logger = new Logger(ContributionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(memberId: number, dto: CreateContributionDto) {
    const paymentMethod = await this.prisma.paymentMethod.findUnique({
      where: { id: dto.paymentMethodId },
    });

    if (!paymentMethod) {
      throw new NotFoundException(
        `Payment method with ID ${dto.paymentMethodId} not found`,
      );
    }

    if (!paymentMethod.isActive) {
      throw new BadRequestException(
        `Payment method with ID ${dto.paymentMethodId} is not active`,
      );
    }

    const referenceCode = uuidv4();
    const expiresAt = new Date(
      Date.now() + SESSION_EXPIRY_MINUTES * 60 * 1000,
    );

    const request = await this.prisma.contributionRequest.create({
      data: {
        memberId,
        paymentMethodId: dto.paymentMethodId,
        amount: dto.amount,
        referenceCode,
        status: ContributionStatus.WAITING,
        expiresAt,
        qrSession: {
          create: {
            qrData: JSON.stringify({
              referenceCode,
              amount: dto.amount,
              method: paymentMethod.methodType,
              accountNo: paymentMethod.accountNo,
            }),
            expiresAt,
          },
        },
      },
      include: {
        qrSession: true,
        paymentMethod: true,
      },
    });

    const redis = this.getRedisClient();
    if (redis) {
      const ttlSeconds = SESSION_EXPIRY_MINUTES * 60;
      await redis.set(
        `qr:session:${request.id}`,
        JSON.stringify({
          referenceCode,
          status: ContributionStatus.WAITING,
        }),
        { EX: ttlSeconds },
      );
    }

    this.logger.log(
      `Contribution request created: ${request.id} by member: ${memberId}`,
    );
    return request;
  }

  async cancel(requestId: number, memberId: number) {
    const request = await this.prisma.contributionRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException(
        `Contribution request with ID ${requestId} not found`,
      );
    }

    if (request.memberId !== memberId) {
      throw new ForbiddenException(
        'You can only cancel your own contribution requests',
      );
    }

    if (request.status !== ContributionStatus.WAITING) {
      throw new BadRequestException(
        'Only waiting contribution requests can be cancelled',
      );
    }

    const updated = await this.prisma.contributionRequest.update({
      where: { id: requestId },
      data: {
        status: ContributionStatus.CANCELLED,
      },
    });

    if (request.qrSessionId) {
      await this.prisma.qrSession.deleteMany({
        where: { requestId },
      });
    }

    const redis = this.getRedisClient();
    if (redis) {
      await redis.del(`qr:session:${requestId}`);
    }

    this.logger.log(`Contribution request cancelled: ${requestId}`);
    return updated;
  }

  async findOne(requestId: number, memberId: number) {
    const request = await this.prisma.contributionRequest.findUnique({
      where: { id: requestId },
      include: {
        paymentMethod: true,
        qrSession: true,
      },
    });

    if (!request) {
      throw new NotFoundException(
        `Contribution request with ID ${requestId} not found`,
      );
    }

    if (request.memberId !== memberId) {
      throw new ForbiddenException(
        'You can only view your own contribution requests',
      );
    }

    return request;
  }

  async findAll(
    memberId: number,
    filter: FilterContributionDto,
  ): Promise<PaginationResult<Record<string, unknown>>> {
    const page = filter.page || 1;
    const limit = filter.limit || 10;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { memberId };

    if (filter.status) {
      where.status = filter.status;
    }

    if (filter.startDate || filter.endDate) {
      where.createdAt = {
        ...(filter.startDate && { gte: new Date(filter.startDate) }),
        ...(filter.endDate && { lte: new Date(filter.endDate) }),
      };
    }

    const [requests, total] = await Promise.all([
      this.prisma.contributionRequest.findMany({
        where,
        include: {
          paymentMethod: true,
          qrSession: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.contributionRequest.count({ where }),
    ]);

    return {
      data: requests,
      total,
      page,
      limit,
    };
  }

  async search(
    memberId: number,
    query: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginationResult<Record<string, unknown>>> {
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      memberId,
      referenceCode: { contains: query, mode: 'insensitive' },
    };

    const [requests, total] = await Promise.all([
      this.prisma.contributionRequest.findMany({
        where,
        include: {
          paymentMethod: true,
          qrSession: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.contributionRequest.count({ where }),
    ]);

    return {
      data: requests,
      total,
      page,
      limit,
    };
  }

  private getRedisClient() {
    const cacheManager = (global as Record<string, unknown>).__REDIS_CLIENT__;
    return cacheManager as ReturnType<typeof import('ioredis').default> | null;
  }
}
