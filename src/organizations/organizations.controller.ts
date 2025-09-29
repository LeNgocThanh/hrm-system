import { Controller, Get, Post, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto, UpdateOrganizationDto, OrganizationResponseDto } from './dto';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('organizations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @RequirePermissions({
    modules: { anyOf: ['All', 'User'] },
    actions: { anyOf: ['manage'] },})
  create(@Body() createOrganizationDto: CreateOrganizationDto): Promise<OrganizationResponseDto> {
    return this.organizationsService.create(createOrganizationDto);
  }

  @Get()
  findAll(@Query('type') type?: string): Promise<OrganizationResponseDto[]> {
    return this.organizationsService.findAll(type);
  }

  @Get('root')
  findRootOrganizations(): Promise<OrganizationResponseDto[]> {
    return this.organizationsService.findRootOrganizations();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<OrganizationResponseDto> {
    return this.organizationsService.findOne(id);
  }

  @Get(':id/children')
  findChildren(@Param('id') id: string): Promise<OrganizationResponseDto[]> {
    return this.organizationsService.findChildren(id);
  }

  @Get(':id/ancestors')
  findAncestors(@Param('id') id: string): Promise<OrganizationResponseDto[]> {
    return this.organizationsService.findAncestors(id);
  }

  @Get(':id/descendants')
  findDescendants(@Param('id') id: string): Promise<OrganizationResponseDto[]> {
    return this.organizationsService.findDescendants(id);
  }

  @Put(':id')
  @RequirePermissions({
    modules: { anyOf: ['All', 'User'] },
    actions: { anyOf: ['manage'] },})
  update(@Param('id') id: string, @Body() updateOrganizationDto: UpdateOrganizationDto): Promise<OrganizationResponseDto> {
    return this.organizationsService.update(id, updateOrganizationDto);
  }

  @Delete(':id')
  @RequirePermissions({
    modules: { anyOf: ['All', 'User'] },
    actions: { anyOf: ['manage'] },})
  delete(@Param('id') id: string): Promise<OrganizationResponseDto> {
    return this.organizationsService.delete(id);
  }

  @Get(':id/users')
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiQuery({ name: 'fields', required: false, type: String, example: 'username email firstName lastName' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findUsersInTree(
    @Param('id') id: string,
    @Query('includeInactive') includeInactive?: string,
    @Query('fields') fields?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{
    totalUsers: number;
    users: any[];
    page?: number;
    limit?: number;
  }> {
    const { totalUsers, users } = await this.organizationsService.findUsersInTree(id, {
      includeInactive: includeInactive === 'true',
      fields,
    });

    // (tuỳ chọn) phân trang ở controller – nếu không cần thì bỏ block bên dưới
    const pageNum = Math.max(parseInt(page ?? '1', 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit ?? '0', 10) || 0, 0); // 0 = không phân trang

    if (!limitNum) {
      return { totalUsers, users };
    }

    const start = (pageNum - 1) * limitNum;
    const end = start + limitNum;
    return {
      totalUsers,
      users: users.slice(start, end),
      page: pageNum,
      limit: limitNum,
    };
  }
}


