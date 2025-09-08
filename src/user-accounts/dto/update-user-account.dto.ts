import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsString, MinLength, IsMongoId } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateUserAccountDto } from './create-user-account.dto';

export class UpdateUserAccountDto extends PartialType(CreateUserAccountDto) {
  @ApiPropertyOptional({
    description: 'Account status',
    enum: ['active', 'inactive', 'locked', 'suspended']
  })
  @IsOptional()
  @IsString({ message: 'Status must be a string' })
  status?: string;

  @ApiPropertyOptional({ description: 'New password' })
  @IsOptional()
  @IsString({ message: 'Password must be a string' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password?: string;

  @ApiPropertyOptional({ description: 'ID of user who edited this account' })
  @IsOptional()
  @IsMongoId({ message: 'Edited by must be a valid MongoDB ObjectId' })
  editedBy?: string;

  @ApiPropertyOptional({ description: 'Update time' })
  @IsOptional()
  updateTime?: Date;
}
