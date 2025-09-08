import { IsNotEmpty, IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePositionDto {
  @ApiProperty({ description: 'Name of the position (e.g., Manager, Staff, Director)' })
  @IsNotEmpty({ message: 'Position name is required' })
  @IsString({ message: 'Position name must be a string' })
  name: string;

  @ApiPropertyOptional({ description: 'Description of the position' })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Level or rank of the position (e.g., 1 = staff, 3 = manager)',
    default: 1
  })
  @IsOptional()
  @IsNumber({}, { message: 'Level must be a number' })
  level?: number;

  @ApiPropertyOptional({ 
    description: 'Whether the position is active',
    default: true
  })
  @IsOptional()
  @IsBoolean({ message: 'IsActive must be a boolean' })
  isActive?: boolean;
} 