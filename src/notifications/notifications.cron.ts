import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Meeting } from '../meetings/schemas/meeting.schema'; // đường dẫn theo project của bạn
import { MeetingStatus } from '../meetings/common/meeting-status.enum';
import { NotificationsService } from './notifications.service';
import { NotificationType } from './common/notification.enum';

@Injectable()
export class NotificationsCron {
  private readonly log = new Logger(NotificationsCron.name);
  constructor(
    @InjectModel(Meeting.name) private readonly meetingModel: Model<Meeting>,
    private readonly notif: NotificationsService,
  ) {}

  // 07:00 hằng ngày (giờ VN). Nếu bạn đã bật ScheduleModule.forRoot({ timezone: 'Asia/Ho_Chi_Minh' })
  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async remindTodaysAccepted() {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0,0,0,0);
    const to   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23,59,59,999);

    const meetings = await this.meetingModel.find({
      status: { $in: [MeetingStatus.SCHEDULED, MeetingStatus.IN_PROGRESS] },
      startAt: { $gte: from, $lte: to },
    }).lean();

    for (const m of meetings) {
      const accepted = (m.participants || []).filter(p => p.response === 'ACCEPTED'); // enum của bạn
      if (!accepted.length) continue;

      await this.notif.createMany(accepted.map(p => ({
        userId: p.userId,
        meetingId: m._id,
        type: NotificationType.MEETING_REMINDER,
        title: `Nhắc lịch: ${m.title}`,
        message: `Bắt đầu: ${new Date(m.startAt).toLocaleString()} · Phòng: ${String(m.roomId)}`,
        meta: { startAt: m.startAt, roomId: m.roomId },
      })));
    }

    this.log.log(`Sent reminders for ${meetings.length} meetings`);
  }
}
