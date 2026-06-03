import { IsNumber, Min, Max, IsInt } from 'class-validator';

export class CreateContributionDto {
  @IsNumber()
  @Min(1)
  @Max(1000000)
  amount: number;

  @IsInt()
  paymentMethodId: number;
}
