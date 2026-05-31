import { IsOptional, IsEnum, IsDateString, IsInt, Min } from 'class-validator';
import { ContributionStatus } from '@prisma/client';

export class FilterContributionDto {
  @IsOptional()
  @IsEnum(ContributionStatus)
  status?: ContributionStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
