// src/attendance-daily/dto/recompute-range-batch.dto.ts
import { IsArray, IsOptional, IsString, ArrayNotEmpty } from 'class-validator';

export class RecomputeRangeBatchDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];

  @IsOptional()
  @IsString()
  from?: string; // 'YYYY-MM-DD'

  @IsOptional()
  @IsString()
  to?: string;   // 'YYYY-MM-DD'
}
