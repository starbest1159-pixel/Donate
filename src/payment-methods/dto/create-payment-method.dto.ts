import { IsEnum, IsString, IsNotEmpty } from 'class-validator';
import { PaymentMethodType } from '@prisma/client';

export class CreatePaymentMethodDto {
  @IsEnum(PaymentMethodType)
  methodType: PaymentMethodType;

  @IsString()
  @IsNotEmpty()
  accountName: string;

  @IsString()
  @IsNotEmpty()
  accountNo: string;
}
