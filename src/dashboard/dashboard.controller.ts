import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getStats() {
    return this.dashboardService.getStats();
  }

  @Get('daily')
  async getDailyStats(@Query('days') days?: string) {
    return this.dashboardService.getDailyStats(days ? parseInt(days, 10) : 30);
  }

  @Get('monthly')
  async getMonthlyStats(@Query('months') months?: string) {
    return this.dashboardService.getMonthlyStats(
      months ? parseInt(months, 10) : 12,
    );
  }
}
