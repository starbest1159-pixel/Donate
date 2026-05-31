import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<{
    id: number;
    email: string;
    role: string;
    status: string;
  }> {
    const member = await this.authService.validateMember(email, password);
    if (!member) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return member;
  }
}
