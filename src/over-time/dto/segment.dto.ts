import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional } from 'class-validator';
import { OvertimeKind, CompensationType  } from '../common/overTime.enum';

export class OvertimeSegmentDto {
  @Type(() => Date) @IsDate()
  startAt!: Date;

  @Type(() => Date) @IsDate()
  endAt!: Date;

  @IsOptional()
  @IsEnum(OvertimeKind)
  kind?: OvertimeKind;

  @IsOptional()
  @IsEnum(CompensationType)
  compensationOverride?: CompensationType;
}
