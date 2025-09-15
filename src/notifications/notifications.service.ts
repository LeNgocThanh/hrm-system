import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification } from './schemas/notification.schema';
import { NotificationStatus, NotificationType } from './common/notification.enum';

function startOfDayLocal(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDayLocal(d: Date)   { const x = new Date(d); x.setHours(23,59,59,999); return x; }

@Injectable()
export class NotificationsService {
  constructor(@InjectModel(Notification.name) private readonly model: Model<Notification>) {}

  async create(input: {
    userId: Types.ObjectId | string;
    meetingId: Types.ObjectId | string;
    type: NotificationType;
    title: string;
    message?: string;
    meta?: Record<string, any>;
  }) {
    return this.model.create({
      ...input,
      userId: new Types.ObjectId(input.userId),
      meetingId: new Types.ObjectId(input.meetingId),
      status: NotificationStatus.UNREAD,
    });
  }

  async createMany(items: Array<{
    userId: Types.ObjectId | string;
    meetingId: Types.ObjectId | string;
    type: NotificationType;
    title: string;
    message?: string;
    meta?: Record<string, any>;
  }>) {
    if (!items.length) return [];
    return this.model.insertMany(items.map(i => ({
      ...i,
      userId: new Types.ObjectId(i.userId),
      meetingId: new Types.ObjectId(i.meetingId),
      status: NotificationStatus.UNREAD,
    })));
  }

  async listByDayForUser(
    userId: string,
    opts: { date?: Date; status?: NotificationStatus | 'ANY'; onlyMeeting?: boolean; limit?: number } = {}
  ) {
    const uid = new Types.ObjectId(userId);
    const date = opts?.date ?? new Date();
    const from = startOfDayLocal(date);
    const to   = endOfDayLocal(date);

    const filter: any = { userId: uid, publishAt: { $gte: from, $lte: to } };
    if (opts.status && opts.status !== 'ANY') filter.status = opts.status;
    if (opts.onlyMeeting) filter.meetingId = { $exists: true, $ne: null };

    const limit = Math.min(Math.max(opts?.limit ?? 200, 1), 500);
    return this.model.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  }

async listForUser(
    userId: string,
    q: {
      status?: NotificationStatus | 'ANY';
      type?: NotificationType | string;
      from?: Date;
      to?: Date;
      limit?: number;
    } = {},
  ) {
    const filter: any = { userId: new Types.ObjectId(userId) };

    if (q.status && q.status !== 'ANY') {
      filter.status = q.status;
    }
    if (q.type) {
      filter.type = q.type; // chấp nhận string enum
    }
    if (q.from || q.to) {
      filter.createdAt = {};
      if (q.from) filter.createdAt.$gte = q.from;
      if (q.to) filter.createdAt.$lte = q.to;
    }

    const limit = Math.min(Math.max(q.limit ?? 50, 1), 200);

    // DEBUG (nếu cần): console.log('Notif filter:', JSON.stringify(filter));
   // console.log('Notif filter:', JSON.stringify(filter));
    return this.model.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  }



  async markRead(userId: string, id: string) {
    return this.model.updateOne(
      { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
      { $set: { status: NotificationStatus.READ } },
    );
  }

  async markAllRead(userId: string) {
    return this.model.updateMany(
      { userId: new Types.ObjectId(userId), status: NotificationStatus.UNREAD },
      { $set: { status: NotificationStatus.READ } },
    );
  }

  async markAllPastRead() {
    return this.model.updateMany(
      { status: NotificationStatus.UNREAD, expireAt: { $lt: new Date() } },
      { $set: { status: NotificationStatus.READ } },
    );
  }
}
