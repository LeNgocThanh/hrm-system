import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Meeting, MeetingDocument } from './schemas/meeting.schema';
import { MeetingStatus } from './common/meeting-status.enum';

@Injectable()
export class MeetingsCronService {
  private readonly logger = new Logger(MeetingsCronService.name);

  constructor(
    @InjectModel(Meeting.name) private readonly meetingModel: Model<MeetingDocument>,
  ) {}

  // Chạy lúc 02:00 hằng ngày theo múi giờ BKK (có thể override bằng env CRON_TZ)
  @Cron('0 2 * * *', { timeZone: process.env.CRON_TZ || 'Asia/Bangkok' })
  async autoCompleteOverdue() {
    const now = new Date();
    const filter = { status: MeetingStatus.SCHEDULED, endAt: { $lte: now } };

    // Ưu tiên updateMany với pipeline (MongoDB >=4.2) để set finishedAt=endAt
    try {
      // @ts-ignore - Mongoose hỗ trợ pipeline updates
      const res = await this.meetingModel.updateMany(filter, [
        { $set: { status: MeetingStatus.COMPLETED, finishedAt: '$endAt' } },
      ]).exec();

      this.logger.log(`Auto-completed meetings: ${res?.modifiedCount ?? 0}`);
    } catch (e) {
      // Fallback: duyệt từng document nếu pipeline không khả dụng
      const docs = await this.meetingModel.find(filter).select('_id endAt').lean();
      let n = 0;
      for (const d of docs) {
        await this.meetingModel.updateOne(
          { _id: d._id },
          { $set: { status: MeetingStatus.COMPLETED, finishedAt: d.endAt } },
        ).exec();
        n++;
      }
      this.logger.log(`Auto-completed meetings (fallback): ${n}`);
    }
  } 

  @Cron('0 2 * * *', { timeZone: process.env.CRON_TZ || 'Asia/Bangkok' })
  async autoRejectOverdue() {
    const now = new Date();
    const filter = { status: MeetingStatus.PENDING_APPROVAL, startAt: { $lte: now } };
   
    try {     
      const res = await this.meetingModel.updateMany(filter, [
        { $set: { status: MeetingStatus.REJECTED, finishedAt: now } },
      ]).exec();
      this.logger.log(`Auto-reject meetings: ${res?.modifiedCount ?? 0}`);
    } catch (e) {     
      const docs = await this.meetingModel.find(filter).select('_id').lean();
      let n = 0;
      for (const d of docs) {
        await this.meetingModel.updateOne(
          { _id: d._id },
          { $set: { status: MeetingStatus.REJECTED, finishedAt: now } },
        ).exec();
        n++;
      }
      this.logger.log(`Auto-reject meetings (fallback): ${n}`);
    }
  } 

}
