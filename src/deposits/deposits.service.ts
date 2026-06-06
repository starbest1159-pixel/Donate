import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class DepositsService {
  constructor(private readonly prisma: PrismaService) {}

  async createDeposit(merchantId: string, amount: number, createdBy: string, slipUrl?: string) {
    const referenceCode = `DEP-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    return this.prisma.deposit.create({
      data: {
        merchantId,
        amount,
        referenceCode,
        slipUrl,
        createdBy,
        status: 'PENDING',
      },
    });
  }

  async approveDeposit(depositId: string, verifiedBy: string) {
    return this.prisma.$transaction(async (tx) => {
      const deposit = await tx.deposit.findUnique({ where: { id: depositId } });
      if (!deposit || deposit.status !== 'PENDING') {
        throw new Error('Deposit not found or not in PENDING status');
      }

      // Use the PostgreSQL function for race-condition-safe balance credit
      const result = await tx.$queryRaw<Array<{ credit_merchant_balance: string}>>`
        SELECT credit_merchant_balance(
          ${deposit.merchantId}::uuid,
          ${deposit.amount}::numeric,
          'DEPOSIT'::text,
          ${deposit.id}::uuid,
          'Deposit approved'::text
        ) as credit_merchant_balance
      `;

      await tx.deposit.update({
        where: { id: depositId },
        data: {
          status: 'APPROVED',
          verifiedBy,
          verifiedAt: new Date(),
        },
      });

      return result;
    });
  }

  async rejectDeposit(depositId: string, verifiedBy: string, notes?: string) {
    return this.prisma.deposit.update({
      where: { id: depositId },
      data: {
        status: 'REJECTED',
        verifiedBy,
        verifiedAt: new Date(),
        notes,
      },
    });
  }
}
