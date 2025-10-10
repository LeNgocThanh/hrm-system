// src/shift-types/shift-types.controller.ts
import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ShiftTypesService } from './shift_types.service';
import { CreateShiftTypeDto } from './dto/create-shift-type.dto';
import { UpdateShiftTypeDto } from './dto/update-shift-type.dto';

@ApiTags('Shift Types')
// @ApiBearerAuth() // bật nếu bạn dùng auth
@Controller('shift-types')
export class ShiftTypesController {
  constructor(private readonly service: ShiftTypesService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo shift type' })
  async create(@Body() dto: CreateShiftTypeDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách shift types (có phân trang, tìm kiếm)' })
  @ApiQuery({ name: 'q', required: false, description: 'Tìm theo code/name/timezone' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async findAll(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll({
      q,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết theo _id' })
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Get('by-code/:code')
  @ApiOperation({ summary: 'Xem chi tiết theo code' })
  async findByCode(@Param('code') code: string) {
    return this.service.findByCode(code);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật shift type' })
  async update(@Param('id') id: string, @Body() dto: UpdateShiftTypeDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xoá shift type' })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
