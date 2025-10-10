import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsOptional, IsString, Matches, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { WeeklyRulesDto } from './weekly-rules.dto';

export class CreateShiftTypeDto {  

  @ApiProperty({ description: 'Mã ca (duy nhất trong org)', example: 'REGULAR' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9_\-\.]{2,50}$/, { message: 'code viết HOA/0-9/_-., 2-50 ký tự' })
  code!: string;

  @ApiProperty({ example: 'Ca hành chính 5.5 ngày' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'Asia/Bangkok' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ type: WeeklyRulesDto })
  @ValidateNested()
  @Type(() => WeeklyRulesDto)
  weeklyRules!: WeeklyRulesDto;
}
