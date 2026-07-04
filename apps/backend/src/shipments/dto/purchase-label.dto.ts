import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class PurchaseLabelDto {
  @IsString()
  @IsOptional()
  rateId?: string;

  @IsString()
  @IsOptional()
  labelFileType?: string;
}
