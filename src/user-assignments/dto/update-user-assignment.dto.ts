import { PartialType } from '@nestjs/mapped-types';
import { CreateUserAssignmentDto } from './create-user-assignment.dto';

export class UpdateUserAssignmentDto extends PartialType(CreateUserAssignmentDto) {} 