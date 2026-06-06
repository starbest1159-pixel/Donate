import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { MemberStatus } from '@prisma/client';
import { PaginationResult } from '../common/interfaces/pagination.interface';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listMembers(
    page: number = 1,
    limit: number = 10,
  ): Promise<
    PaginationResult<{
      id: number;
      username: string;
      email: string;
      role: string;
      status: string;
      createdAt: Date;
    }>
  > {
    const skip = (page - 1) * limit;

    const [members, total] = await Promise.all([
      this.prisma.member.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.member.count(),
    ]);

    return {
      data: members,
      total,
      page,
      limit,
    };
  }

  async getMember(id: number) {
    const member = await this.prisma.member.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        contributions: {
          select: {
            id: true,
            amount: true,
            referenceCode: true,
            status: true,
            expiresAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!member) {
      return null;
    }

    return member;
  }

  async updateMemberStatus(id: number, status: MemberStatus) {
    const member = await this.prisma.member.findUnique({
      where: { id },
    });

    if (!member) {
      return null;
    }

    const updated = await this.prisma.member.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    this.logger.log(`Member ${id} status updated to ${status}`);
    return updated;
  }

  async listAllRequests(
    page: number = 1,
    limit: number = 10,
    status?: string,
  ): Promise<PaginationResult<Record<string, unknown>>> {
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }

    const [requests, total] = await Promise.all([
      this.prisma.contributionRequest.findMany({
        where,
        include: {
          member: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
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

  async getLogs(
    page: number = 1,
    limit: number = 10,
    userId?: number,
    action?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<
    PaginationResult<{
      id: number;
      userId: number;
      action: string;
      ipAddress: string | null;
      details: string | null;
      createdAt: Date;
    }>
  > {
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (userId) {
      where.userId = userId;
    }
    if (action) {
      where.action = { contains: action, mode: 'insensitive' };
    }
    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
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

  // ── Multi-tenant master admin operations ──────────────────────────

  async findMasterAdminByEmail(email: string) {
    return this.prisma.masterAdmin.findUnique({
      where: { email },
    });
  }

  async listMerchants(filters?: {
    page?: number;
    limit?: number;
    status?: string;
  }) {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (filters?.status) {
      where.status = filters.status;
    }

    const [merchants, total] = await Promise.all([
      this.prisma.merchant.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.merchant.count({ where }),
    ]);

    return {
      data: merchants,
      total,
      page,
      limit,
    };
  }

  async suspendMerchant(merchantId: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });
    if (!merchant) {
      throw new Error('Merchant not found');
    }

    const currentVersion = merchant.version;
    const result = await this.prisma.merchant.updateMany({
      where: { id: merchantId, version: currentVersion },
      data: { status: 'SUSPENDED', version: { increment: 1 } },
    });
    if (result.count === 0) {
      throw new Error('OPTIMISTIC_LOCK_ERROR');
    }

    this.logger.log(`Merchant ${merchantId} suspended`);
    return this.prisma.merchant.findUnique({ where: { id: merchantId } });
  }

  async terminateMerchant(merchantId: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });
    if (!merchant) {
      throw new Error('Merchant not found');
    }

    const currentVersion = merchant.version;
    const result = await this.prisma.merchant.updateMany({
      where: { id: merchantId, version: currentVersion },
      data: { status: 'TERMINATED', version: { increment: 1 } },
    });
    if (result.count === 0) {
      throw new Error('OPTIMISTIC_LOCK_ERROR');
    }

    this.logger.log(`Merchant ${merchantId} terminated`);
    return this.prisma.merchant.findUnique({ where: { id: merchantId } });
  }

  async activateMerchant(merchantId: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });
    if (!merchant) {
      throw new Error('Merchant not found');
    }

    const currentVersion = merchant.version;
    const result = await this.prisma.merchant.updateMany({
      where: { id: merchantId, version: currentVersion },
      data: { status: 'ACTIVE', version: { increment: 1 } },
    });
    if (result.count === 0) {
      throw new Error('OPTIMISTIC_LOCK_ERROR');
    }

    this.logger.log(`Merchant ${merchantId} activated`);
    return this.prisma.merchant.findUnique({ where: { id: merchantId } });
  }
}
