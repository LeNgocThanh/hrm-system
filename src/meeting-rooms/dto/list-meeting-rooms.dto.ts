import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional } from 'class-validator';

export class ListMeetingRoomsQueryDto {
  @ApiPropertyOptional({ description: 'Lọc theo Organization', example: '66cfa1f0c6c4c2d72f7f8b11' })
  @IsOptional()
  @IsMongoId()
  organizationId?: string;
}