import { IsArray, ArrayNotEmpty, IsISO8601, IsMongoId, IsOptional } from 'class-validator';

export class CheckParticipantConflictsDto {
  @IsArray() @ArrayNotEmpty()
  @IsMongoId({ each: true })
  participantIds: string[];

  @IsISO8601()
  startAt: string; // ISO string

  @IsISO8601()
  endAt: string;   // ISO string

  @IsOptional()
  @IsMongoId()
  excludeMeetingId?: string;
}
