import { IsBoolean, IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateShiftSessionDto {
  @IsString()
  code!: string;

  @IsString()
  start!: string; // 'HH:mm'

  @IsString()
  end!: string;   // 'HH:mm'

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsNumber()
  graceInMins?: number;

  @IsOptional()
  @IsNumber()
  graceOutMins?: number;

  @IsOptional()
  @IsNumber()
  breakMinutes?: number;

  @IsOptional()
  @IsNumber()
  maxCheckInEarlyMins?: number;

  @IsOptional()
  @IsNumber()
  maxCheckOutLateMins?: number;
}