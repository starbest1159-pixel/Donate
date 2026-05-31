import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MembersModule } from './members/members.module';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module';
import { ContributionsModule } from './contributions/contributions.module';
import { SessionsModule } from './sessions/sessions.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AdminModule } from './admin/admin.module';
import { LogsModule } from './logs/logs.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import * as redisStore from 'cache-manager-redis-store';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CacheModule.register({
      store: redisStore,
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      ttl: 600,
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    MembersModule,
    PaymentMethodsModule,
    ContributionsModule,
    SessionsModule,
    DashboardModule,
    AdminModule,
    LogsModule,
    SchedulerModule,
  ],
})
export class AppModule {}
