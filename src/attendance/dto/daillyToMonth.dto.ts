import { IsNotEmpty, IsString, IsDate } from 'class-validator';

export class DaillyToMonthDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  monthKey: string; // 'YYYY-MM'
}