// src/attendance/dto/update-user-shift-session.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserShiftSessionDto } from './create-user-shift-session.dto';

export class UpdateUserShiftSessionDto extends PartialType(
  CreateUserShiftSessionDto,
) {}
