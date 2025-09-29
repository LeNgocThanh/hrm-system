import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { OvertimeService } from './over-time.service';
import { CreateOvertimeDto } from './dto/create-overtime.dto';
import { UpdateOvertimeDto } from './dto/update-overtime.dto';
import { QueryOvertimeDto } from './dto/query-overtime.dto';
import { ReviewOvertimeDto } from './dto/review.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { RequirePermissions } from 'src/auth/decorators/permissions.decorator';


@Controller('overtime-requests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OvertimeController {
  constructor(private readonly service: OvertimeService) {}

  @Post()
  create(@Body() dto: CreateOvertimeDto) {
    // actorId: lấy từ req.user nếu có auth
    return this.service.create(dto /*, actorId*/);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOvertimeDto) {
    return this.service.update(id, dto /*, actorId*/);
  }

  @Patch(':id/review')
   @RequirePermissions({ modules: { anyOf: ['OverTime', 'All'] }, actions: { anyOf: ['approve', 'manage'] } })
  review(@Param('id') id: string, @Body() dto: ReviewOvertimeDto, @Req() req: any) {
    const reviewerId = req.user.userId; // Lấy reviewerId từ user đăng nhập
    return this.service.review(id, dto, reviewerId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Get()
  @RequirePermissions({ modules: { anyOf: ['OverTime', 'All'] }, actions: { anyOf: ['read', 'viewOwner', 'manage'] } })
  findMany(@Query() q: QueryOvertimeDto, @Req() req: any) {
    const userId = req.user.userId;
    const requirement = req.user.roles;
    return this.service.query(q, userId, requirement);
  }
}
