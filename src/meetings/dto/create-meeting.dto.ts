import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsMongoId, IsString, IsDateString, MinLength, IsOptional, IsArray, IsIn,
  ValidateNested, IsInt, Min
} from 'class-validator';
import { Type } from 'class-transformer';

class ParticipantDto {
  @ApiProperty({ description: 'ID user nội bộ' })
  @IsMongoId() userId: string;

  @ApiPropertyOptional({ enum: ['CHAIR','REQUIRED','OPTIONAL'], default: 'REQUIRED' })
  @IsIn(['CHAIR','REQUIRED','OPTIONAL']) role?: 'CHAIR'|'REQUIRED'|'OPTIONAL';

  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

class ExternalGroupDto {
  @ApiPropertyOptional() @IsOptional() @IsString() leaderName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() leaderPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() organization?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;

  @ApiProperty({ description: 'Số khách của đoàn', example: 8, minimum: 0 })
  @IsInt() @Min(0) headcount: number;
}

export class CreateMeetingDto {
  @ApiProperty() @IsMongoId() organizationId: string;
  @ApiProperty() @IsMongoId() roomId: string;

  @ApiProperty() @IsString() @MinLength(3) title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() agenda?: string;

  @ApiProperty({ description: 'Bắt đầu (ISO 8601)' })
  @IsDateString() startAt: string;

  @ApiProperty({ description: 'Kết thúc (ISO 8601), phải > startAt' })
  @IsDateString() endAt: string;

  @ApiProperty({ type: [ParticipantDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => ParticipantDto)
  participants: ParticipantDto[];

  @ApiPropertyOptional({ type: [ExternalGroupDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ExternalGroupDto)
  externalGuests?: ExternalGroupDto[];

  @ApiPropertyOptional({ description: 'Override yêu cầu duyệt của phòng' })
  @IsOptional() requiresApproval?: boolean;
}
