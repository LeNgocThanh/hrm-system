import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AttendanceSummary } from './schemas/attendance-summary.schema';

@Injectable()
export class SummaryService {
  constructor(
    @InjectModel(AttendanceSummary.name) private summaryModel: Model<AttendanceSummary>,
  ) {}

  async upsert(userId: string, month: string, data: Partial<AttendanceSummary>): Promise<AttendanceSummary> {
    return this.summaryModel.findOneAndUpdate(
      { userId, month },
      { $set: data },
      { new: true, upsert: true },
    );
  }

  async findAll(): Promise<AttendanceSummary[]> {
    return this.summaryModel.find().exec();
  }

  async findByUser(userId: string): Promise<AttendanceSummary[]> {
    return this.summaryModel.find({ userId }).exec();
  }

  async findByMonth(userId: string, month: string): Promise<AttendanceSummary | null> {
    return this.summaryModel.findOne({ userId, month }).exec();
  }
}
