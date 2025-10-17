import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { AttendanceDaily, AttendanceDailyDocument } from './schemas/attendance-daily.schema';
import {AttendanceSummaryDocument, AttendanceSummary} from './schemas/attendance-summary.schema';

export interface AttendanceSummaryInterface {
  userId: string;
  monthKey: string; // 'YYYY-MM'
  days: {
    days: number;
    presentDays: number;
    fullDays: number;
    halfDaysAM: number;
    halfDaysPM: number;
    absentDays: number;
  };
  minutes: {
    worked: number;
    late: number;
    earlyLeave: number;
    hourWork: number;
    workedCheckIn: number;
  };
  computedAt: Date;
}

@Injectable()
export class SummaryService {
  constructor(
    @InjectModel(AttendanceDaily.name)
    private readonly dailyModel: Model<AttendanceDailyDocument>,
    @InjectModel(AttendanceSummary.name)
    private readonly summaryModel: Model<AttendanceSummaryDocument>,
  ) {}

  async upsertMonthly(userId: string, monthKey: string): Promise<AttendanceSummaryInterface> {
    const [y, m] = monthKey.split('-').map(Number);
    const from = `${monthKey}-01`;
    const lastDate = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const to = `${monthKey}-${String(lastDate).padStart(2,'0')}`;

    const items = await this.dailyModel
      .find({ userId, dateKey: { $gte: from, $lte: to } })
      .lean();

    const days = {
      days: 0,
      presentDays: 0,
      leaveDays: 0,
      fullDays: 0,
      halfDaysAM: 0,
      halfDaysPM: 0,
      absentDays: 0,
    };
    const minutes = { worked: 0, late: 0, earlyLeave: 0, hourWork: 0, workedCheckIn: 0 };

    for (const d of items) {
      days.days++;
      minutes.worked += d.workedMinutes ?? 0;
      minutes.late += d.lateMinutes ?? 0;
      minutes.earlyLeave += d.earlyLeaveMinutes ?? 0;
      minutes.hourWork += d.hourWork ?? 0;
      minutes.workedCheckIn += d.workedCheckIn ?? 0;

      switch (d.status) {
        case 'FULL': days.fullDays++; days.presentDays++; break;
        case 'HALF_AM': days.halfDaysAM++; days.presentDays++; break;
        case 'HALF_PM': days.halfDaysPM++; days.presentDays++; break;
        case 'LEAVE':   days.leaveDays++; days.presentDays++; break; 
        case 'PRESENT': days.presentDays++; break;
        case 'ABSENT':  days.absentDays++; break;
      }
    }

    const result: AttendanceSummaryInterface = {
      userId,
      monthKey,
      days,
      minutes,
      computedAt: new Date(),
    };

    //nếu có collection Summary riêng: upsert vào đây
    await this.summaryModel.updateOne({ userId, month: monthKey }, { $set: result }, { upsert: true });

    return result;
  }

  async summarizeRange(userId: string, from: string, to: string) {
    const items = await this.dailyModel
      .find({ userId, dateKey: { $gte: from, $lte: to } })
      .lean();

    const days = {
      days: 0,
      presentDays: 0,
      fullDays: 0,
      halfDaysAM: 0,
      halfDaysPM: 0,
      leaveDays: 0,
      absentDays: 0,
    };
    const minutes = { worked: 0, late: 0, earlyLeave: 0, hourWork: 0, workedCheckIn: 0 };

    for (const d of items) {
      days.days++;
      minutes.worked += d.workedMinutes ?? 0;
      minutes.late += d.lateMinutes ?? 0;
      minutes.earlyLeave += d.earlyLeaveMinutes ?? 0;
      minutes.hourWork += d.hourWork ?? 0;
      minutes.workedCheckIn += d.workedCheckIn ?? 0;
      switch (d.status) {
        case 'FULL': days.fullDays++; days.presentDays++; break;
        case 'HALF_AM': days.halfDaysAM++; days.presentDays++; break;
        case 'HALF_PM': days.halfDaysPM++; days.presentDays++; break;
        case 'LEAVE': days.leaveDays++; days.presentDays++; break;
        case 'PRESENT': days.presentDays++; break;        
        case 'ABSENT': default: days.absentDays++; break;
      }
    }

    return { userId, from, to, days, minutes, computedAt: new Date() };
  }
}
