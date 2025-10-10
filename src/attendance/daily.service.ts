import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { AttendanceDaily, AttendanceDailyDocument } from './schemas/attendance-daily.schema';
import { AttendanceLog, AttendanceLogDocument } from './schemas/attendance-log.schema';
import { WorkShiftType } from './common/work-shift-type.enum';
import { SHIFT_REGISTRY, ShiftDefinition, ShiftSession } from './common/shift-definition';

const TZ = 'Asia/Bangkok';
type Dow = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=CN ... 6=Thứ 7

interface UpsertTimesDto {
  userId: string;
  date: string;              // 'YYYY-MM-DD' (local Bangkok)
  checkIn?: string;          // ISO or parseable
  checkOut?: string;         // ISO or parseable
  shiftType?: WorkShiftType;
  editNote: string; // optional
}

@Injectable()
export class DailyService {
  constructor(
    @InjectModel(AttendanceDaily.name)
    private readonly dailyModel: Model<AttendanceDailyDocument>,

    @InjectModel(AttendanceLog.name)
    private readonly logsModel: Model<AttendanceLogDocument>,
  ) {}

  /** ------- Public APIs ------- */

  async findOne(userId: string, dateKey: string) {
    return this.dailyModel.findOne({ userId, dateKey }).lean();
  }

  async findRange(userId: string, from?: string, to?: string) {
    const q: any = {};
    if (userId) q.userId = userId;
    if (from || to) q.dateKey = {};
    if (from) q.dateKey.$gte = from;
    if (to) q.dateKey.$lte = to;
    return this.dailyModel.find(q).sort({ dateKey: 1, userId: 1 }).lean();
  }

  /**
   * Upsert Daily từ LOGS dựa trên shift-definition (REGULAR: AM/PM; T7 chỉ AM; CN nghỉ).
   */
  async upsertByShiftDefinition(
    userId: string,
    dateKey: string,
    shiftType: WorkShiftType = WorkShiftType.REGULAR,
    opts?: { allowWeekendWork?: boolean; halfThresholdMinutes?: number },
  ) {
    const def = requireShift(shiftType);
    const tz = def.tz || TZ;

    // Khung ngày local (Bangkok) -> dải UTC tương ứng
    const startUtc = zonedTimeToUtc(dateKey, '00:00:00', tz);
    const endUtc = zonedTimeToUtc(dateKey, '23:59:59.999', tz);

    // day-of-week local
    const dow = getDow(dateKey, tz);
    const rule = def.byDow[dow];
    const sessions = rule?.sessions ?? [];
    const requiredToday = rule?.required ?? (sessions.length > 0);

    // Lấy logs trong ngày local (theo UTC)
    const logs = await this.logsModel
      .find({ userId, timestamp: { $gte: startUtc, $lte: endUtc } })
      .sort({ timestamp: 1 })
      .lean();

    const pairs = pairLogs(logs.map(l => new Date(l.timestamp)));

    // Tính theo phiên
    let am: any, pm: any;
    let workedMinutes = 0, lateMinutes = 0, earlyLeaveMinutes = 0;
    for (const s of sessions) {
      const actual = calcForSessionFromPairs(pairs, s, dateKey, tz);
      if (s.code === 'AM') am = actual;
      if (s.code === 'PM') pm = actual;
      workedMinutes += actual.workedMinutes ?? 0;
      lateMinutes += actual.lateMinutes ?? 0;
      earlyLeaveMinutes += actual.earlyLeaveMinutes ?? 0;
    }

    // Suy luận status
    const status = inferStatus({
      sessions, requiredToday, pairs, workedMinutes,
      dateKey, tz,
      opts: {
        allowWeekendWork: opts?.allowWeekendWork ?? true,
        halfThresholdMinutes: opts?.halfThresholdMinutes ?? 240,
      },
    });

    const payload = {
      userId,
      dateKey,
      shiftType,
      am, pm,
      workedMinutes,
      lateMinutes,
      earlyLeaveMinutes,
      status,
      computedAt: new Date(),
    };

    await this.dailyModel.updateOne(
      { userId, dateKey },
      { $set: payload },
      { upsert: true },
    );

    return payload;
  }

  /**
   * Cập nhật thủ công checkIn/checkOut rồi recompute theo shift.
   */
  async upsertTimes(dto: UpsertTimesDto) {
    const { userId, date, checkIn, checkOut, editNote } = dto;
  let { shiftType } = dto;
  const dateKey = date;

  const existing = await this.dailyModel.findOne({ userId, dateKey }).lean();    
  if (!shiftType) shiftType = (existing?.shiftType as WorkShiftType) || WorkShiftType.REGULAR;

  const def = requireShift(shiftType);
  const tz = def.tz || TZ;

  // Khung ngày local -> UTC
  const startUtc = zonedTimeToUtc(dateKey, '00:00:00', tz);
  const endUtc = zonedTimeToUtc(dateKey, '23:59:59.999', tz);

  // Logs sẵn có trong ngày
  const logs = await this.logsModel
    .find({ userId, timestamp: { $gte: startUtc, $lte: endUtc } })
    .sort({ timestamp: 1 })
    .lean();

  // 1. Tính giá trị GỐC từ logs (không thay đổi)
  const originalPairs = pairLogs(logs.map(l => new Date(l.timestamp)));
  
  const dow = getDow(dateKey, tz);
  const rule = def.byDow[dow];
  const sessions = rule?.sessions ?? [];
  const requiredToday = rule?.required ?? (sessions.length > 0);

  let amOriginal: any, pmOriginal: any;
  for (const s of sessions) {
    const actual = calcForSessionFromPairs(originalPairs, s, dateKey, tz);
    if (s.code === 'AM') amOriginal = actual;
    if (s.code === 'PM') pmOriginal = actual;
  }

  // 2. Tính giá trị EDIT từ checkIn/checkOut thủ công
  const editPairs = buildPairsWithManual(
    logs.map(l => new Date(l.timestamp)),
    checkIn ? new Date(checkIn) : undefined,
    checkOut ? new Date(checkOut) : undefined,
  );

  let amEdit: any, pmEdit: any;
  let workedMinutes = 0, lateMinutes = 0, earlyLeaveMinutes = 0;
  
  for (const s of sessions) {
    const actual = calcForSessionFromPairs(editPairs, s, dateKey, tz);
    if (s.code === 'AM') {
      amEdit = {
        checkIn_Edit: actual.checkIn,
        checkOut_Edit: actual.checkOut,
        workedMinutes: actual.workedMinutes,
        lateMinutes: actual.lateMinutes,
        earlyLeaveMinutes: actual.earlyLeaveMinutes,
        fulfilled: actual.fulfilled,
      };
    }
    if (s.code === 'PM') {
      pmEdit = {
        checkIn_Edit: actual.checkIn,
        checkOut_Edit: actual.checkOut,
        workedMinutes: actual.workedMinutes,
        lateMinutes: actual.lateMinutes,
        earlyLeaveMinutes: actual.earlyLeaveMinutes,
        fulfilled: actual.fulfilled,
      };
    }
    workedMinutes += actual.workedMinutes ?? 0;
    lateMinutes += actual.lateMinutes ?? 0;
    earlyLeaveMinutes += actual.earlyLeaveMinutes ?? 0;
  }

  const status = inferStatus({
    sessions, 
    requiredToday, 
    pairs: editPairs, 
    workedMinutes,
    dateKey, 
    tz,
    opts: { allowWeekendWork: false, halfThresholdMinutes: 240 },
  });

  // 3. Merge: giữ checkIn/checkOut gốc, thêm checkIn_Edit/checkOut_Edit
  const am = amOriginal ? {
    checkIn: amOriginal.checkIn,
    checkOut: amOriginal.checkOut,
    checkIn_Edit: amEdit?.checkIn_Edit,
    checkOut_Edit: amEdit?.checkOut_Edit,
    workedMinutes: amEdit?.workedMinutes ?? amOriginal.workedMinutes,
    lateMinutes: amEdit?.lateMinutes ?? amOriginal.lateMinutes,
    earlyLeaveMinutes: amEdit?.earlyLeaveMinutes ?? amOriginal.earlyLeaveMinutes,
    fulfilled: amEdit?.fulfilled ?? amOriginal.fulfilled,
  } : (amEdit ? { ...amEdit } : undefined);

  const pm = pmOriginal ? {
    checkIn: pmOriginal.checkIn,
    checkOut: pmOriginal.checkOut,
    checkIn_Edit: pmEdit?.checkIn_Edit,
    checkOut_Edit: pmEdit?.checkOut_Edit,
    workedMinutes: pmEdit?.workedMinutes ?? pmOriginal.workedMinutes,
    lateMinutes: pmEdit?.lateMinutes ?? pmOriginal.lateMinutes,
    earlyLeaveMinutes: pmEdit?.earlyLeaveMinutes ?? pmOriginal.earlyLeaveMinutes,
    fulfilled: pmEdit?.fulfilled ?? pmOriginal.fulfilled,
  } : (pmEdit ? { ...pmEdit } : undefined);

  const isManualEdit = true;
  
  const payload: Partial<AttendanceDaily> = {
    userId,
    dateKey,
    shiftType,
    am,
    pm,
    workedMinutes,
    lateMinutes,
    earlyLeaveMinutes,
    status,
    isManualEdit,
    editNote,
    computedAt: new Date(),
  };    

  await this.dailyModel.updateOne(
    { userId, dateKey },
    { $set: payload },
    { upsert: true },
  );

  return this.dailyModel.findOne({ userId, dateKey }).lean();
  }

  /** Optional: recompute batch */
  async recomputeRange(
    userId: string | undefined,
    from: string,
    to: string,
    shiftType: WorkShiftType = WorkShiftType.REGULAR,
  ) {
    const days = enumerateDateKeys(from, to);
    let count = 0;
    if (userId) {
      for (const dk of days) {
        await this.upsertByShiftDefinition(userId, dk, shiftType);
        count++;
      }
    } else {
      for (const dk of days) {
        const startUtc = zonedTimeToUtc(dk, '00:00:00', TZ);
        const endUtc = zonedTimeToUtc(dk, '23:59:59.999', TZ);
        const users: string[] = await this.logsModel.distinct('userId', {
          timestamp: { $gte: startUtc, $lte: endUtc },
        }) as any;
        for (const uid of users) {
          await this.upsertByShiftDefinition(String(uid), dk, shiftType);
          count++;
        }
      }
    }
    return { days: days.length, upserts: count };
  }
}

/* ====================== Helpers (no dayjs) ====================== */

function requireShift(type: WorkShiftType): ShiftDefinition {
  const def = SHIFT_REGISTRY[type];
  if (!def) throw new Error(`Unknown WorkShiftType: ${type}`);
  return def;
}

// Tính offset (ms) giữa UTC và timeZone cho một thời điểm UTC
function tzOffsetMs(dateUtc: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts = dtf.formatToParts(dateUtc);
  const map: any = {};
  for (const p of parts) if (p.type !== 'literal') map[p.type] = parseInt(p.value, 10);
  const asUTC = Date.UTC(map.year, map.month - 1, map.day, map.hour, map.minute, map.second);
  return asUTC - dateUtc.getTime();
}

// Tạo UTC Date tương ứng với “dateKey (YYYY-MM-DD) + time(HH:mm:ss[.SSS])” trong timeZone
function zonedTimeToUtc(dateKey: string, time: string, timeZone: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  const [hhmmss, msec] = time.split('.');
  const [hh, mm, ss] = (hhmmss || '00:00:00').split(':').map(Number);
  const ms = msec ? parseInt(msec, 10) : 0;

  // B1: tạo “giả” UTC theo local time (y,m,d,hh,mm,ss) – đây KHÔNG phải UTC thực
  const utcGuess = new Date(Date.UTC(y, m - 1, d, hh || 0, mm || 0, ss || 0, ms));

  // B2: offset tại thời điểm guess
  const offset = tzOffsetMs(utcGuess, timeZone);

  // B3: trừ offset để ra UTC thực cho local time ở timeZone
  return new Date(utcGuess.getTime() - offset);
}

// Lấy day-of-week local (0=CN..6=Thứ 7)
function getDow(dateKey: string, timeZone: string): Dow {
  const noonUtc = zonedTimeToUtc(dateKey, '12:00:00', timeZone); // trưa local tránh DST edge
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' });
  const wk = fmt.format(noonUtc); // Sun/Mon/...
  const map: Record<string, Dow> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[wk] ?? 0;
}

function enumerateDateKeys(from: string, to: string): string[] {
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

// Ghép logs thành cặp [in,out]
function pairLogs(ts: Date[]): Array<{ in: Date; out?: Date }> {
  const pairs: Array<{ in: Date; out?: Date }> = [];
  let cur: { in?: Date; out?: Date } = {};
  for (const t of ts) {
    if (!cur.in) cur = { in: t };
    else if (!cur.out) { cur.out = t; pairs.push(cur as any); cur = {}; }
    else { pairs.push(cur as any); cur = { in: t }; }
  }
  if (cur.in && !cur.out) pairs.push(cur as any);
  return pairs;
}

function buildPairsWithManual(
  logTs: Date[],
  manualIn?: Date,
  manualOut?: Date,
): Array<{ in: Date; out?: Date }> {
  if (manualIn && manualOut) return [{ in: manualIn, out: manualOut }];

  const base = pairLogs(logTs);
  if (manualIn && !manualOut) return [{ in: manualIn }, ...base];
  if (!manualIn && manualOut) return [...base, { in: manualOut }]; // giữ để không mất dữ liệu
  return base;
}

// Tính thực tế cho một session từ các cặp [in,out]
function calcForSessionFromPairs(
  pairs: Array<{ in: Date; out?: Date }>,
  s: ShiftSession,
  dateKey: string,
  tz: string,
) {
  const start = zonedTimeToUtc(dateKey, `${s.start}:00`, tz);
  const end = zonedTimeToUtc(dateKey, `${s.end}:00`, tz);

  let worked = 0, firstIn: Date | undefined, lastOut: Date | undefined;
  for (const p of pairs) {
    const aStart = p.in;
    const aEnd = p.out ?? p.in;
    const o = overlapMs(aStart, aEnd, start, end);
    if (o > 0) {
      worked += Math.round(o / 60000);
      if (!firstIn || aStart < firstIn) firstIn = p.in;
      if (!lastOut || (p.out && p.out > lastOut)) lastOut = p.out!;
    }
  }

  const graceIn = s.graceInMins ?? 0;
  const graceOut = s.graceOutMins ?? 0;

  let late = 0, early = 0;
  if (firstIn) {
    const targetIn = new Date(start.getTime() + graceIn * 60000);
    if (firstIn > targetIn) late = Math.round((firstIn.getTime() - targetIn.getTime()) / 60000);
  }
  if (lastOut) {
    const targetOut = new Date(end.getTime() - graceOut * 60000);
    if (lastOut < targetOut) early = Math.round((targetOut.getTime() - lastOut.getTime()) / 60000);
  }

  const required = s.required !== false;
  const planned = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  const fulfilled = required ? worked >= Math.max(planned - 30, 0) : worked > 0;

  return {
    checkIn: firstIn,
    checkOut: lastOut,
    workedMinutes: worked,
    lateMinutes: late,
    earlyLeaveMinutes: early,
    fulfilled,
  };
}

function overlapMs(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): number {
  const s = Math.max(aStart.getTime(), bStart.getTime());
  const e = Math.min(aEnd.getTime(), bEnd.getTime());
  return Math.max(0, e - s);
}

// Ước lượng overlap với phiên (để suy luận HALF/FULL cuối tuần)
function estimateOverlapMinutes(
  pairs: Array<{ in: Date; out?: Date }>,
  s: ShiftSession,
  dateKey: string,
  tz: string,
) {
  const start = zonedTimeToUtc(dateKey, `${s.start}:00`, tz);
  const end = zonedTimeToUtc(dateKey, `${s.end}:00`, tz);
  let total = 0;
  for (const p of pairs) {
    const o = overlapMs(p.in, p.out ?? p.in, start, end);
    total += Math.round(o / 60000);
  }
  return total;
}

function inferStatus(args: {
  sessions: ShiftSession[];
  requiredToday: boolean;
  pairs: Array<{ in: Date; out?: Date }>;
  workedMinutes: number;
  dateKey: string;
  tz: string;
  opts: { allowWeekendWork: boolean; halfThresholdMinutes: number };
}) {
  const { sessions, requiredToday, pairs, workedMinutes, dateKey, tz, opts } = args;

  if (!requiredToday) {
    if (!opts.allowWeekendWork || workedMinutes <= 0) return 'ABSENT';
    const am = sessions.find(s => s.code === 'AM');
    const pm = sessions.find(s => s.code === 'PM');
    const th = opts.halfThresholdMinutes;
    const amO = am ? estimateOverlapMinutes(pairs, am, dateKey, tz) : 0;
    const pmO = pm ? estimateOverlapMinutes(pairs, pm, dateKey, tz) : 0;
    if (amO >= th && pmO >= th) return 'FULL';
    if (amO >= th) return 'HALF_AM';
    if (pmO >= th) return 'HALF_PM';
    return 'PRESENT';
  }

  // ngày làm việc
  const amPlan = sessions.find(s => s.code === 'AM');
  const pmPlan = sessions.find(s => s.code === 'PM');
  const amFul = amPlan ? calcForSessionFromPairs(pairs, amPlan, dateKey, tz).fulfilled : false;
  const pmFul = pmPlan ? calcForSessionFromPairs(pairs, pmPlan, dateKey, tz).fulfilled : false;

  const reqCount = sessions.filter(s => s.required !== false).length;
  const fulfilledCount = (amFul ? 1 : 0) + (pmFul ? 1 : 0);
  if (fulfilledCount >= 2 || (reqCount === 1 && fulfilledCount === 1)) return 'FULL';
  if (amFul) return 'HALF_AM';
  if (pmFul) return 'HALF_PM';
  return 'ABSENT';
}
