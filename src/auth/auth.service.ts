import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly BCRYPT_SALT_ROUNDS = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{
    id: number;
    username: string;
    email: string;
    role: string;
  }> {
    const existingUser = await this.prisma.member.findFirst({
      where: {
        OR: [{ email: dto.email }, { username: dto.username }],
      },
    });

    if (existingUser) {
      if (existingUser.email === dto.email) {
        throw new ConflictException('Email already registered');
      }
      throw new ConflictException('Username already taken');
    }

    const passwordHash = await bcrypt.hash(
      dto.password,
      this.BCRYPT_SALT_ROUNDS,
    );

    const member = await this.prisma.member.create({
      data: {
        username: dto.username,
        email: dto.email,
        passwordHash,
        role: 'MEMBER',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
      },
    });

    this.logger.log(`New member registered: ${member.email}`);
    return member;
  }

  async login(dto: LoginDto): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const member = await this.validateMember(dto.email, dto.password);
    if (!member) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(
      member.id,
      member.email,
      member.role,
    );
    await this.storeRefreshToken(member.id, tokens.refreshToken);

    this.logger.log(`Member logged in: ${member.email}`);
    return tokens;
  }

  async logout(userId: number): Promise<void> {
    const redis = this.getRedisClient();
    if (redis) {
      await redis.del(`refresh:${userId}`);
    }
    this.logger.log(`Member logged out: ${userId}`);
  }

  async changePassword(
    userId: number,
    dto: ChangePasswordDto,
  ): Promise<void> {
    const member = await this.prisma.member.findUnique({
      where: { id: userId },
    });

    if (!member) {
      throw new BadRequestException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      member.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newPasswordHash = await bcrypt.hash(
      dto.newPassword,
      this.BCRYPT_SALT_ROUNDS,
    );

    await this.prisma.member.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    await this.logout(userId);
    this.logger.log(`Password changed for user: ${userId}`);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const member = await this.prisma.member.findUnique({
      where: { email: dto.email },
    });

    if (!member) {
      this.logger.warn(
        `Password reset attempted for non-existent email: ${dto.email}`,
      );
      return;
    }

    const temporaryPassword = crypto.randomBytes(16).toString('base64url');
    const newPasswordHash = await bcrypt.hash(
      temporaryPassword,
      this.BCRYPT_SALT_ROUNDS,
    );

    await this.prisma.member.update({
      where: { id: member.id },
      data: { passwordHash: newPasswordHash },
    });

    await this.logout(member.id);
    this.logger.log(`Password reset for user: ${member.email}`);
  }

  async refresh(
    userId: number,
    refreshToken: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const redis = this.getRedisClient();
    if (redis) {
      const storedToken = await redis.get(`refresh:${userId}`);
      if (!storedToken || storedToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }
    }

    const member = await this.prisma.member.findUnique({
      where: { id: userId },
    });

    if (!member || member.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid or inactive user');
    }

    const tokens = await this.generateTokens(
      member.id,
      member.email,
      member.role,
    );
    await this.storeRefreshToken(member.id, tokens.refreshToken);

    return tokens;
  }

  async validateMember(
    email: string,
    password: string,
  ): Promise<{
    id: number;
    email: string;
    role: string;
    status: string;
  } | null> {
    const member = await this.prisma.member.findUnique({
      where: { email },
    });

    if (!member) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, member.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    if (member.status !== 'ACTIVE') {
      return null;
    }

    return {
      id: member.id,
      email: member.email,
      role: member.role,
      status: member.status,
    };
  }

  async generateTokens(
    userId: number,
    email: string,
    role: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET || 'default-access-secret',
      expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
      expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
    });

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(
    userId: number,
    refreshToken: string,
  ): Promise<void> {
    const redis = this.getRedisClient();
    if (redis) {
      const expirySeconds = 7 * 24 * 60 * 60;
      await redis.set(`refresh:${userId}`, refreshToken, {
        EX: expirySeconds,
      });
    }
  }

  private getRedisClient() {
    const cacheManager = (global as Record<string, unknown>).__REDIS_CLIENT__;
    return cacheManager as ReturnType<typeof import('ioredis').default> | null;
  }
}
