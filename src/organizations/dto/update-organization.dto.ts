import { IsOptional, IsString, IsEnum, IsBoolean, IsNumber, IsMongoId, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Types } from 'mongoose';

export class UpdateOrganizationDto {
  @ApiPropertyOptional({ description: 'Name of the organization' })
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Type of organization',
    enum: ['group', 'company', 'division', 'department']
  })
  @IsOptional()
  @IsEnum(['group', 'company', 'division', 'department'], {
    message: 'Type must be one of: group, company, division, department'
  })
  type?: string;

  @ApiPropertyOptional({ description: 'Parent organization ID' })
  @IsOptional()
  @IsMongoId({ message: 'Parent must be a valid MongoDB ObjectId' })
  parent?: Types.ObjectId;

  @ApiPropertyOptional({ description: 'Level in organization hierarchy' })
  @IsOptional()
  @IsNumber({}, { message: 'Level must be a number' })
  level?: number;

  @ApiPropertyOptional({ description: 'Path in organization hierarchy' })
  @IsOptional()
  @IsString({ message: 'Path must be a string' })
  path?: string;


  @ApiPropertyOptional({ description: 'Organization code' })
  @IsOptional()
  @ValidateIf(o => o.code !== null)
  @IsString()
  code?: string | null;

  @ApiPropertyOptional({ description: 'Organization description' })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @ApiPropertyOptional({ description: 'Whether the organization is active' })
  @IsOptional()
  @IsBoolean({ message: 'IsActive must be a boolean' })
  isActive?: boolean;
} 