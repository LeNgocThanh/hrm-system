import { IsNotEmpty, IsString, MinLength, IsOptional, IsMongoId } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserAccountDto {
  @ApiProperty({ description: 'User ID to create account for' })
  @IsNotEmpty({ message: 'User ID is required' })
  @IsMongoId({ message: 'User ID must be a valid MongoDB ObjectId' })
  userId: string;

  @ApiProperty({ description: 'Username for login', example: 'john.doe' })
  @IsNotEmpty({ message: 'Username is required' })
  @IsString({ message: 'Username must be a string' })
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  username: string;

  @ApiProperty({ description: 'Password for login', example: 'SecurePassword123!' })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString({ message: 'Password must be a string' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiPropertyOptional({ description: 'ID of user who created this account' })
  @IsOptional()
  @IsMongoId({ message: 'Created by must be a valid MongoDB ObjectId' })
  createdBy?: string;

  @ApiPropertyOptional({ description: 'Creation time' })
  @IsOptional()
  createTime?: Date;
}
