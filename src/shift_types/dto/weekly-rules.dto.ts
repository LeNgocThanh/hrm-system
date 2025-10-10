import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ShiftSessionDto } from './session.dto';

export class WeeklyRulesDto {
  @ApiPropertyOptional({ type: [ShiftSessionDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ShiftSessionDto) ['0']?: ShiftSessionDto[];
  @ApiPropertyOptional({ type: [ShiftSessionDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ShiftSessionDto) ['1']?: ShiftSessionDto[];
  @ApiPropertyOptional({ type: [ShiftSessionDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ShiftSessionDto) ['2']?: ShiftSessionDto[];
  @ApiPropertyOptional({ type: [ShiftSessionDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ShiftSessionDto) ['3']?: ShiftSessionDto[];
  @ApiPropertyOptional({ type: [ShiftSessionDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ShiftSessionDto) ['4']?: ShiftSessionDto[];
  @ApiPropertyOptional({ type: [ShiftSessionDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ShiftSessionDto) ['5']?: ShiftSessionDto[];
  @ApiPropertyOptional({ type: [ShiftSessionDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ShiftSessionDto) ['6']?: ShiftSessionDto[];
}
