import { IsEnum, IsNotEmpty, IsDateString } from 'class-validator';
import { TimeEntryType } from '../schemas/user-time-entries.schema';

export class CreateUserTimeEntryDto {
  @IsNotEmpty()
  userId: string;

  @IsEnum(TimeEntryType)
  type: TimeEntryType;

  @IsDateString()
  startAt: Date;

  @IsDateString()
  endAt: Date;

  @IsNotEmpty()
  refId: string;
}
