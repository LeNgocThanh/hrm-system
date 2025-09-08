import { IsEmail, IsOptional, IsString, IsEnum, IsDate, IsMongoId } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'Full name of the user' })
  @IsOptional()
  @IsString({ message: 'Full name must be a string' })
  fullName?: string;

  @ApiPropertyOptional({ description: 'Birthday of the user' })
  @IsOptional()
  @IsDate({ message: 'Birthday must be a date' })
  birthDay?: Date;

  @ApiPropertyOptional({ description: 'Email address of the user' })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email?: string;

  @ApiPropertyOptional({ description: 'Phone number of the user' })
  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  phone?: string;

  @ApiPropertyOptional({ description: 'Plain text password (will be hashed before saving)' })
  @IsOptional()
  @IsString({ message: 'Password must be a string' })
  password?: string;

  @ApiPropertyOptional({ description: 'Avatar URL of the user' })
  @IsOptional()
  @IsString({ message: 'Avatar URL must be a string' })
  avatarUrl?: string;

  @ApiPropertyOptional({ 
    description: 'Status of the user',
    enum: ['active', 'inactive', 'terminated']
  })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'terminated'], { 
    message: 'Status must be one of: active, inactive, terminated' 
  })
  status?: string;

  @ApiPropertyOptional({ description: 'Gender of the user' })
  @IsOptional()
  @IsString({ message: 'Gender must be a string' })
  gender?: string;

  @ApiPropertyOptional({ description: 'Details of the user' })
  @IsOptional()
  @IsString({ message: 'Details must be a string' })
  details?: string;

  // Audit fields
  @ApiPropertyOptional({ description: 'ID of user who edited this record' })
  @IsOptional()
  @IsMongoId({ message: 'Edited by must be a valid MongoDB ObjectId' })
  editedBy?: string;

  @ApiPropertyOptional({ description: 'Update time' })
  @IsOptional()
  updateTime?: Date;
}