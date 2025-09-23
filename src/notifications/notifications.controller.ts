import { Controller, Get, Patch, Param, Query, Req, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationStatus, NotificationType } from './common/notification.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
// không gắn @Permissions theo yêu cầu – giả định đã có auth middleware set req.user
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

@Get()
async myList(
  @Req() req: any,
  @Query('status') status?: NotificationStatus | 'ANY',
  @Query('type') type?: NotificationType,
  @Query('from') from?: string,
  @Query('to') to?: string,
  @Query('limit') limit?: string,
) {
  const userId = req.user._id || req.user.id || req.user.userId || req.user;
  console.log('NotificationsController.myList for user', userId, { status, type, from, to, limit });
  return this.svc.listForUser(userId, {
    status: (status as any) || undefined,
    type: type as NotificationType,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
    limit: Number(limit) || 50,
  });
}

@Get('day')
  async byDay(
    @Req() req: any,
    @Query('date') date?: string,
    @Query('status') status?: NotificationStatus | 'ANY',
    @Query('onlyMeeting') onlyMeeting?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user._id || req.user.id || req.user.userId || req.user;
    const d = date ? new Date(date + 'T00:00:00') : new Date();
    return this.svc.listByDayForUser(userId, {
      date: d,
      status: (status as any) || 'ANY',
      onlyMeeting: !!onlyMeeting,
      limit: Number(limit) || 200,
    });
  }

  @Patch(':id/read')
  async markRead(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?._id || req.user?.userId || req.user;
    await this.svc.markRead(userId, id);
    return { ok: true };
  }

  @Patch('read-all')
  async markAllRead(@Req() req: any) {
    const userId = req.user?._id || req.user?.userId || req.user;
    await this.svc.markAllRead(userId);
    return { ok: true };
  }
}

