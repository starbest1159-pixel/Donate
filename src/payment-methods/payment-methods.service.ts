import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';

@Injectable()
export class PaymentMethodsService {
  private readonly logger = new Logger(PaymentMethodsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePaymentMethodDto) {
    const paymentMethod = await this.prisma.paymentMethod.create({
      data: {
        methodType: dto.methodType,
        accountName: dto.accountName,
        accountNo: dto.accountNo,
      },
    });

    this.logger.log(`Payment method created: ${paymentMethod.id}`);
    return paymentMethod;
  }

  async findAll() {
    return this.prisma.paymentMethod.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const paymentMethod = await this.prisma.paymentMethod.findUnique({
      where: { id },
    });

    if (!paymentMethod) {
      throw new NotFoundException(`Payment method with ID ${id} not found`);
    }

    return paymentMethod;
  }

  async update(id: number, dto: UpdatePaymentMethodDto) {
    await this.findOne(id);

    const paymentMethod = await this.prisma.paymentMethod.update({
      where: { id },
      data: {
        ...(dto.accountName !== undefined && { accountName: dto.accountName }),
        ...(dto.accountNo !== undefined && { accountNo: dto.accountNo }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    this.logger.log(`Payment method updated: ${id}`);
    return paymentMethod;
  }

  async toggleActive(id: number) {
    const paymentMethod = await this.findOne(id);

    const updated = await this.prisma.paymentMethod.update({
      where: { id },
      data: { isActive: !paymentMethod.isActive },
    });

    this.logger.log(
      `Payment method ${id} toggled to ${updated.isActive ? 'active' : 'inactive'}`,
    );
    return updated;
  }
}
