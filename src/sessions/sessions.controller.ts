import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get(':requestId/validate')
  async validate(@Param('requestId', ParseIntPipe) requestId: number) {
    return this.sessionsService.validate(requestId);
  }

  @Post(':requestId/expire')
  @Roles('ADMIN')
  async expire(@Param('requestId', ParseIntPipe) requestId: number) {
    return this.sessionsService.expire(requestId);
  }
}
