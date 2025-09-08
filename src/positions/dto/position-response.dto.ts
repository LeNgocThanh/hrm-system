import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PositionResponseDto {
  @ApiProperty({ description: 'Unique identifier of the position' })
  _id: string;

  @ApiProperty({ description: 'Name of the position (e.g., Manager, Staff, Director)' })
  name: string;

  @ApiPropertyOptional({ description: 'Description of the position' })
  description?: string;

  @ApiProperty({ description: 'Level or rank of the position' })
  level: number;

  @ApiProperty({ description: 'Whether the position is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
} 