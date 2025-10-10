import { PartialType } from '@nestjs/swagger';
import { CreateUserPolicyBindingDto } from './create-user-policy-binding.dto';

export class UpdateUserPolicyBindingDto extends PartialType(CreateUserPolicyBindingDto) {}