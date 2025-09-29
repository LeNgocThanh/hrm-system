import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @RequirePermissions({
  modules: { anyOf: ['All', 'User'] },
  actions: { anyOf: ['manage','create'] },})
  @Post()
  create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {    
    return this.usersService.create(createUserDto);
  }


  @RequirePermissions({
  modules: { anyOf: ['All', 'User'] },
  actions: { anyOf: ['manage','read'] },})
  @Get()
  findAll(): Promise<UserResponseDto[]> {
    return this.usersService.findAll();
  }

  @RequirePermissions({ modules: { anyOf: ['User', 'All'] }, actions: { anyOf: ['read', 'viewOwner', 'manage'] } })
  @Get('/by-organization')
  findByOrganizations(@Req() req: any): Promise<UserResponseDto[]> {
    const userId = req.user.userId;
    const roles = req.user.roles;
    return this.usersService.findByOrganization(userId, roles);
  }
  
  @RequirePermissions({
  modules: { anyOf: ['All', 'User'] },
  actions: { anyOf: ['manage','read'] },})
  @Get(':id')
  findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  @RequirePermissions({
  modules: { anyOf: ['All', 'User'] },
  actions: { anyOf: ['manage','update'] },})
  @Put(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    return this.usersService.update(id, updateUserDto);
  }

  @RequirePermissions({
  modules: { anyOf: ['All', 'User'] },
  actions: { anyOf: ['manage','delete'] },})
  @Delete(':id')
  delete(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.delete(id);
  }
}
