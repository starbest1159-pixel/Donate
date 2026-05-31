import { IsString, IsEmail, MinLength, MaxLength, IsOptional } from 'class-validator';

export class UpdateMemberDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
