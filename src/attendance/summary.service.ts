import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { AttendanceDaily, AttendanceDailyDocument } from './schemas/attendance-daily.schema';

export interface AttendanceSummary {
  userId: string;
  monthKey: string; // 'YYYY-MM'
  totals: {
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
  };
  computedAt: Date;
}

@Injectable()
export class SummaryService {
  constructor(
    @InjectModel(AttendanceDaily.name)
    private readonly dailyModel: Model<AttendanceDailyDocument>,
  ) {}

  async upsertMonthly(userId: string, monthKey: string): Promise<AttendanceSummary> {
    const [y, m] = monthKey.split('-').map(Number);
    const from = `${monthKey}-01`;
    const lastDate = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const to = `${monthKey}-${String(lastDate).padStart(2,'0')}`;

    const items = await this.dailyModel
      .find({ userId, dateKey: { $gte: from, $lte: to } })
      .lean();

    const totals = {
      days: 0,
      presentDays: 0,
      fullDays: 0,
      halfDaysAM: 0,
      halfDaysPM: 0,
      absentDays: 0,
    };
    const minutes = { worked: 0, late: 0, earlyLeave: 0 };

    for (const d of items) {
      totals.days++;
      minutes.worked += d.workedMinutes ?? 0;
      minutes.late += d.lateMinutes ?? 0;
      minutes.earlyLeave += d.earlyLeaveMinutes ?? 0;
      switch (d.status) {
        case 'FULL': totals.fullDays++; totals.presentDays++; break;
        case 'HALF_AM': totals.halfDaysAM++; totals.presentDays++; break;
        case 'HALF_PM': totals.halfDaysPM++; totals.presentDays++; break;
        case 'PRESENT': totals.presentDays++; break;
        case 'ABSENT': default: totals.absentDays++; break;
      }
    }

    const result: AttendanceSummary = {
      userId,
      monthKey,
      totals,
      minutes,
      computedAt: new Date(),
    };

    // nếu có collection Summary riêng: upsert vào đây
    // await this.summaryModel.updateOne({ userId, monthKey }, { $set: result }, { upsert: true });

    return result;
  }

  async summarizeRange(userId: string, from: string, to: string) {
    const items = await this.dailyModel
      .find({ userId, dateKey: { $gte: from, $lte: to } })
      .lean();

    const totals = {
      days: 0,
      presentDays: 0,
      fullDays: 0,
      halfDaysAM: 0,
      halfDaysPM: 0,
      absentDays: 0,
    };
    const minutes = { worked: 0, late: 0, earlyLeave: 0 };

    for (const d of items) {
      totals.days++;
      minutes.worked += d.workedMinutes ?? 0;
      minutes.late += d.lateMinutes ?? 0;
      minutes.earlyLeave += d.earlyLeaveMinutes ?? 0;
      switch (d.status) {
        case 'FULL': totals.fullDays++; totals.presentDays++; break;
        case 'HALF_AM': totals.halfDaysAM++; totals.presentDays++; break;
        case 'HALF_PM': totals.halfDaysPM++; totals.presentDays++; break;
        case 'PRESENT': totals.presentDays++; break;
        case 'ABSENT': default: totals.absentDays++; break;
      }
    }

    return { userId, from, to, totals, minutes, computedAt: new Date() };
  }
}
