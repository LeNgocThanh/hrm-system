import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsMongoId, IsString, IsDateString, MinLength, IsOptional, IsArray, IsIn,
  ValidateNested, IsInt, Min
} from 'class-validator';
import { Type } from 'class-transformer';

class ParticipantUpdateDto {
  @IsMongoId() userId: string;
  @IsOptional() @IsIn(['CHAIR','REQUIRED','OPTIONAL']) role?: 'CHAIR'|'REQUIRED'|'OPTIONAL';
  @IsOptional() @IsString() note?: string;
}

class ExternalGroupUpdateDto {
  @IsOptional() @IsString() leaderName?: string;
  @IsOptional() @IsString() leaderPhone?: string;
  @IsOptional() @IsString() organization?: string;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsInt() @Min(0) headcount?: number;
}

export class UpdateMeetingDto {
  @ApiPropertyOptional() @IsOptional() @IsMongoId() organizationId?: string; // thường không đổi
  @ApiPropertyOptional() @IsOptional() @IsMongoId() roomId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(3) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() agenda?: string;

  // Ghi chú hành chính (được phép sửa sau khi kết thúc)
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;

  // Sửa thời gian (tuỳ trạng thái sẽ bị giới hạn)
  @ApiPropertyOptional() @IsOptional() @IsDateString() startAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endAt?: string;

  // Danh sách nội bộ & đoàn khách (chỉ sửa trước khi bắt đầu)
  @ApiPropertyOptional({ type: [ParticipantUpdateDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ParticipantUpdateDto)
  participants?: ParticipantUpdateDto[];

  @ApiPropertyOptional({ type: [ExternalGroupUpdateDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ExternalGroupUpdateDto)
  externalGuests?: ExternalGroupUpdateDto[];

  @ApiPropertyOptional() @IsOptional() requiresApproval?: boolean;
}
