import { IsString, IsNumber, Min } from 'class-validator';

export class CreateQuoteDto {
  @IsString()
  fromAddress: string;

  @IsString()
  toAddress: string;

  @IsNumber()
  @Min(0.01)
  weight: number;
}
