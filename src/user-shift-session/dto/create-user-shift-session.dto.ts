// src/attendance/dto/create-user-shift-session.dto.ts
import { IsArray, IsOptional, IsString, ArrayNotEmpty } from 'class-validator';

export class CreateUserShiftSessionDto {
  @IsString()
  userId!: string;

  @IsString()
  userCode!: string;

  @IsString()
  dateKey!: string; // 'YYYY-MM-DD'

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  shiftSessionCodes!: string[];
}
