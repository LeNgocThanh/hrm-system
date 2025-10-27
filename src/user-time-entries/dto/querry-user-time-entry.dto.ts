import { IsEnum, IsNotEmpty, IsDateString, IsOptional } from 'class-validator';
import { TimeEntryType } from '../schemas/user-time-entries.schema';

export class QuerryUserTimeEntryDto {
  @IsNotEmpty()
  userId: string;

  @IsEnum(TimeEntryType)
  type?: TimeEntryType;

  @IsNotEmpty()
  @IsDateString()
  startAt: Date;

  @IsNotEmpty()
  @IsDateString()
  endAt: Date;

  @IsOptional()
  refId?: string;
}
