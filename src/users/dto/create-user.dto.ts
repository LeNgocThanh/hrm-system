import { IsEmail, IsNotEmpty, IsOptional, IsString, IsEnum, IsDate, IsMongoId } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Date } from 'mongoose';

export class CreateUserDto {
  @ApiProperty({ description: 'Full name of the user' })
  @IsNotEmpty({ message: 'Full name is required' })
  @IsString({ message: 'Full name must be a string' })
  fullName: string;

  @ApiProperty({ description: 'Full name of the user' })
  @IsOptional()
  @IsDate({ message: 'Full name must be a date' })
  birthDay?: Date;

  @ApiProperty({ description: 'Email address of the user' })
  @IsEmail({}, { message: 'Please provide a valid email address' }) 
  email: string;

  @ApiPropertyOptional({ description: 'Phone number of the user' })
  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  phone?: string;

  @ApiProperty({ description: 'Plain text password (will be hashed before saving)' })
  @IsOptional()
  @IsString({ message: 'Password must be a string' })
  password?: string;

  @ApiPropertyOptional({ description: 'Avatar URL of the user' })
  @IsOptional()
  @IsString({ message: 'Avatar URL must be a string' })
  avatarUrl?: string;

  @ApiProperty({ description: 'Gender of the user' })
  @IsNotEmpty({ message: 'Gender is required' })
  @IsString({ message: 'Gender must be a string' })
  gender: string;

  @ApiPropertyOptional({ description: 'Details of the user' })
  @IsOptional()
  @IsString({ message: 'Details must be a string' })
  details?: string;

  @ApiPropertyOptional({
    description: 'Status of the user',
    enum: ['active', 'inactive', 'terminated'],
    default: 'active'
  })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'terminated'], {
    message: 'Status must be one of: active, inactive, terminated'
  })
  status?: string;

  // Audit fields
  @ApiPropertyOptional({ description: 'ID of user who created this record' })
  @IsOptional()
  @IsMongoId({ message: 'Created by must be a valid MongoDB ObjectId' })
  createdBy?: string;

  @ApiPropertyOptional({ description: 'Creation time' })
  @IsOptional()
  createTime?: Date;
}