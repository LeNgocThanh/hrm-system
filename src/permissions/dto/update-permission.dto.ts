import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Action } from '../common/permission.constants';
import { Module } from '../common/module.constants';

export class UpdatePermissionDto {
  @ApiPropertyOptional({ 
    description: 'Name of the permission (e.g., Create User, Read User, Update User, Delete User)',
    example: 'Create User'
  })
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  name?: string;

  @ApiPropertyOptional({ 
    description: 'Module name (e.g., User, Asset)',
    example: Module.User,
    enum: Module
  })
  @IsOptional()  
  module?: Module;

  @ApiPropertyOptional({ 
    description: 'Action name (e.g., create, read, update, delete, approve, reject, export)',
    example: Action.CREATE,
    enum: Action
  })
  @IsOptional()
  action?: Action;

  @ApiPropertyOptional({ 
    description: 'Permission code (e.g., users:create, approvals:approve)',
    example: 'users:create'
  })
  @IsOptional()
  @IsString({ message: 'Permission code must be a string' })
  code?: string;

  @ApiPropertyOptional({ 
    description: 'Description of the permission',
    example: 'Permission to create new users'
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;
} 