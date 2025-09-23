// src/leave/leave.controller.ts
import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveDto } from './dto/update-leave.dto';
import { ReviewLeaveDto } from './dto/review-leave.dto';
import { QueryLeaveDto } from './dto/query-leave.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';

@Controller('leave-requests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LeaveController {
  constructor(private readonly service: LeaveService) {}

  @Post()
  create(@Body() dto: CreateLeaveDto) {
    // actorId có thể lấy từ req.user.sub nếu bạn dùng AuthGuard/JWT
    return this.service.create(dto /*, actorId*/);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLeaveDto) {
    return this.service.update(id, dto /*, actorId*/);
  }

  @Patch(':id/review')
  review(@Param('id') id: string, @Body() dto: ReviewLeaveDto, @Req() req: any) {
    const reviewerId = req.user.userId; // Lấy reviewerId từ user đăng nhập
    return this.service.review(id, dto, reviewerId);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Get()
  query(@Query() q: QueryLeaveDto) {
    return this.service.query(q);
  }
}
