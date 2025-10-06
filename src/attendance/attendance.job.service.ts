import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LogsService } from './logs.service';
import { DailyService } from './daily.service';
import { SummaryService } from './summary.service';

@Injectable()
export class AttendanceJobService {
  private readonly logger = new Logger(AttendanceJobService.name);

  constructor(
    private readonly logsService: LogsService,
    private readonly dailyService: DailyService,
    private readonly summaryService: SummaryService,
  ) {}

  // ===== JOB 1: Logs → Daily =====
  @Cron('0 0 * * *') // chạy mỗi ngày 0h
  async cronLogsToDaily() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    this.logger.log('Cron Logs→Daily cho ngày hôm qua');
    return this.runLogsToDaily(null, yesterday, today);
  }

  async runLogsToDaily(userId?: string, from?: Date, to?: Date) {
    if (!from || !to) throw new Error('Thiếu from/to');

    let userIds: string[] = [];
    if (userId) {
      userIds = [userId];
    } else {
      // lấy userId có log trong khoảng thời gian
      userIds = await this.logsService.findDistinctUserIds(from, to);
    }

    for (const uid of userIds) {
      const logs = await this.logsService.findByDateRange(uid, from, to);

      // group theo ngày
      const grouped = new Map<string, typeof logs>();
      logs.forEach(log => {
        const dateKey = log.timestamp.toISOString().split('T')[0];
        if (!grouped.has(dateKey)) grouped.set(dateKey, []);
        grouped.get(dateKey).push(log);
      });

      for (const [date, logsOfDay] of grouped.entries()) {
        const checkIn = logsOfDay[0].timestamp;
        const checkOut = logsOfDay[logsOfDay.length - 1].timestamp;
        const workedMinutes = Math.floor((+checkOut - +checkIn) / 60000);

        await this.dailyService.upsert(uid, date, {  
          checkIn,
          checkOut,
          workedMinutes,          
        });
      }
    }

    return { status: 'ok', users: userIds.length };
  }

  // ===== JOB 2: Daily → Summary =====
  @Cron('0 1 * * *') // chạy 1h sáng
  async cronDailyToSummary() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    this.logger.log('Cron Daily→Summary cho ngày hôm qua');
    return this.runDailyToSummary(null, yesterday.toISOString().slice(0, 10), today.toISOString().slice(0, 10));
  }

  async runDailyToSummary(userId?: string, from?: string, to?: string) {
    if (!from || !to) throw new Error('Thiếu from/to');

    let userIds: string[] = [];
    if (userId) {
      userIds = [userId];
    } else {
      // lấy userId có daily trong khoảng
      userIds = await this.dailyService.findDistinctUserIds(from, to);
    }

    for (const uid of userIds) {
      const dailies = await this.dailyService.findByDateRange(uid, from, to);

      // group theo tháng
      const grouped = new Map<string, typeof dailies>();
      dailies.forEach(d => {
        const month = d.date.slice(0, 7);
        if (!grouped.has(month)) grouped.set(month, []);
        grouped.get(month).push(d);
      });

      for (const [month, records] of grouped.entries()) {
        const totalWorked = records.reduce((sum, r) => sum + (r.workedMinutes || 0), 0);
        const totalDays = records.length;

        await this.summaryService.upsert(uid, month, {
          userId: uid,
          month,
          totalWorkedMinutes: totalWorked,          
        });
      }
    }

    return { status: 'ok', users: userIds.length };
  }
}
