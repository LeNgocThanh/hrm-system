import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LogsService } from './logs.service';
import { DailyService } from './daily.service';
import { SummaryService } from './summary.service';
import { AttendanceStatus } from './common/attendance-status.enum';
import { WorkShiftType, SHIFT_CONFIG } from './common/work-shift-type.enum';

// ---- Helper: định dạng YYYY-MM-DD theo Asia/Bangkok ----
function toDateKeyLocal(date: Date, timeZone = 'Asia/Bangkok'): string {
  // en-CA => "YYYY-MM-DD"
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(date);
}

// ---- Helper: đầu/cuối ngày theo Asia/Bangkok ----
function dayWindowLocal(dateKey: string, timeZone = 'Asia/Bangkok') {
  // dateKey: "YYYY-MM-DD" (theo chuẩn Daily.date)
  // Chúng ta tạo start/end trong local tz rồi convert sang Date
  const [y, m, d] = dateKey.split('-').map(Number);
  // Cách đơn giản: tạo Date theo local server nhưng set h/m/s/milli
  // Nếu server không chạy ở Asia/Bangkok, vẫn OK vì ta chỉ dùng để so sánh
  // relative trong ngày. Để tuyệt đối, có thể dùng thư viện tz (luxon/dayjs).
  const start = new Date(y, (m - 1), d, 0, 0, 0, 0);
  const end   = new Date(y, (m - 1), d, 23, 59, 59, 999);
  return { start, end };
}

@Injectable()
export class AttendanceJobService {
  private readonly logger = new Logger(AttendanceJobService.name);
  private readonly timeZone = 'Asia/Bangkok';

  constructor(
    private readonly logsService: LogsService,
    private readonly dailyService: DailyService,
    private readonly summaryService: SummaryService,
  ) {}

  // ===== JOB 1: Logs → Daily =====
 @Cron(CronExpression.EVERY_DAY_AT_1AM, { timeZone: 'Asia/Bangkok' })
  async cronDailyYesterday() {
    try {     
      const now = new Date();
      const localToday = toDateKeyLocal(now, this.timeZone);

      // yesterday = today - 1
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      const localYesterday = toDateKeyLocal(d, this.timeZone);

      this.logger.log(`Running cronDailyYesterday for date=${localYesterday} (tz=${this.timeZone})`);
      await this.runLogsToDaily(undefined, localYesterday, localYesterday);
    } catch (e) {
      this.logger.error('cronDailyYesterday error', e as any);
    }
  }

  /**
   * Backfill / tổng hợp daily từ logs.
   * @param userId nếu truyền, chỉ chạy cho 1 user; nếu không, chạy cho tất cả user có logs trong khoảng
   * @param from  "YYYY-MM-DD" (local)
   * @param to    "YYYY-MM-DD" (local)
   */
  async runLogsToDaily(userId?: string, from?: string, to?: string) {
    // 1) Xác định range ngày
    const todayLocal = toDateKeyLocal(new Date(), this.timeZone);
    const fromKey = from || todayLocal;
    const toKey   = to   || todayLocal;   

    
    let userIds: string[] = [];
    if (userId) {
      userIds = [userId];
    } else {
      const { start: globalStart } = dayWindowLocal(fromKey, this.timeZone);
      const { end: globalEnd }     = dayWindowLocal(toKey, this.timeZone);      
      if ((this.logsService as any).distinctUserIds) {
        userIds = await (this.logsService as any).findDistinctUserIds(globalStart, globalEnd);
      } else {       
        // userIds = await this.logModel.distinct('userId', { timestamp: { $gte: globalStart, $lte: globalEnd } });
        throw new Error('LogsService.distinctUserIds(start, end) chưa được triển khai');
      }
    }

    // 3) Duyệt từng user, từng ngày trong khoảng
    const cfg = SHIFT_CONFIG[WorkShiftType.REGULAR];
    const [sh, sm] = cfg.start.split(':').map(Number);
    const [eh, em] = cfg.end.split(':').map(Number);

    // iterator ngày
    const dayKeys: string[] = [];
    {
      const startDate = new Date(fromKey);
      const endDate   = new Date(toKey);
      // chuẩn hoá giờ
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        dayKeys.push(toDateKeyLocal(d, this.timeZone));
      }
    }

    for (const uid of userIds) {
      for (const dayKey of dayKeys) {
        const { start, end } = dayWindowLocal(dayKey, this.timeZone);

        // 3.1) Lấy logs trong ngày (REGULAR, trong ngày)       
        let logs: any[] = [];
        if ((this.logsService as any).findByDateRange) {
          logs = await (this.logsService as any).findByDateRange(uid, start, end);
        } else {          
          throw new Error('LogsService.findByUserAndRange(userId, start, end) chưa được triển khai');
        }

        // 3.2) Không có log -> ABSENT
        if (!logs.length) {
          await this.dailyService.upsert(uid, dayKey, {
            workShiftType: WorkShiftType.REGULAR,
            status: AttendanceStatus.ABSENT,
            checkIn: undefined,
            checkOut: undefined,
            workedMinutes: 0,
            lateMinutes: 0,
            earlyLeaveMinutes: 0,
          });
          continue;
        }

        // 3.3) Có log: lấy checkIn đầu và checkOut cuối
        logs.sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp));
        const checkIn: Date = new Date(logs[0].timestamp);
        const checkOut: Date = new Date(logs[logs.length - 1].timestamp);

        // 3.4) Chuẩn giờ chuẩn vào/ra
        const standardIn  = new Date(dayKey); standardIn.setHours(sh, sm, 0, 0);
        const standardOut = new Date(dayKey); standardOut.setHours(eh, em, 0, 0);

        // 3.5) Tính phút làm việc (trừ nghỉ trưa REGULAR)
        const rawWorked = Math.max(0, Math.floor((+checkOut - +checkIn) / 60000));
        const workedMinutes = Math.max(0, rawWorked - cfg.breakMinutes);

        // 3.6) Tính trễ/ra sớm
        const lateMinutes =
          checkIn > standardIn ? Math.floor((+checkIn - +standardIn) / 60000) : 0;
        const earlyLeaveMinutes =
          checkOut < standardOut ? Math.floor((+standardOut - +checkOut) / 60000) : 0;

        // 3.7) Upsert Daily
        await this.dailyService.upsert(uid, dayKey, {
          workShiftType: WorkShiftType.REGULAR,
          status: AttendanceStatus.PRESENT,
          checkIn,
          checkOut,
          workedMinutes,
          lateMinutes,
          earlyLeaveMinutes,
        });
      }      
    }

    return { status: 'ok', users: userIds.length, days: dayKeys.length };
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
        const month = d.workDate.slice(0, 7);
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
