// src/leave/leave.controller.ts
import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveDto } from './dto/update-leave.dto';
import { ReviewLeaveDto } from './dto/review-leave.dto';
import { QueryLeaveDto } from './dto/query-leave.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { RequirePermissions } from 'src/auth/decorators/permissions.decorator';

@Controller('leave-requests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LeaveController {
  constructor(private readonly service: LeaveService) {}

  @Post()
  create(@Body() dto: CreateLeaveDto) {   
    return this.service.create(dto /*, actorId*/);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLeaveDto) {
    return this.service.update(id, dto /*, actorId*/);
  }


  @Patch(':id/review')
  @RequirePermissions({ modules: { anyOf: ['LeaveRequest', 'All'] }, actions: { anyOf: ['approve', 'manage'] } })
  review(@Param('id') id: string, @Body() dto: ReviewLeaveDto, @Req() req: any) {
    const reviewerId = req.user.userId; 
    return this.service.review(id, dto, reviewerId);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Get()
  @RequirePermissions({ modules: { anyOf: ['LeaveRequest', 'All'] }, actions: { anyOf: ['read', 'viewOwner', 'manage'] } })
  query(@Query() q: QueryLeaveDto, @Req() req: any) {    
    const userId = req.user.userId;
    const requirement = req.user.roles;     
    return this.service.query(q, userId, requirement);
  }
}
