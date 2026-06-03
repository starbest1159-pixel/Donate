import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { EmailModule } from '../email/email.module';
import { LogsModule } from '../logs/logs.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [PrismaModule, EmailModule, LogsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
