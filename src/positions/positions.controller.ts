import { Controller, Get, Post, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { PositionsService } from './positions.service';
import { CreatePositionDto, UpdatePositionDto, PositionResponseDto } from './dto';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('positions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class PositionsController {
  constructor(private readonly positionsService: PositionsService) {}

  @Post()
  @RequirePermissions({
    modules: { anyOf: ['All', 'User'] },
    actions: { anyOf: ['manage'] },})
  create(@Body() createPositionDto: CreatePositionDto): Promise<PositionResponseDto> {
    return this.positionsService.create(createPositionDto);
  }

  @Get()
  findAll(@Query('isActive') isActive?: string): Promise<PositionResponseDto[]> {
    const isActiveFilter = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.positionsService.findAll(isActiveFilter);
  }

  @Get('active')
  findActivePositions(): Promise<PositionResponseDto[]> {
    return this.positionsService.findActivePositions();
  }

  @Get('by-level/:level')
  findByLevel(@Param('level') level: string): Promise<PositionResponseDto[]> {
    return this.positionsService.findByLevel(parseInt(level));
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<PositionResponseDto> {
    return this.positionsService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions({
    modules: { anyOf: ['All', 'User'] },
    actions: { anyOf: ['manage'] },})
  update(@Param('id') id: string, @Body() updatePositionDto: UpdatePositionDto): Promise<PositionResponseDto> {
    return this.positionsService.update(id, updatePositionDto);
  }

  @Delete(':id')
  @RequirePermissions({
    modules: { anyOf: ['All', 'User'] },
    actions: { anyOf: ['manage'] },})
  delete(@Param('id') id: string): Promise<PositionResponseDto> {
    return this.positionsService.delete(id);
  }
}
