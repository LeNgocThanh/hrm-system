// src/attendance/dto/update-shift-session.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateShiftSessionDto } from './create-shift-session.dto';

export class UpdateShiftSessionDto extends PartialType(CreateShiftSessionDto) {}
