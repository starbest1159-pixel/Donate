import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EmailService } from '../email/email.service';
import { LogsService } from '../logs/logs.service';
import { ContributionStatus } from '@prisma/client';
import { generatePaymentReceiptEmail } from '../email/email.templates';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly logsService: LogsService,
  ) {}

  async confirmPayment(referenceCode: string) {
    const request = await this.prisma.contributionRequest.findUnique({
      where: { referenceCode },
      include: {
        member: true,
        paymentMethod: true,
        qrSession: true,
      },
    });

    if (!request) {
      throw new NotFoundException(
        `Contribution request with reference code ${referenceCode} not found`,
      );
    }

    if (request.status !== ContributionStatus.WAITING) {
      throw new BadRequestException(
        'Only waiting contribution requests can be confirmed',
      );
    }

    const confirmed = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.contributionRequest.update({
        where: { id: request.id },
        data: {
          status: ContributionStatus.PAID,
          paidAt: new Date(),
        },
        include: {
          member: true,
          paymentMethod: true,
        },
      });

      if (request.qrSession) {
        await tx.qrSession.delete({
          where: { requestId: request.id },
        });
      }

      return updated;
    });

    const redis = this.getRedisClient();
    if (redis) {
      await redis.del(`qr:session:${request.id}`);
    }

    await this.logsService.createLog({
      userId: request.memberId,
      action: 'PAYMENT_CONFIRMED',
      details: `Payment confirmed for reference code ${referenceCode}`,
    });

    // Fire-and-forget email – do NOT roll back on failure
    try {
      const { subject, html } = generatePaymentReceiptEmail({
        username: confirmed.member.username,
        amount: confirmed.amount.toString(),
        referenceCode: confirmed.referenceCode,
        paymentMethodType: confirmed.paymentMethod.methodType,
        paidAt: confirmed.paidAt!.toISOString(),
      });
      await this.emailService.sendEmail(confirmed.member.email, subject, html);
    } catch (error) {
      this.logger.error(
        `Failed to send receipt email for reference code ${referenceCode}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    this.logger.log(
      `Payment confirmed for contribution request ${confirmed.id} (reference: ${referenceCode})`,
    );

    return confirmed;
  }

  private getRedisClient() {
    const cacheManager = (global as Record<string, unknown>).__REDIS_CLIENT__;
    return cacheManager as ReturnType<typeof import('ioredis').default> | null;
  }
}
