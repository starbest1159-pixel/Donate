import { Global, Module } from '@nestjs/common';
import { LogsService } from './logs.service';
import { PrismaModule } from '../database/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [LogsService],
  exports: [LogsService],
})
export class LogsModule {}
