import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
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
  constructor(private readonly assetsService: AssetsService) {}

  @RequirePermissions({
  modules: { anyOf: ['All', 'Asset'] },
  actions: { anyOf: ['manage','create'] },})
  @Post()
  @ApiCreatedResponse({ description: 'Tạo tài sản' })
  create(@Body() dto: CreateAssetDto) {
    return this.assetsService.create(dto);
  }

  @RequirePermissions({
  modules: { anyOf: ['All', 'Asset'] },
  actions: { anyOf: ['manage','read'] },})
  @Get()
  @ApiOkResponse({ description: 'Danh sách tài sản (có phân trang)' })
  @ApiQuery({ name: 'text', required: false })
  findAll(@Query() query: any) {
    return this.assetsService.findAll(query);
  }

  @RequirePermissions({
  modules: { anyOf: ['All', 'Asset'] },
  actions: { anyOf: ['manage','read'] },})
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }


   @RequirePermissions({
  modules: { anyOf: ['All', 'Asset'] },
  actions: { anyOf: ['manage','read'] },})
  @Get('/UserOwn/:userId')
  findAllUserOwn(@Param('userId') userId: string) {
    return this.assetsService.findAssetsByHolderId(userId);
  }


   @RequirePermissions({
  modules: { anyOf: ['All', 'Asset'] },
  actions: { anyOf: ['manage','read'] },}) 
  @Get('/OrganizationOwn/:userIds')
  findAllOrganizationOwn(@Param('userId') userIds: string[]) {
    return this.assetsService.findAssetsByHolderIds(userIds);
  }

  @RequirePermissions({
  modules: { anyOf: ['All', 'Asset'] },
  actions: { anyOf: ['manage','update'] },})
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAssetDto) {
    return this.assetsService.update(id, dto);
  }


  @RequirePermissions({
  modules: { anyOf: ['All', 'Asset'] },
  actions: { anyOf: ['manage','delete'] },}) 
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.assetsService.remove(id);
  }

  // Bàn giao/assign nhanh
  @RequirePermissions({
  modules: { anyOf: ['All', 'Asset'] },
  actions: { anyOf: ['manage','create'] },})
  @Post(':id/assign')
  assign(@Param('id') id: string, @Body() dto: AssignAssetDto) {
    return this.assetsService.assign(id, dto);
  }

  // Tạo một sự kiện mới cho tài sản
  @RequirePermissions({
  modules: { anyOf: ['All', 'Asset'] },
  actions: { anyOf: ['manage','create'] },})
  @Post(':id/events')
  createEvent(@Param('id') id: string, @Body() dto: CreateAssetEventDto) {
    return this.assetsService.createEvent(id, dto);
  }

  @RequirePermissions({
  modules: { anyOf: ['All', 'Asset'] },
  actions: { anyOf: ['manage','delete'] },})
  @Delete('/events/:id')
  deleteEvent(@Param('id') id: string) {
    return this.assetsService.removeEvent(id);
  }

  // Lấy lịch sử sự kiện của tài sản
  @RequirePermissions({
  modules: { anyOf: ['All', 'Asset'] },
  actions: { anyOf: ['manage','read'] },})
  @Get(':id/history')
  history(@Param('id') id: string) {
    return this.assetsService.history(id);
  }

  // === Các API cho Asset Documents ===
  @RequirePermissions({
  modules: { anyOf: ['All', 'Asset'] },
  actions: { anyOf: ['manage','create'] },})
  @Post(':id/documents')
  @ApiCreatedResponse({ description: 'Tạo tài liệu cho một tài sản' })
  createDocument(@Param('id') id: string, @Body() dto: CreateAssetDocumentDto) {
    return this.assetsService.createAssetDocument(id, dto);
  }

  @RequirePermissions({
  modules: { anyOf: ['All', 'Asset'] },
  actions: { anyOf: ['manage','read'] },})
  @Get(':id/documents')
  @ApiOkResponse({ description: 'Danh sách tài liệu của một tài sản' })
  findDocuments(@Param('id') id: string) {
    return this.assetsService.findAssetDocuments(id);
  }

  @RequirePermissions({
  modules: { anyOf: ['All', 'Asset'] },
  actions: { anyOf: ['manage','update'] },})
  @Patch('documents/:docId')
  @ApiOkResponse({ description: 'Cập nhật tài liệu tài sản' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy tài liệu' })
  updateDocument(@Param('docId') docId: string, @Body() dto: UpdateAssetDocumentDto) {
    return this.assetsService.updateAssetDocument(docId, dto);
  }

  @RequirePermissions({
  modules: { anyOf: ['All', 'Asset'] },
  actions: { anyOf: ['manage','delete'] },})
  @Delete('documents/:docId')
  @ApiOkResponse({ description: 'Xóa tài liệu tài sản' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy tài liệu' })
  removeDocument(@Param('docId') docId: string) {
    return this.assetsService.removeAssetDocument(docId);
  }
}