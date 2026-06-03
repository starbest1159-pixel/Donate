import {
  Controller,
  Post,
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Body,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async confirmPayment(
    @Headers('x-webhook-secret') webhookSecret: string,
    @Body() body: { referenceCode?: string },
  ) {
    const expectedSecret = this.configService.get<string>('PAYMENT_WEBHOOK_SECRET');

    if (!webhookSecret || webhookSecret !== expectedSecret) {
      throw new UnauthorizedException('Invalid webhook secret');
    }

    return this.paymentsService.confirmPayment(body.referenceCode);
  }
}
