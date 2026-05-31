import { Module } from '@nestjs/common';
import { ContributionsController } from './contributions.controller';
import { ContributionsService } from './contributions.service';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ContributionsController],
  providers: [ContributionsService],
  exports: [ContributionsService],
})
export class ContributionsModule {}
