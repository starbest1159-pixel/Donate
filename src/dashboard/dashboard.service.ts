import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  private readonly CACHE_TTL = 600;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getStats() {
    const cacheKey = 'dashboard:stats';
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const [
      totalMembers,
      activeMembers,
      totalRequests,
      paidRequests,
      expiredRequests,
      cancelledRequests,
    ] = await Promise.all([
      this.prisma.member.count(),
      this.prisma.member.count({ where: { status: 'ACTIVE' } }),
      this.prisma.contributionRequest.count(),
      this.prisma.contributionRequest.count({ where: { status: 'PAID' } }),
      this.prisma.contributionRequest.count({
        where: { status: 'EXPIRED' },
      }),
      this.prisma.contributionRequest.count({
        where: { status: 'CANCELLED' },
      }),
    ]);

    const stats = {
      totalMembers,
      activeMembers,
      totalRequests,
      paidRequests,
      expiredRequests,
      cancelledRequests,
    };

    await this.cacheManager.set(cacheKey, stats, this.CACHE_TTL);
    return stats;
  }

  async getDailyStats(days: number = 30) {
    const cacheKey = `dashboard:daily:${days}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const requests = await this.prisma.contributionRequest.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: {
        status: true,
        createdAt: true,
        amount: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const dailyMap = new Map<
      string,
      { date: string; total: number; paid: number; expired: number; cancelled: number; waiting: number; amount: number }
    >();

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      dailyMap.set(dateStr, {
        date: dateStr,
        total: 0,
        paid: 0,
        expired: 0,
        cancelled: 0,
        waiting: 0,
        amount: 0,
      });
    }

    for (const req of requests) {
      const dateStr = req.createdAt.toISOString().split('T')[0];
      const entry = dailyMap.get(dateStr);
      if (entry) {
        entry.total += 1;
        entry.amount += Number(req.amount);
        switch (req.status) {
          case 'PAID':
            entry.paid += 1;
            break;
          case 'EXPIRED':
            entry.expired += 1;
            break;
          case 'CANCELLED':
            entry.cancelled += 1;
            break;
          case 'WAITING':
            entry.waiting += 1;
            break;
        }
      }
    }

    const result = Array.from(dailyMap.values());
    await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  async getMonthlyStats(months: number = 12) {
    const cacheKey = `dashboard:monthly:${months}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const requests = await this.prisma.contributionRequest.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: {
        status: true,
        createdAt: true,
        amount: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const monthlyMap = new Map<
      string,
      { month: string; total: number; paid: number; expired: number; cancelled: number; waiting: number; amount: number }
    >();

    for (let i = 0; i < months; i++) {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + i);
      const monthStr = date.toISOString().slice(0, 7);
      monthlyMap.set(monthStr, {
        month: monthStr,
        total: 0,
        paid: 0,
        expired: 0,
        cancelled: 0,
        waiting: 0,
        amount: 0,
      });
    }

    for (const req of requests) {
      const monthStr = req.createdAt.toISOString().slice(0, 7);
      const entry = monthlyMap.get(monthStr);
      if (entry) {
        entry.total += 1;
        entry.amount += Number(req.amount);
        switch (req.status) {
          case 'PAID':
            entry.paid += 1;
            break;
          case 'EXPIRED':
            entry.expired += 1;
            break;
          case 'CANCELLED':
            entry.cancelled += 1;
            break;
          case 'WAITING':
            entry.waiting += 1;
            break;
        }
      }
    }

    const result = Array.from(monthlyMap.values());
    await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }
}
