import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { ApproveMeetingDto } from './dto/approve-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { MeetingStatus } from './common/meeting-status.enum';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Meeting } from './schemas/meeting.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CheckParticipantConflictsDto } from './dto/check-participant-conflicts.dto';
import { AvailabilityService } from './availability.service';


@ApiTags('Meetings')
//@ApiBearerAuth()
@Controller('meetings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MeetingsController {
  constructor(private readonly meetings: MeetingsService, private readonly availability: AvailabilityService) {}
  

 
  @RequirePermissions({
  modules: { anyOf: ['All', 'Meeting'] },
  actions: { anyOf: ['manage','create'] },})
  @Post()
  @ApiOperation({ summary: 'Tạo/đăng ký cuộc họp' })
  @ApiOkResponse({ type: Meeting })
  create(@Body() dto: CreateMeetingDto, @Req() req: any) {      
    return this.meetings.create(dto, req.user.userId)
  }

  @RequirePermissions({
  modules: { anyOf: ['All', 'Meeting'] },
  actions: { anyOf: ['manage','approve'] },})
  @Post(':id/approve')
  @ApiOperation({ summary: 'Phê duyệt/Từ chối cuộc họp' })
  @ApiOkResponse({ type: Meeting })
  approve(@Param('id') id: string, @Body() dto: ApproveMeetingDto, @Req() req: any) {
    return this.meetings.approve(id, dto, req.user.userId);
  }


  @RequirePermissions({
  modules: { anyOf: ['All', 'Meeting'] },
  actions: { anyOf: ['manage','approve','update'] },}) 
  @Patch(':id')
  @ApiOperation({
    summary: 'Cập nhật cuộc họp',
    description:
      '- **Chưa duyệt**: sửa tự do.\n' +
      '- **Đã duyệt, chưa bắt đầu**: sửa tự do (sau này gắn quyền cao hơn).\n' +
      '- **Đang diễn ra**: chỉ sửa `endAt` (không trùng meetings SCHEDULED khác cùng phòng).\n' +
      '- **Đã kết thúc**: chỉ sửa `note`.',
  })
  @ApiOkResponse({ type: Meeting })
  update(@Param('id') id: string, @Body() dto: UpdateMeetingDto) {
    return this.meetings.update(id, dto);
  }

  @RequirePermissions({
  modules: { anyOf: ['All', 'Meeting'] },
  actions: { anyOf: ['manage','delete'] },}) 
  @Delete(':id')
  @ApiOperation({
    summary: 'Xóa cuộc họp',
    description:
      '- Cho xóa khi **PENDING_APPROVAL** (bất kể thời gian) hoặc **SCHEDULED** nhưng **chưa bắt đầu**.\n' +
      '- Không cho xóa khi đã bắt đầu/kết thúc.',
  })
  remove(@Param('id') id: string) {
    return this.meetings.remove(id);
  }

  @RequirePermissions({
  modules: { anyOf: ['All', 'Meeting'] },
  actions: { anyOf: ['manage','delete', 'approve'] },}) 
  @Post(':id/cancel')
  @ApiOperation({ summary: 'Hủy cuộc họp (chỉ trước giờ bắt đầu)' })
  @ApiOkResponse({ type: Meeting })
  cancel(@Param('id') id: string, @Req() req: any) {
    return this.meetings.cancel(id, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết cuộc họp' })
  @ApiOkResponse({ type: Meeting })
  getOne(@Param('id') id: string) {
    return this.meetings.findOne(id);
  }

@Get()
  @ApiOperation({ summary: 'Danh sách cuộc họp' })
  @ApiOkResponse({ type: [Meeting] })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'roomId', required: false })
  @ApiQuery({ name: 'from', required: false, description: 'ISO 8601' })
  @ApiQuery({ name: 'to', required: false, description: 'ISO 8601' })
  @ApiQuery({ name: 'status', required: false, enum: MeetingStatus })
  @ApiQuery({ name: 'participantId', required: false, description: 'User nội bộ' })
  @ApiQuery({ name: 'organizerId', required: false, description: 'User chủ trì (organizer)' }) // <-- thêm
  list(
    @Query('organizationId') organizationId?: string,
    @Query('roomId') roomId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: MeetingStatus,
    @Query('participantId') participantId?: string,
    @Query('organizerId') organizerId?: string, // <-- thêm
  ) {
    return this.meetings.list({ organizationId, roomId, from, to, status, participantId, organizerId });
  }

  @Post(':id/rsvp')
  async rsvp(
    @Param('id') id: string,
    @Body() body: { response: 'ACCEPTED' | 'DECLINED'; note?: string },
    @Req() req: any,
  ) {
    const userId = req.user?._id || req.user?.userId || req.user;
    return this.meetings.rsvp(id, userId, body.response, body.note);
  }

  @Get('me/pending-rsvp')
  async myPendingRsvp(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user._id || req.user.userId;
    const fromD = from ? new Date(from) : undefined;
    const toD   = to   ? new Date(to)   : undefined;
    return this.meetings.listPendingRsvpForUser(userId, fromD, toD, Number(limit)||50);
  }

@Get('me/today')
async myToday(
  @Req() req: any,
  @Query('date') date?: string,                 // YYYY-MM-DD (local Asia/Bangkok trên FE)
  @Query('acceptedOnly') acceptedOnly?: string, // 'true' | 'false'
  @Query('limit') limit?: string,
) {
  const userId = req.user._id || req.user.id;
  const d = date ? new Date(date + 'T00:00:00') : undefined;
  const only = acceptedOnly !== 'false'; // mặc định true
  return this.meetings.listTodaysForUser(userId, { date: d, acceptedOnly: only, limit: Number(limit) || 100 });
}

@Post('conflicts/participants')
  async checkParticipantsConflicts(@Body() dto: CheckParticipantConflictsDto) {
    return this.availability.findParticipantsConflicts({
      participantIds: dto.participantIds,
      startAt: new Date(dto.startAt),
      endAt:   new Date(dto.endAt),
      excludeMeetingId: dto.excludeMeetingId,
    });
  }

}
