import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePositionDto {
  @ApiPropertyOptional({ description: 'Name of the position (e.g., Manager, Staff, Director)' })
  @IsOptional()
  @IsString({ message: 'Position name must be a string' })
  name?: string;

  @ApiPropertyOptional({ description: 'Description of the position' })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Level or rank of the position (e.g., 1 = staff, 3 = manager)'
  })
  @IsOptional()
  @IsNumber({}, { message: 'Level must be a number' })
  level?: number;

  @ApiPropertyOptional({ description: 'Whether the position is active' })
  @IsOptional()
  @IsBoolean({ message: 'IsActive must be a boolean' })
  isActive?: boolean;
} 