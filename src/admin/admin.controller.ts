import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  NotFoundException,
  Body,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { MemberStatus } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('members')
  async listMembers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listMembers(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('members/:id')
  async getMember(@Param('id', ParseIntPipe) id: number) {
    const member = await this.adminService.getMember(id);
    if (!member) {
      throw new NotFoundException(`Member with ID ${id} not found`);
    }
    return member;
  }

  @Patch('members/:id/status')
  async updateMemberStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: MemberStatus },
  ) {
    const member = await this.adminService.updateMemberStatus(id, body.status);
    if (!member) {
      throw new NotFoundException(`Member with ID ${id} not found`);
    }
    return member;
  }

  @Get('requests')
  async listAllRequests(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.listAllRequests(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
      status,
    );
  }

  @Get('logs')
  async getLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getLogs(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
      userId ? parseInt(userId, 10) : undefined,
      action,
      startDate,
      endDate,
    );
  }
}
