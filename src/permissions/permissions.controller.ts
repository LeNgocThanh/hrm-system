import { Controller, Get, Post, Body, Param, Put, Delete, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto, UpdatePermissionDto, PermissionResponseDto } from './dto';
import { Action } from './common/permission.constants';
import { ParseEnumPipe } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Post()
  @RequirePermissions({
  modules: { anyOf: ['All', 'User'] },
  actions: { anyOf: ['manage'] },})
  create(@Body() createPermissionDto: CreatePermissionDto): Promise<PermissionResponseDto> {
    return this.permissionsService.create(createPermissionDto);
  }

  @Get()
  findAll(@Query('module') module?: string): Promise<PermissionResponseDto[]> {
    return this.permissionsService.findAll(module);
  }

  @Get('modules')
  getModules(): Promise<string[]> {
    return this.permissionsService.getModules();
  }

  @Get('by-module/:module')
  findByModule(@Param('module') module: string): Promise<PermissionResponseDto[]> {
    return this.permissionsService.findByModule(module);
  }

  @Get('by-action/:action')
  findByAction(@Param('action', new ParseEnumPipe(Action)) action: Action): Promise<PermissionResponseDto[]> {
    return this.permissionsService.findByAction(action);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<PermissionResponseDto> {
    return this.permissionsService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions({
  modules: { anyOf: ['All', 'User'] },
  actions: { anyOf: ['manage'] },})
  update(@Param('id') id: string, @Body() updatePermissionDto: UpdatePermissionDto): Promise<PermissionResponseDto> {
    return this.permissionsService.update(id, updatePermissionDto);
  }

  @Delete(':id')
  @RequirePermissions({
  modules: { anyOf: ['All', 'User'] },
  actions: { anyOf: ['manage'] },})
  delete(@Param('id') id: string): Promise<PermissionResponseDto> {
    return this.permissionsService.delete(id);
  }
}
