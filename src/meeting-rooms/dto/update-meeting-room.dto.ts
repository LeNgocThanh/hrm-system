import { PartialType } from '@nestjs/mapped-types';
import { CreateMeetingRoomDto } from './create-meeting-room.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateMeetingRoomDto extends PartialType(CreateMeetingRoomDto) {
  @ApiPropertyOptional({ description: 'Kích hoạt/khóa phòng', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Sức chứa', example: 12, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}
