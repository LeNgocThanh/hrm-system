import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { SessionCode } from '../common/session-code.enum';

export class ShiftSessionDto {
  @ApiProperty({ enum: SessionCode })
  @IsEnum(SessionCode)
  code!: SessionCode;

  @ApiProperty({ example: '08:30', description: 'Định dạng HH:mm (24h)' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'start phải là HH:mm' })
  start!: string;

  @ApiProperty({ example: '12:00', description: 'Định dạng HH:mm (24h)' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'end phải là HH:mm' })
  end!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  required?: boolean = true;
}
