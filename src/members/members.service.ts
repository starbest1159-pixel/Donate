import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateMemberDto } from './dto/update-member.dto';
import { PaginationResult } from '../common/interfaces/pagination.interface';

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: number) {
    const member = await this.prisma.member.findUnique({
      where: { id: userId },
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

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return member;
  }

  async updateProfile(userId: number, dto: UpdateMemberDto) {
    if (dto.email) {
      const existingEmail = await this.prisma.member.findFirst({
        where: { email: dto.email, id: { not: userId } },
      });
      if (existingEmail) {
        throw new ConflictException('Email already in use');
      }
    }

    if (dto.username) {
      const existingUsername = await this.prisma.member.findFirst({
        where: { username: dto.username, id: { not: userId } },
      });
      if (existingUsername) {
        throw new ConflictException('Username already taken');
      }
    }

    const member = await this.prisma.member.update({
      where: { id: userId },
      data: {
        ...(dto.username && { username: dto.username }),
        ...(dto.email && { email: dto.email }),
      },
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

    this.logger.log(`Profile updated for user: ${userId}`);
    return member;
  }

  async getActivityHistory(
    userId: number,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginationResult<{ id: number; action: string; ipAddress: string | null; createdAt: Date }>> {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where: { userId },
        select: {
          id: true,
          action: true,
          ipAddress: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.activityLog.count({ where: { userId } }),
    ]);

    return {
      data: logs,
      total,
      page,
      limit,
    };
  }

  async findByEmail(email: string) {
    return this.prisma.member.findUnique({
      where: { email },
    });
  }

  async findById(id: number) {
    return this.prisma.member.findUnique({
      where: { id },
    });
  }
}
