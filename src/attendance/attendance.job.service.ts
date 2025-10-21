import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { DailyService } from './daily.service';
import { WorkShiftType } from './common/work-shift-type.enum';
import { SummaryService } from './summary.service';
import { AttendanceLog, AttendanceLogDocument } from './schemas/attendance-log.schema';

const TZ = 'Asia/Bangkok';

@Injectable()
export class AttendanceJobService {
  private readonly logger = new Logger(AttendanceJobService.name);

  constructor(
    private readonly daily: DailyService,
    private readonly summary: SummaryService,
    @InjectModel(AttendanceLog.name)
    private readonly logModel: Model<AttendanceLogDocument>,
  ) {}

  @Cron('10 1 * * *', { timeZone: TZ })
  async cronDailyYesterday() {
    const todayKey = isoDateKey(nowInTz(TZ));
    const yKey = addDaysKey(todayKey, -1);
    this.logger.log(`[CRON] Build Daily for ${yKey}`);

    const users: string[] = await this.distinctUsersByDate(yKey);
    for (const uid of users) {
      await this.daily.upsertByShiftDefinition(uid, yKey, WorkShiftType.REGULAR, {
        allowWeekendWork: true,
        halfThresholdMinutes: 180,
      });
    }
    this.logger.log(`[CRON] Daily done for ${yKey} (users=${users.length})`);
    return { status: 'ok', date: yKey, users: users.length };
  }

  @Cron('20 1 * * *', { timeZone: TZ })
  async cronMonthlySummary() {
    const mk = isoMonthKey(nowInTz(TZ));
    this.logger.log(`[CRON] Build Summary for ${mk}`);

    const range = monthRange(mk);
    const users = await this.distinctUsersByDailyRange(range.from, range.to);
    for (const uid of users) {
      await this.summary.upsertMonthly(uid, mk);
    }

    // Rebuild tháng trước nếu là ngày 1-3
    const dayInMonth = parseInt(mk.split('-')[1], 10); // not needed—use today date
    const today = nowInTz(TZ);
    if (today.getUTCDate() <= 3) {
      const prevMonthKey = shiftMonthKey(mk, -1);
      const prevRange = monthRange(prevMonthKey);
      const prevUsers = await this.distinctUsersByDailyRange(prevRange.from, prevRange.to);
      this.logger.log(`[CRON] Rebuild previous month ${prevMonthKey} (users=${prevUsers.length})`);
      for (const uid of prevUsers) {
        await this.summary.upsertMonthly(uid, prevMonthKey);
      }
    }

    this.logger.log(`[CRON] Summary done for ${mk}`);
    return { status: 'ok', monthKey: mk, users: users.length };
  }

  async runLogsToDaily(userId?: string, from?: string, to?: string) {
    const todayKey = isoDateKey(nowInTz(TZ));
    const f = from ?? todayKey;
    const t = to ?? f;
    let upserts = 0;

    const days = enumerateDateKeys(f, t);
    if (userId) {
      for (const dk of days) {
        await this.daily.upsertByShiftDefinition(userId, dk, WorkShiftType.REGULAR, {
          allowWeekendWork: true,
          halfThresholdMinutes: 180,
        });
        upserts++;
      }
    } else {
      for (const dk of days) {
        const users = await this.distinctUsersByDate(dk);
        for (const uid of users) {
          await this.daily.upsertByShiftDefinition(uid, dk, WorkShiftType.REGULAR, {
            allowWeekendWork: true,
            halfThresholdMinutes: 180,
          });
          upserts++;
        }
      }
    }
    return { status: 'ok', from: f, to: t, upserts };
  }

  async runMonthlySummary(userId?: string, monthKey?: string) {
    const mk = monthKey ?? isoMonthKey(nowInTz(TZ));
    if (userId) {
      const res = await this.summary.upsertMonthly(userId, mk);
      return { status: 'ok', monthKey: mk, users: 1, result: res };
    }
    const range = monthRange(mk);
    const users = await this.distinctUsersByDailyRange(range.from, range.to);
    for (const uid of users) {
      await this.summary.upsertMonthly(uid, mk);
    }
    return { status: 'ok', monthKey: mk, users: users.length };
  }
 
 
async runLogsToDailySmart(
  userId?: string,
  from?: string,
  to?: string,
  shiftType?: WorkShiftType,
) {
  // === Xác định khoảng thời gian cần chạy ===
  let rangeFrom: string;
  let rangeTo: string;

  if (!from && !to) {
    // Không truyền gì hoặc chỉ truyền userId -> mặc định tháng trước
    const prev = monthRange(shiftMonthKey(isoMonthKey(nowInTz(TZ)), -1));
    rangeFrom = prev.from;
    rangeTo = prev.to;
  } else {
    // Có from/to: chuẩn hoá
    rangeFrom = from!;
    rangeTo = to ?? from!;
  }
  if (!shiftType) {
    shiftType = WorkShiftType.REGULAR;
  }

  // === Xác định danh sách user ===
  let targetUsers: string[] = [];
  if (userId) {
    targetUsers = [userId];
  } else {
    targetUsers = await this.distinctUsersByDailyRange(rangeFrom, rangeTo);
  }

  // === Chạy upsert Daily ===
  let upserts = 0;
  const days = enumerateDateKeys(rangeFrom, rangeTo);

  for (const dk of days) {
    if (targetUsers.length === 0) {
      // Không có user nào có log ngày này -> bỏ qua
      continue;
    }
    // Nếu chạy ALL users, có thể lọc lại theo từng ngày để tránh upsert thừa:
    const usersForDay = userId
      ? targetUsers
      : (await this.distinctUsersByDate(dk)); // chỉ user thực sự có log ngày dk

    for (const uid of usersForDay) {
      await this.daily.upsertByShiftDefinition(uid, dk, shiftType, {
        allowWeekendWork: false,
        halfThresholdMinutes: 240,
      });
      upserts++;
    }
  }

  return {
    status: 'ok',
    userId: userId || null,
    from: rangeFrom,
    to: rangeTo,
    users: userId ? 1 : 'ALL',
    shiftType,
    upserts,
  };
}

async runLogsOverNightToDailySmart(
  userId?: string,
  from?: string,
  to?: string,
  shiftType?: WorkShiftType,
) {
  // === Xác định khoảng thời gian cần chạy ===
  let rangeFrom: string;
  let rangeTo: string;
  console.log('from-to truyen vao', from, '-', to);

  if (!from && !to) {   
    const prev = monthRange(shiftMonthKey(isoMonthKey(nowInTz(TZ)), -1));
    rangeFrom = prev.from;
    rangeTo = prev.to;
  } else {    
    rangeFrom = from!;
    rangeTo = to ?? from!;
  }
  if (!shiftType) {
    shiftType = WorkShiftType.REGULAR;
  }

  // === Xác định danh sách user ===
  let targetUsers: string[] = [];
  if (userId) {
    targetUsers = [userId];
  } else {
    targetUsers = await this.distinctUsersByDailyRange(rangeFrom, rangeTo);
  }

  // === Chạy upsert Daily ===
  let upserts = 0;
  console.log('from - to', rangeFrom, '-', rangeTo);
  const days = enumerateDateKeys(rangeFrom, rangeTo);
  console.log('day', days);

  for (const dk of days) {
    if (targetUsers.length === 0) {
      // Không có user nào có log ngày này -> bỏ qua
      continue;
    }
    // Nếu chạy ALL users, có thể lọc lại theo từng ngày để tránh upsert thừa:
    const usersForDay = userId
      ? targetUsers
      : (await this.distinctUsersByDate(dk)); // chỉ user thực sự có log ngày dk

    for (const uid of usersForDay) {
      const daily = await this.daily.findOne(uid, dk);
      if (daily && daily.isManualEdit) {
        // Đã có dữ liệu, dữ liệu đã chỉnh sửa tay -> bỏ qua
        continue;
      }
      await this.daily.upsertByShiftDefinition(uid, dk, shiftType, {
        allowWeekendWork: false,
        halfThresholdMinutes: 20,
      });
      upserts++;
    }
  }

  return {
    status: 'ok',
    userId: userId || null,
    from: rangeFrom,
    to: rangeTo,
    users: userId ? 1 : 'ALL',
    shiftType,
    upserts,
  };
}


  /** helpers */
  private async distinctUsersByDate(dateKey: string): Promise<string[]> {
    const startUtc = zonedTimeToUtc(dateKey, '00:00:00', TZ);
    const endUtc = zonedTimeToUtc(dateKey, '23:59:59.999', TZ);
    return this.logModel.distinct('userId', { timestamp: { $gte: startUtc, $lte: endUtc } }) as any;
  }

  private async distinctUsersByDailyRange(from: string, to: string): Promise<string[]> {
    const startUtc = zonedTimeToUtc(from, '00:00:00', TZ);
    const endUtc = zonedTimeToUtc(to, '23:59:59.999', TZ);
    return this.logModel.distinct('userId', { timestamp: { $gte: startUtc, $lte: endUtc } }) as any;
  }
}

/* ===== Date helpers (TZ) – trùng với daily.service.ts bạn có thể tách utils riêng ===== */
function tzOffsetMs(dateUtc: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts = dtf.formatToParts(dateUtc);
  const map: any = {};
  for (const p of parts) if (p.type !== 'literal') map[p.type] = parseInt(p.value, 10);
  const asUTC = Date.UTC(map.year, map.month - 1, map.day, map.hour, map.minute, map.second);
  return asUTC - dateUtc.getTime();
}
function zonedTimeToUtc(dateKey: string, time: string, timeZone: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  const [hhmmss, msec] = time.split('.');
  const [hh, mm, ss] = (hhmmss || '00:00:00').split(':').map(Number);
  const ms = msec ? parseInt(msec, 10) : 0;
  const guess = new Date(Date.UTC(y, m - 1, d, hh || 0, mm || 0, ss || 0, ms));
  const offset = tzOffsetMs(guess, timeZone);
  return new Date(guess.getTime() - offset);
}
function nowInTz(timeZone: string): Date {
  // Lấy “hiện tại” ở tz -> trả về dạng Date UTC tương ứng
  const now = new Date();
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts = dtf.formatToParts(now);
  const map: any = {};
  for (const p of parts) if (p.type !== 'literal') map[p.type] = parseInt(p.value, 10);
  return zonedTimeToUtc(
    `${map.year}-${String(map.month).padStart(2,'0')}-${String(map.day).padStart(2,'0')}`,
    `${String(map.hour).padStart(2,'0')}:${String(map.minute).padStart(2,'0')}:${String(map.second).padStart(2,'0')}`,
    timeZone,
  );
}
function isoDateKey(dUtc: Date) {
  // Convert UTC instant -> dateKey theo TZ (dễ nhất: format ở TZ rồi lấy yyyy-mm-dd)
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
  return fmt.format(dUtc); // yyyy-mm-dd
}
function addDaysKey(dateKey: string, delta: number) {
  const d = zonedTimeToUtc(dateKey, '12:00:00', TZ);
  const d2 = new Date(d.getTime() + delta * 24 * 3600 * 1000);
  return isoDateKey(d2);
}
function isoMonthKey(dUtc: Date) {
  const fmtY = new Intl.DateTimeFormat('en', { timeZone: TZ, year: 'numeric' });
  const fmtM = new Intl.DateTimeFormat('en', { timeZone: TZ, month: '2-digit' });
  const y = fmtY.format(dUtc);
  const m = fmtM.format(dUtc);
  return `${y}-${m}`;
}
function monthRange(monthKey: string) {
  const [y, m] = monthKey.split('-').map(Number);
  const first = `${y}-${String(m).padStart(2,'0')}-01`;
  const lastDate = new Date(Date.UTC(y, m, 0)).getUTCDate(); // ngày cuối
  const last = `${y}-${String(m).padStart(2,'0')}-${String(lastDate).padStart(2,'0')}`;
  return { from: first, to: last };
}
function enumerateDateKeys(from: string, to: string) {
  const [yf, mf, df] = from.split('-').map(Number);
  const [yt, mt, dt] = to.split('-').map(Number);
  const start = new Date(Date.UTC(yf, mf - 1, df));
  const end = new Date(Date.UTC(yt, mt - 1, dt));
  const out: string[] = [];
  for (let t = start.getTime(); t <= end.getTime(); t += 24 * 3600 * 1000) {
    const d = new Date(t);
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`);
  }
  return out;
}

function shiftMonthKey(monthKey: string, delta: number): string {
  // monthKey dạng 'YYYY-MM'
  const [y, m] = monthKey.split('-').map(Number);
  // Tạo mốc UTC đầu tháng rồi cộng/trừ tháng
  const d = new Date(Date.UTC(y, (m - 1) + delta, 1));
  const yy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${yy}-${mm}`;
}
