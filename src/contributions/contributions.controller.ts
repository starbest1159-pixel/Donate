import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ContributionsService } from './contributions.service';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { FilterContributionDto } from './dto/filter-contribution.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('contributions')
@UseGuards(JwtAuthGuard)
export class ContributionsController {
  constructor(private readonly contributionsService: ContributionsService) {}

  @Post()
  async create(
    @Request() req: { user: { id: number } },
    @Body() dto: CreateContributionDto,
  ) {
    return this.contributionsService.create(req.user.id, dto);
  }

  @Patch(':id/cancel')
  async cancel(
    @Request() req: { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.contributionsService.cancel(id, req.user.id);
  }

  @Get()
  async findAll(
    @Request() req: { user: { id: number } },
    @Query() filter: FilterContributionDto,
  ) {
    return this.contributionsService.findAll(req.user.id, filter);
  }

  @Get(':id')
  async findOne(
    @Request() req: { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.contributionsService.findOne(id, req.user.id);
  }
}
