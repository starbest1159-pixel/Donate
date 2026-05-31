import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../database/prisma.service';

interface JwtPayload {
  sub: number;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET || 'default-access-secret',
    });
  }

  async validate(payload: JwtPayload): Promise<{
    id: number;
    email: string;
    role: string;
    status: string;
  }> {
    const member = await this.prisma.member.findUnique({
      where: { id: payload.sub },
    });

    if (!member) {
      throw new UnauthorizedException('User not found');
    }

    if (member.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    return {
      id: member.id,
      email: member.email,
      role: member.role,
      status: member.status,
    };
  }
}
