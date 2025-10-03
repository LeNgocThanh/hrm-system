import { IsNotEmpty, IsDateString } from 'class-validator';

export class CheckConflictDto {
  @IsNotEmpty()
  userId: string;

  @IsDateString()
  startAt: Date;

  @IsDateString()
  endAt: Date;

  refId?: string; // khi update thì truyền vào để loại trừ chính nó
}
