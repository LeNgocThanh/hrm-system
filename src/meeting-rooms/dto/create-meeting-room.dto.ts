import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsMongoId, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateMeetingRoomDto {
  @ApiProperty({ description: 'ID tổ chức', example: '66cfa1f0c6c4c2d72f7f8b11' })
  @IsMongoId()
  organizationId: string;

  @ApiProperty({ description: 'Tên phòng', example: 'Phòng họp 501' })
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ description: 'Vị trí', example: 'Tầng 5 - Trụ sở chính' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ description: 'Sức chứa', example: 10, default: 4, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number = 4;

  @ApiPropertyOptional({ description: 'Thiết bị', example: ['TV', 'Mic', 'Projector'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  equipment?: string[];

  @ApiPropertyOptional({ description: 'Có cần duyệt đặt phòng không', example: true, default: true })
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean = true;

  @ApiPropertyOptional({ description: 'Danh sách user quản lý/phê duyệt phòng', type: [String], example: ['66cfb2a0e6a34d98a7b8a222'] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  managers?: string[];
}
