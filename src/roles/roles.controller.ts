import { Controller, Get, Post, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto, UpdateRoleDto, RoleResponseDto } from './dto';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @RequirePermissions({
  modules: { anyOf: ['All', 'User'] },
  actions: { anyOf: ['manage'] }})
  create(@Body() createRoleDto: CreateRoleDto): Promise<RoleResponseDto> {
    return this.rolesService.create(createRoleDto);
  }

  @Get()
  findAll(@Query('isActive') isActive?: string): Promise<RoleResponseDto[]> {
    const isActiveFilter = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.rolesService.findAll(isActiveFilter);
  }

  @Get('active')
  findActiveRoles(): Promise<RoleResponseDto[]> {
    return this.rolesService.findActiveRoles();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<RoleResponseDto> {
    return this.rolesService.findOne(id);
  }

  @Get(':id/permissions')
  getRolePermissions(@Param('id') id: string): Promise<any[]> {
    return this.rolesService.getRolePermissions(id);
  }

  @Put(':id')
  @RequirePermissions({
  modules: { anyOf: ['All', 'User'] },
  actions: { anyOf: ['manage'] }})
  update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto): Promise<RoleResponseDto> {
    return this.rolesService.update(id, updateRoleDto);
  }

  @Put(':id/permissions')
  @RequirePermissions({
  modules: { anyOf: ['All', 'User'] },
  actions: { anyOf: ['manage'] }})
  updateRolePermissions(@Param('id') id: string, @Body() permissionIds: string[]): Promise<RoleResponseDto> {
    return this.rolesService.updateRolePermissions(id, permissionIds);
  }

  @Delete(':id')
  @RequirePermissions({
  modules: { anyOf: ['All', 'User'] },
  actions: { anyOf: ['manage'] }})
  delete(@Param('id') id: string): Promise<RoleResponseDto> {
    return this.rolesService.delete(id);
  }
}
