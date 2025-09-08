import { Controller, Get, Post, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { PositionsService } from './positions.service';
import { CreatePositionDto, UpdatePositionDto, PositionResponseDto } from './dto';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('positions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PositionsController {
  constructor(private readonly positionsService: PositionsService) {}

  @Post()
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
  update(@Param('id') id: string, @Body() updatePositionDto: UpdatePositionDto): Promise<PositionResponseDto> {
    return this.positionsService.update(id, updatePositionDto);
  }

  @Delete(':id')
  delete(@Param('id') id: string): Promise<PositionResponseDto> {
    return this.positionsService.delete(id);
  }
}
