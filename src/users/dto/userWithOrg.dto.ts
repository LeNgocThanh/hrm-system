import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto';

export class UserWithOrgResponseDto extends UserResponseDto {
  organizationId?: string;
  organizationName?: string;
}