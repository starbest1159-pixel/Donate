import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class UpdatePaymentMethodDto {
  @IsOptional()
  @IsString()
  accountName?: string;

  @IsOptional()
  @IsString()
  accountNo?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
