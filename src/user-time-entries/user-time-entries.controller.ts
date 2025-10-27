import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { UserTimeEntriesService } from './user-time-entries.service';
import { CreateUserTimeEntryDto } from './dto/create-user-time-entries.dto';
import { UpdateUserTimeEntryDto } from './dto/update-user-time-entries.dto';
import { CheckConflictDto } from './dto/check-conflict-user-time-entries.dto';
import { QuerryUserTimeEntryDto } from './dto/querry-user-time-entry.dto';

@Controller('user-time-entries')
export class UserTimeEntriesController {
  constructor(private readonly service: UserTimeEntriesService) {}

  // 🔹 Create
  @Post()
  async create(@Body() dto: CreateUserTimeEntryDto) {
    return this.service.create(dto);
  }

  // 🔹 Get all
  @Get()
  async findAll() {
    return this.service.findAll();
  }

  @Get('by-user-and-time')
  async findByUserAndTime(@Query() dto: QuerryUserTimeEntryDto) {
    return this.service.findByUserAndTime(dto);
  }

  // 🔹 Get one
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  // 🔹 Update
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserTimeEntryDto) {
    return this.service.update(id, dto);
  }

  // 🔹 Delete
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  // 🔹 Check conflict API
  @Post('check-conflict')
  async checkConflict(@Body() dto: CheckConflictDto) {
    return { conflict: await this.service.checkConflict(dto) };
  }
}
