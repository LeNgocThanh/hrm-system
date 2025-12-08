// src/attendance/shift-session.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ShiftSessionService } from './shift-sessions.service';
import { CreateShiftSessionDto } from './dto/create-shift-session.dto';
import { UpdateShiftSessionDto } from './dto/update-shift-session.dto';

@Controller('shift-sessions')
export class ShiftSessionController {
  constructor(private readonly shiftSessionService: ShiftSessionService) {}

  @Post()
  create(@Body() dto: CreateShiftSessionDto) {
    return this.shiftSessionService.create(dto);
  }

  @Get()
  findAll() {
    return this.shiftSessionService.findAll();
  }

  @Get(':code')
  findOne(@Param('code') code: string) {
    return this.shiftSessionService.findOneByCode(code);
  }

  @Patch(':code')
  update(
    @Param('code') code: string,
    @Body() dto: UpdateShiftSessionDto,
  ) {
    return this.shiftSessionService.update(code, dto);
  }

  @Delete(':code')
  remove(@Param('code') code: string) {
    return this.shiftSessionService.remove(code);
  }
}
