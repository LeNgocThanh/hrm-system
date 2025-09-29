import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiQuery, ApiOkResponse, ApiCreatedResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssignAssetDto } from './dto/assign-asset.dto';
import { CreateAssetEventDto } from './dto/create-event.dto';
import { CreateAssetDocumentDto } from './dto/create-asset-document.dto';
import { UpdateAssetDocumentDto } from './dto/update-asset-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@ApiTags('assets')
@Controller('assets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) { }
 
  @Post()
   @RequirePermissions({
    modules: { anyOf: ['All', 'Asset'] },
    actions: { anyOf: ['manage', 'create'] },
  })
  @ApiCreatedResponse({ description: 'Tạo tài sản' })
  create(@Body() dto: CreateAssetDto) {
    return this.assetsService.create(dto);
  }
  
  @Get()
  @RequirePermissions({
    modules: { anyOf: ['All', 'Asset'] },
    actions: { anyOf: ['manage', 'read', 'viewOwner'] },
  })
  @ApiOkResponse({ description: 'Danh sách tài sản (có phân trang)' })
  @ApiQuery({ name: 'text', required: false })
  findAll(@Query() query: any, @Req() req: any) {
    const userId = req.user.userId;
    const requirement = req.user.roles;   
    return this.assetsService.findAll(query, userId, requirement);
  }
 
  @Get(':id')
   @RequirePermissions({
    modules: { anyOf: ['All', 'Asset'] },
    actions: { anyOf: ['manage', 'read', 'viewOwner'] },
  })
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }
 
  @Get('/UserOwn/:userId')
   @RequirePermissions({
    modules: { anyOf: ['All', 'Asset'] },
    actions: { anyOf: ['manage', 'read', 'viewOwner'] },
  })
  findAllUserOwn(@Param('userId') userId: string) {
    return this.assetsService.findAssetsByHolderId(userId);
  }
  
  @Get('/OrganizationOwn/:userIds')
  @RequirePermissions({
    modules: { anyOf: ['All', 'Asset'] },
    actions: { anyOf: ['manage', 'read'] },
  })
  findAllOrganizationOwn(@Param('userId') userIds: string[]) {
    return this.assetsService.findAssetsByHolderIds(userIds);
  }
  
  @Patch(':id')
  @RequirePermissions({
    modules: { anyOf: ['All', 'Asset'] },
    actions: { anyOf: ['manage', 'update'] },
  })
  update(@Param('id') id: string, @Body() dto: UpdateAssetDto) {
    return this.assetsService.update(id, dto);
  }
 
  @Delete(':id')
   @RequirePermissions({
    modules: { anyOf: ['All', 'Asset'] },
    actions: { anyOf: ['manage', 'delete'] },
  })
  remove(@Param('id') id: string) {
    return this.assetsService.remove(id);
  }  
 
  @Post(':id/assign')
   @RequirePermissions({
    modules: { anyOf: ['All', 'Asset'] },
    actions: { anyOf: ['manage', 'create'] },
  })
  assign(@Param('id') id: string, @Body() dto: AssignAssetDto) {
    return this.assetsService.assign(id, dto);
  }

  // Tạo một sự kiện mới cho tài sản 
  @Post(':id/events')
   @RequirePermissions({
    modules: { anyOf: ['All', 'Asset'] },
    actions: { anyOf: ['manage', 'create'] },
  })
  createEvent(@Param('id') id: string, @Body() dto: CreateAssetEventDto) {
    return this.assetsService.createEvent(id, dto);
  }
  
  @Delete('/events/:id')
  @RequirePermissions({
    modules: { anyOf: ['All', 'Asset'] },
    actions: { anyOf: ['manage', 'delete'] },
  })
  deleteEvent(@Param('id') id: string) {
    return this.assetsService.removeEvent(id);
  }

  // Lấy lịch sử sự kiện của tài sản  
  @Get(':id/history')
  @RequirePermissions({
    modules: { anyOf: ['All', 'Asset'] },
    actions: { anyOf: ['manage', 'read', 'viewOwner'] },
  })
  history(@Param('id') id: string) {
    return this.assetsService.history(id);
  }

  // === Các API cho Asset Documents === 
  @Post(':id/documents')
   @RequirePermissions({
    modules: { anyOf: ['All', 'Asset'] },
    actions: { anyOf: ['manage', 'create'] },
  })
  @ApiCreatedResponse({ description: 'Tạo tài liệu cho một tài sản' })
  createDocument(@Param('id') id: string, @Body() dto: CreateAssetDocumentDto) {
    return this.assetsService.createAssetDocument(id, dto);
  }
  
  @Get(':id/documents')
  @RequirePermissions({
    modules: { anyOf: ['All', 'Asset'] },
    actions: { anyOf: ['manage', 'read', 'viewOwner'] },
  })
  @ApiOkResponse({ description: 'Danh sách tài liệu của một tài sản' })
  findDocuments(@Param('id') id: string) {
    return this.assetsService.findAssetDocuments(id);
  }
  
  @Patch('documents/:docId')
  @RequirePermissions({
    modules: { anyOf: ['All', 'Asset'] },
    actions: { anyOf: ['manage', 'update'] },
  })
  @ApiOkResponse({ description: 'Cập nhật tài liệu tài sản' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy tài liệu' })
  updateDocument(@Param('docId') docId: string, @Body() dto: UpdateAssetDocumentDto) {
    return this.assetsService.updateAssetDocument(docId, dto);
  }
 
  @Delete('documents/:docId')
   @RequirePermissions({
    modules: { anyOf: ['All', 'Asset'] },
    actions: { anyOf: ['manage', 'delete'] },
  })
  @ApiOkResponse({ description: 'Xóa tài liệu tài sản' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy tài liệu' })
  removeDocument(@Param('docId') docId: string) {
    return this.assetsService.removeAssetDocument(docId);
  }
}