import {
  Controller,
  Get,
  Patch,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { MembersService } from './members.service';
import { UpdateMemberDto } from './dto/update-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('members')
@UseGuards(JwtAuthGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get('profile')
  async getProfile(@Request() req: { user: { id: number } }) {
    return this.membersService.getProfile(req.user.id);
  }

  @Patch('profile')
  async updateProfile(
    @Request() req: { user: { id: number } },
    @Body() dto: UpdateMemberDto,
  ) {
    return this.membersService.updateProfile(req.user.id, dto);
  }

  @Get('activity')
  async getActivityHistory(
    @Request() req: { user: { id: number } },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.membersService.getActivityHistory(
      req.user.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }
}
