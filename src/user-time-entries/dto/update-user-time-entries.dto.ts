import { PartialType } from '@nestjs/mapped-types';
import { CreateUserTimeEntryDto } from './create-user-time-entries.dto';

export class UpdateUserTimeEntryDto extends PartialType(CreateUserTimeEntryDto) {}
