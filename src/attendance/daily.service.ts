import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { get, Model, Types } from 'mongoose';

import { AttendanceDaily, AttendanceDailyDocument } from './schemas/attendance-daily.schema';
import { AttendanceLog, AttendanceLogDocument } from './schemas/attendance-log.schema';
import { WorkShiftType } from './common/work-shift-type.enum';
import { SHIFT_REGISTRY, ShiftDefinition, resolveSessionsForDate, resolveIsCheckTwoTimesForShiftDefinition } from './common/shift-definition';
import { Holiday, HolidayDocument } from './schemas/holiday-exception.schema';
import { HolidayService } from './holiday.service';

import { UserPolicyBindingService } from 'src/user-policies/user-policies.service';
import { UserPolicyType } from 'src/user-policies/common/user-policy-type.enum';
import { ShiftTypesService } from 'src/shift_types/shift_types.service';
import { ShiftType, WeeklyRules, ShiftSession } from 'src/shift_types/schemas/shift-type.schema';
import { SessionCode } from 'src/shift_types/common/session-code.enum';

interface ListUserPolicyQueryDto {  
  userId?: Types.ObjectId; 
  policyType?: UserPolicyType;  
  onDate?: string;  
  page?: number;  
  limit?: number;
}

interface UpsertOptions {
  allowWeekendWork?: boolean;
  halfThresholdMinutes?: number; // ngưỡng chấm HALF
}

interface SessionPair { in: Date; out?: Date }

interface AggregateResult {
  workedMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  workedCheckIn: number;
  hourWork: number;
  status: string; // 'ABSENT' | 'HALF' | 'FULL' | ... tuỳ dự án
  sessions?: Array<{
    code: string;
    workedMinutes: number;
    hourWork: number;
    workedCheckIn: number;
    lateMinutes: number;
    earlyLeaveMinutes: number;
    pairs: SessionPair[];
  }>;
}

const TZ = 'Asia/Bangkok';
type Dow = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=CN ... 6=Thứ 7

export interface UpsertTimesByCodeEntry {
  checkIn?: string;   // 'HH:mm' (hỗ trợ >24h cho OV) hoặc ISO
  checkOut?: string;  // 'HH:mm' (hỗ trợ >24h cho OV) hoặc ISO
}

export interface UpsertTimesDto {
  userId: string;
  dateKey: string;                    // 'YYYY-MM-DD' (local TZ)
  shiftType?: WorkShiftType;          // mặc định REGULAR
  tz?: string;                        // mặc định 'Asia/Bangkok' trong file
  times: Record<string, UpsertTimesByCodeEntry>; // ví dụ: { AM:{checkIn:'08:05',checkOut:'12:03'}, OV:{checkOut:'26:40'} }
  editNote?: string;               // ghi chú khi sửa
}

@Injectable()
export class DailyService {
  private readonly logger = new Logger(DailyService.name);
  
  constructor(
    @InjectModel(AttendanceDaily.name)
    private readonly dailyModel: Model<AttendanceDailyDocument>,

    @InjectModel(AttendanceLog.name)
    private readonly logsModel: Model<AttendanceLogDocument>,  
   

    private readonly holidaySvc: HolidayService,
    private readonly userPolicyBindingSvc: UserPolicyBindingService,
    private readonly shiftTypeSvc: ShiftTypesService,
  ) { }

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
    dateKey: string, // 'YYYY-MM-DD' theo TZ    
    opts?: UpsertOptions,
  ) {
    let querry : ListUserPolicyQueryDto = {};
    querry.policyType = UserPolicyType.SHIFT_TYPE;
    querry.userId = new Types.ObjectId(userId);
    querry.onDate = dateKey;
    
    let userShiftType = [];
    try {
     userShiftType = await this.userPolicyBindingSvc.findAll(querry);
     console.log('findAll executed successfully');
    }
    catch (error) {
      console.log('findAll execution failed');
      console.error('Error occurred while executing findAll:', error);
    }
    console.log('userShiftType', userShiftType);
    
    let policyCode = 'REGULAR'
    if(userShiftType.length > 0) {
      policyCode = userShiftType[0].policyCode;
    }
    
    const shiftTypeDef = await this.shiftTypeSvc.findByCode(policyCode);
    if(!shiftTypeDef) {
      throw new Error(`Không tìm thấy định nghĩa ca làm việc cho code: ${policyCode}`);
    }
    const dow = getDow(dateKey, TZ);
    let ShiftSessionsForDay: ShiftSession[] = [];
    let isCheckTwoTimes = false;
    if(shiftTypeDef) {
      ShiftSessionsForDay = shiftTypeDef.weeklyRules[String(dow) as keyof WeeklyRules] ?? [];
      isCheckTwoTimes = shiftTypeDef.isCheckTwoTimes || false;  
    }
     

    // 1) Xác định khung thời gian lấy log cho ngày N
    //const daySessions = resolveSessionsForDate(def, dateKey) as ShiftSession[];
    const hasOVToday = ShiftSessionsForDay.find((s) => s.code === "OV") ? true : false;   

    const startOfN = zonedTimeToUtc(dateKey, '00:00:00', TZ);
    const endOfNDefault = zonedTimeToUtc(dateKey, '23:59:59', TZ);

    let endOfFetchN = endOfNDefault;
    if (hasOVToday) {
      const ov = ShiftSessionsForDay.find((s) => s.code === "OV");;
      const endPlus = ov.maxCheckOutLateMins ?? 0;
      endOfFetchN = addMinutes(zonedTimeOrOverflowToUtc(dateKey, `${ov.end}:00`, TZ), endPlus);
    }

    // 2) Xét OV của ngày N-1 để loại bỏ logs "quá sớm"
    const prevDate = toPrevDateKey(dateKey, TZ);
    querry.onDate = prevDate;
    const userShiftTypePre = await this.userPolicyBindingSvc.findAll(querry);
    let policyCodePre = 'REGULAR'
    if(userShiftTypePre.length > 0) {
      policyCodePre = userShiftTypePre[0].policyCode;
    }
    const shiftTypeDefPre = await this.shiftTypeSvc.findByCode(policyCodePre);
    if(!shiftTypeDefPre) {
      throw new Error(`Không tìm thấy định nghĩa ca làm việc cho code: ${policyCode}`);
    }
    const dowPre = getDow(dateKey, TZ);
    let ShiftSessionsForDayPre: ShiftSession[] = [];
    
    if(shiftTypeDefPre) {
      ShiftSessionsForDayPre = shiftTypeDefPre.weeklyRules[String(dowPre) as keyof WeeklyRules] ?? [];
    }
    
   const hasOVPrev = ShiftSessionsForDayPre.find((s) => s.code === "OV") ? true : false;

    let lowerBound = startOfN; // mốc nhỏ nhất để lấy log ngày N
    if (hasOVPrev) {
      const prevOV = ShiftSessionsForDayPre.find((s) => s.code === 'OV')!;
      const endPlusPrev = prevOV.maxCheckOutLateMins ?? 0;
      const prevOVEndPlus = addMinutes(
        zonedTimeOrOverflowToUtc(prevDate, `${prevOV.end}:00`, TZ),
        - endPlusPrev,
      );
      if (prevOVEndPlus > lowerBound) lowerBound = prevOVEndPlus;
    }

    // 3) Fetch logs theo cửa sổ [lowerBound, endOfFetchN]
    const rawLogs = await this.logsModel
      .find({ userId, timestamp: { $gte: lowerBound, $lte: endOfFetchN } })
      .sort({ timestamp: 1 })
      .lean<AttendanceLogDocument[]>();

    const logTimes = rawLogs.map((x) => new Date(x.timestamp));     
     

    // 4) Ghép cặp LINH HOẠT THEO PHIÊN
    const pairsBySession = buildPairsBySessionFlexible(logTimes, ShiftSessionsForDay, dateKey, TZ, isCheckTwoTimes);

    // 5) Tính worked/late/early theo từng session rồi tổng hợp
    const agg = aggregateSessions(pairsBySession, ShiftSessionsForDay, dateKey, TZ, opts);

     const holiday = await this.holidaySvc.findEffective(dateKey);
     if(holiday) {
      agg.status = 'HOLIDAY';
     }
    
    await this.dailyModel.updateOne(
      { userId, dateKey },
      {
        $set: {
          userId,
          dateKey,
          shiftType: policyCode,
          workedCheckIn: agg.workedCheckIn,
          hourWork: agg.hourWork,
          workedMinutes: agg.workedMinutes,
          lateMinutes: agg.lateMinutes,
          earlyLeaveMinutes: agg.earlyLeaveMinutes,
          status: agg.status,
          sessions: agg.sessions, // nếu schema có
          ...(function () {
            const legacy = projectLegacySessions(agg.sessions ?? []);
            const set: any = {};
            if (legacy.am) set.am = legacy.am;
            if (legacy.pm) set.pm = legacy.pm;
            if (legacy.ov) set.ov = legacy.ov;
            return set;
          })(),
        },
      },
      { upsert: true },
    ); 
  }
  /**
   * Cập nhật thủ công checkIn/checkOut rồi recompute theo shift.
   */
  async upsertTimes(dto: UpsertTimesDto) {
    const userId = dto.userId;
    const dateKey = dto.dateKey;
    const tz = dto.tz || TZ;

    let querry : ListUserPolicyQueryDto = {};
    querry.policyType = UserPolicyType.SHIFT_TYPE;
    querry.userId = new Types.ObjectId(userId);
    querry.onDate = dateKey;

    const userShiftType = await this.userPolicyBindingSvc.findAll(querry);
    let policyCode = 'REGULAR'
    if(userShiftType.length > 0) {
      policyCode = userShiftType[0].policyCode;
    }
    const shiftTypeDef = await this.shiftTypeSvc.findByCode(policyCode);
    if(!shiftTypeDef) {
      throw new Error(`Không tìm thấy định nghĩa ca làm việc cho code: ${policyCode}`);
    }
    const dow = getDow(dateKey, TZ);
    let ShiftSessionsForDay: ShiftSession[] = [];
    let isCheckTwoTimes = false;
    if(shiftTypeDef) {
      ShiftSessionsForDay = shiftTypeDef.weeklyRules[String(dow) as keyof WeeklyRules] ?? [];
      isCheckTwoTimes = shiftTypeDef.isCheckTwoTimes || false;  
    }
    const shiftType = policyCode as WorkShiftType;
    const editNote = dto.editNote || '';
    const isManualEdit = true;
    
    const sessions = ShiftSessionsForDay;

    // map hợp lệ code → session (case-insensitive)
    const byCode = new Map<string, ShiftSession>();
    for (const s of sessions) byCode.set(s.code.toLowerCase(), s);

    // build pairsBySession từ times được gửi lên
    const pairsBySession: Record<string, SessionPair[]> = {};

    for (const key of Object.keys(dto.times || {})) {
      const code = key.trim().toLowerCase();
      const session = byCode.get(code);
      if (!session) {
        // bỏ qua code không hợp lệ
        continue;
      }
      const t = dto.times[key];
      let inDate: Date | undefined;
      let outDate: Date | undefined;

      if (t.checkIn) inDate = parseFlexibleLocal(dateKey, t.checkIn, tz);
      if (t.checkOut) outDate = parseFlexibleLocal(dateKey, t.checkOut, tz);      
      
      const arr: SessionPair[] = [];
      if (inDate && outDate && outDate < inDate) {
        // Nếu người dùng nhập ngược, đổi chỗ để an toàn
        arr.push({ in: outDate, out: inDate });
      } else if (inDate && !outDate) {
        arr.push({ in: inDate });
      } else if (!inDate && outDate) {
        // Cho phép chỉ nhập OUT? thường không, nhưng nếu có, coi như mở từ start phiên
        const start = zonedTimeOrOverflowToUtc(dateKey, `${session.start}:00`, tz);
        arr.push({ in: start, out: outDate });
      } else if (!inDate && !outDate) {       
        continue;
      }
      else {
        arr.push({ in: inDate!, out: outDate });
      }

      pairsBySession[session.code] = arr;
    }
    const agg = aggregateSessions(pairsBySession, sessions, dateKey, tz, { halfThresholdMinutes:  dto?.['halfThresholdMinutes' as any] });

    await this.dailyModel.updateOne(
      { userId, dateKey },
      {
        $set: {
          userId,
          dateKey,
          shiftType,
          workedCheckIn: agg.workedCheckIn,
          hourWork: agg.hourWork,
          workedMinutes: agg.workedMinutes,
          lateMinutes: agg.lateMinutes,
          earlyLeaveMinutes: agg.earlyLeaveMinutes,
          status: agg.status,
          sessions: agg.sessions,
          editNote,
          isManualEdit,
          ...(function(){
            const legacy = projectLegacySessions(agg.sessions ?? []);
            const set: any = {};
            console.log('legacy', legacy);
            if (legacy.am) set.am = legacy.am;
            if (legacy.pm) set.pm = legacy.pm;
            if (legacy.ov) set.ov = legacy.ov;
            return set;
          })(),
        },
      },
      { upsert: true },
    );
  }

  async upsertTimesNoSession(dto: UpsertTimesDto) {
  const userId = dto.userId;
  const dateKey = dto.dateKey;
  const tz = dto.tz || TZ;

  const editNote = dto.editNote || '';
  const isManualEdit = true;

  // 1) Build pairs theo đúng những gì người dùng nhập; không tra sessions định nghĩa
  const pairsByCode: Record<string, SessionPair[]> = {};

  for (const key of Object.keys(dto.times || {})) {
    const t = dto.times[key];
    let inDate: Date | undefined;
    let outDate: Date | undefined;

    if (t.checkIn) inDate = parseFlexibleLocal(dateKey, t.checkIn, tz);
    if (t.checkOut) outDate = parseFlexibleLocal(dateKey, t.checkOut, tz);

    const arr: SessionPair[] = [];
    if (inDate && outDate && outDate < inDate) {
      // Nếu người dùng nhập ngược giờ → đảo chiều để an toàn
      arr.push({ in: outDate, out: inDate });
    } else if (inDate && outDate) {
      arr.push({ in: inDate, out: outDate });
    } else if (inDate && !outDate) {
      // Chỉ có in → lưu để hiển thị; không tính công vì thiếu out
      arr.push({ in: inDate });
    } else if (!inDate && outDate) {
      // Chỉ có out → lưu để hiển thị; không tính công vì thiếu in
      arr.push({ in: outDate }); // vẫn lưu cặp đơn; tùy bạn có muốn bỏ qua hoàn toàn không
    } else {
      continue;
    }

    pairsByCode[key] = arr;
  }

  // 2) Tổng hợp đơn giản: worked = sum(out-in), late/early = 0
  const agg = aggregateNoSession(pairsByCode);

  // 3) Ghi DB
  await this.dailyModel.updateOne(
    { userId, dateKey },
    {
      $set: {
        userId,
        dateKey,
        shiftType: 'NO' as any, // hoặc 'No' tùy bạn, cast để qua type
        workedCheckIn: agg.workedCheckIn,
        hourWork: agg.hourWork,
        workedMinutes: agg.workedMinutes,
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        status: agg.status, // ABSENT | PRESENT theo tổng phút
        sessions: agg.sessions,
        computedAt: new Date(),
        isManualEdit,
        editNote,
        ...(function () {
          const legacy = projectLegacySessions(agg.sessions ?? []);
          const set: any = {};
          if (legacy.am) set.am = legacy.am;
          if (legacy.pm) set.pm = legacy.pm;
          if (legacy.ov) set.ov = legacy.ov;
          return set;
        })(),
      },
    },
    { upsert: true },
  );

  return { ok: true };
}

async upsertByFirstInLastOut(
  userId: string,
  dateKey: string,
) {
  const tz = TZ;

  // 1) Cửa sổ log trong ngày local
  const startOfN = zonedTimeToUtc(dateKey, '00:00:00', tz);
  const endOfN = zonedTimeToUtc(dateKey, '23:59:59', tz);

  // 2) Lấy logs trong [startOfN, endOfN]
  const rawLogs = await this.logsModel
    .find({ userId, timestamp: { $gte: startOfN, $lte: endOfN } })
    .sort({ timestamp: 1 })
    .lean<AttendanceLogDocument[]>();

  const times = rawLogs.map(x => new Date(x.timestamp));
  const first = times[0];
  const last = times.length > 0 ? times[times.length - 1] : undefined;

  let worked = 0;
  const pairs: SessionPair[] = [];
  if (first && last && last > first) {
    worked = Math.floor((last.getTime() - first.getTime()) / 60000); // phút
    pairs.push({ in: first, out: last });
  } else if (first) {
    pairs.push({ in: first });
  }

  const status = worked <= 0 ? 'ABSENT' : 'PRESENT';

  const perSession = [{
    code: 'NO',
    workedMinutes: worked,
    hourWork: worked,
    workedCheckIn: worked,
    lateMinutes: 0,
    earlyLeaveMinutes: 0,
    pairs,
  }];

  // 3) Ghi DB
  await this.dailyModel.updateOne(
    { userId, dateKey },
    {
      $set: {
        userId,
        dateKey,
        shiftType: 'NO' as any,
        workedCheckIn: worked,
        hourWork: worked,
        workedMinutes: worked,
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        status,
        sessions: perSession,
        computedAt: new Date(),
        isManualEdit: false,
        editNote: '[auto] first-in/last-out trong ngày',
        ...(function () {
          const legacy = projectLegacySessions(perSession);
          const set: any = {};
          if (legacy.am) set.am = legacy.am;
          if (legacy.pm) set.pm = legacy.pm;
          if (legacy.ov) set.ov = legacy.ov;
          return set;
        })(),
      },
    },
    { upsert: true },
  );

  return { ok: true, logs: rawLogs.length, workedMinutes: worked, status };
}

  /** Optional: recompute batch */
  async recomputeRange(
    userId: string | undefined,
    from: string,
    to: string,    
  ) {
    const days = enumerateDateKeys(from, to);
    let count = 0;
    if (userId) {
      for (const dk of days) {
        await this.upsertByShiftDefinition(userId, dk);
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
          await this.upsertByShiftDefinition(String(uid), dk);
          count++;
        }
      }
    }
    return { days: days.length, upserts: count };
  }
}



/* ====================== Helpers (no dayjs) ====================== */
export type LegacySessionKey = 'am' | 'pm' | 'ov';

export interface LegacySessionSummary {
  firstIn?: string;   // ISO string
  lastOut?: string;   // ISO string
  workedMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  pairs?: { in: string; out?: string }[]; // optional for traceability
}

export interface LegacySessionsPayload {
  am?: LegacySessionSummary;
  pm?: LegacySessionSummary;
  ov?: LegacySessionSummary;
}

export function projectLegacySessions(perSession: NonNullable<AggregateResult['sessions']>): LegacySessionsPayload {
  const mapCode = (code: string): LegacySessionKey | undefined => {
    const k = code.trim().toLowerCase();
    if (k === 'am' || k === 'morning') return 'am';
    if (k === 'pm' || k === 'afternoon') return 'pm';
    if (k === 'ov' || k === 'overnight' || k === 'ot' || k === 'over') return 'ov';
    return undefined;
  };

  const out: LegacySessionsPayload = {};
  for (const s of perSession) {
    const key = mapCode(s.code);
    if (!key) continue;

    const firstIn = s.pairs.find(p => p.in)?.in;
    const lastOut = [...s.pairs].reverse().find(p => p.out)?.out;

    (out as any)[key] = {
      firstIn: firstIn ? new Date(firstIn).toISOString() : undefined,
      lastOut: lastOut ? new Date(lastOut).toISOString() : undefined,
      hourWork: s.hourWork,
      workedCheckIn: s.workedCheckIn,
      workedMinutes: s.workedMinutes,
      lateMinutes: s.lateMinutes,
      earlyLeaveMinutes: s.earlyLeaveMinutes,
      pairs: s.pairs.map(p => ({ in: p.in.toISOString(), out: p.out ? p.out.toISOString() : undefined })),
    } as LegacySessionSummary;
  }
  return out;
}



export function buildPairsBySessionFlexible(
  logs: Date[],
  sessions: ShiftSession[],
  dateKey: string,
  tz: string,
  isCheckTwoTimes: boolean = false,
): Record<string, SessionPair[]> {
  const result: Record<string, SessionPair[]> = {};
  // init rỗng cho mọi phiên để nhất quán schema trả về
  for (const s of sessions) result[s.code] = [];
  
  if (isCheckTwoTimes) {
   const shiftSessions = sessions
        .filter((s): s is ShiftSession => !!s) // Lọc bỏ ca null/undefined nếu có
        .map(s => {
            // Chuyển đổi start/end của ca sang Date object (UTC)
            const start = zonedTimeOrOverflowToUtc(dateKey, `${s.start}:00`, tz);
            const end = zonedTimeOrOverflowToUtc(dateKey, `${s.end}:00`, tz);

            // Chỉ giữ lại các ca có start và end hợp lệ
            if (!start || !end) return null;

            return {
                code: s.code,
                start: start,
                end: end,
            };
        })
        .filter((s): s is { code: SessionCode; start: Date; end: Date } => !!s); // Lọc bỏ các ca không hợp lệ

    // 2. Sắp xếp logs và xác định earliest/latest
    const sortedLogs = [...logs].sort((a, b) => a.getTime() - b.getTime());
    if (sortedLogs.length === 0 || shiftSessions.length === 0) return result;

    const earliestLog = sortedLogs[0];
    const latestLog = sortedLogs[sortedLogs.length - 1];

    // 3. Lọc ra các ca có giao điểm với khoảng thời gian chấm công
    const intersectingShifts = shiftSessions.filter(shift => {
        // Giao điểm tồn tại nếu:
        // (Shift.start < Log.latest) VÀ (Shift.end > Log.earliest)
        return shift.start.getTime() < latestLog.getTime() && 
               shift.end.getTime() > earliestLog.getTime();
    });
    
    // Nếu không có ca nào có giao điểm, không làm gì cả
    if (intersectingShifts.length === 0) {
        return result;
    }

    // 4. Gán Earliest/Latest cho ca đầu tiên và cuối cùng có giao điểm
    
    // Ca đầu tiên có giao điểm (do shiftSessions đã sắp xếp nên [0] là ca đầu tiên)
    const firstShift = intersectingShifts[0];
    // Ca cuối cùng có giao điểm
    const lastShift = intersectingShifts[intersectingShifts.length - 1];

    // 5. Xây dựng kết quả (Result Construction)
    for (const shift of intersectingShifts) {
        let finalIn: Date;
        let finalOut: Date;

        if (shift.code === firstShift.code) {
            // Ca đầu tiên: Lấy earliestLog làm IN
            finalIn = earliestLog;
        } else {
            // Ca giữa: Lấy start của ca đó làm IN
            finalIn = shift.start;
        }

        if (shift.code === lastShift.code) {
            // Ca cuối cùng: Lấy latestLog làm OUT
            finalOut = latestLog;
        } else {
            // Ca giữa: Lấy end của ca đó làm OUT
            finalOut = shift.end;
        }

        // Đảm bảo In luôn nhỏ hơn Out (hoặc bằng nếu cùng một mốc)
        if (finalIn.getTime() <= finalOut.getTime()) {
            result[shift.code] = [{ in: finalIn, out: finalOut }];
        }
    }

    return result;
  }

  // ================= CHẾ ĐỘ LINH HOẠT THEO PHIÊN (MẶC ĐỊNH) =================
  const unused = [...logs];

  for (const s of sessions) {
    const start = zonedTimeOrOverflowToUtc(dateKey, `${s.start}:00`, tz);
    const end = zonedTimeOrOverflowToUtc(dateKey, `${s.end}:00`, tz);

    const maxInEarly = s.maxCheckInEarlyMins ?? 0;
    const maxOutLate = s.maxCheckOutLateMins ?? 0;

    const guardStart = addMinutes(start, -maxInEarly);
    const guardEnd = addMinutes(end, +maxOutLate);

    const inside: Array<{ idx: number; t: Date }> = [];
    for (let i = 0; i < unused.length; i++) {
      const t = unused[i];
      if (t >= guardStart && t <= guardEnd) inside.push({ idx: i, t });
    }

    inside.sort((a, b) => a.t.getTime() - b.t.getTime());

    let pairs: SessionPair[] = [];
    if (inside.length >= 1) {
      const earliestIn = inside[0].t;
      const latestOut = inside[inside.length - 1].t;
      pairs = inside.length === 1 ? [{ in: earliestIn }] : [{ in: earliestIn, out: latestOut }];
    }

    for (const { idx } of inside.reverse()) unused.splice(idx, 1);

    result[s.code] = pairs;
  }

  return result;
}

export function aggregateSessions(
  pairsBySession: Record<string, SessionPair[]>,
  sessions: ShiftSession[],
  dateKey: string,
  tz: string,
  opts?: UpsertOptions,
): AggregateResult {
  const perSession: AggregateResult['sessions'] = [];


  let totalHourWork = 0;
  let totalWorkedCheckIn = 0; 
  let totalWorked = 0;
  let totalLate = 0;
  let totalEarly = 0;


  for (const s of sessions) {
    const start = zonedTimeOrOverflowToUtc(dateKey, `${s.start}:00`, tz);
    const end = zonedTimeOrOverflowToUtc(dateKey, `${s.end}:00`, tz);
    let workbreakMins = 0;
    workbreakMins = s.breakMinutes ?? 0;
    const workHour = minutesBetween(start, end) - workbreakMins;

    const pairs = pairsBySession[s.code] || [];
    const closedPairs = pairs.filter(p => !!p.out && p.in !== p.out);
    let worked = 0;
    let workedCheckIn = 0;
    for (const p of closedPairs) {
      const inT = p.in;
      const outT = p.out!;
      worked += Math.max(0, overlappedMinutes(inT, outT, start, end));
      workedCheckIn += Math.max(0, minutesBetween(inT,outT));
    }
    worked = worked > workbreakMins ? (worked-workbreakMins) : worked; // max = workHour

    let late = 0;
    let early = 0;
    if (closedPairs.length > 0) {
      const firstIn = closedPairs[0].in;
      const lastOut = closedPairs[closedPairs.length - 1].out!;
      if (firstIn > start) late = minutesBetween(start, firstIn);
      if (lastOut < end) early = minutesBetween(lastOut, end);
    }
    
    totalWorkedCheckIn += workedCheckIn;
    totalHourWork += workHour;
    totalWorked += worked;
    totalLate += late;
    totalEarly += early;


    perSession.push({
      code: s.code,
      workedMinutes: worked,
      hourWork: workHour,
      workedCheckIn: workedCheckIn,
      lateMinutes: late,
      earlyLeaveMinutes: early,
      pairs,
    });
  }

  // status minh họa theo ngưỡng HALF
  const half = opts?.halfThresholdMinutes ?? 120; 
  let status: any;// ví dụ 2h
  status = totalWorked <= 0 ? 'ABSENT' : totalWorked < half ? 'HALF' : 'FULL';
  if (sessions.length === 0) { status = 'LEAVE'; } // không có phiên thì coi như LEAVE
  


  return {
    workedMinutes: totalWorked,
    lateMinutes: totalLate,
    earlyLeaveMinutes: totalEarly,
    workedCheckIn: totalWorkedCheckIn,
    hourWork: totalHourWork,
    status,
    sessions: perSession,
  };
}

export function aggregateNoSession(pairsByCode: Record<string, SessionPair[]>): AggregateResult {
  let total = 0;

  const perSession: NonNullable<AggregateResult['sessions']> = [];
  for (const code of Object.keys(pairsByCode)) {
    const pairs = pairsByCode[code] || [];
    let worked = 0;

    for (const p of pairs) {
      if (p.in && p.out && p.out > p.in) {
        worked += Math.floor((p.out.getTime() - p.in.getTime()) / 60000);
      }
    }

    perSession.push({
      code,
      workedMinutes: worked,
      hourWork: worked,
      workedCheckIn: worked,
      lateMinutes: 0,
      earlyLeaveMinutes: 0,
      pairs,
    });

    total += worked;
  }

  const status = total <= 0 ? 'ABSENT' : 'PRESENT';

  return {
    workedMinutes: total,
    workedCheckIn: total,
    hourWork: total,
    lateMinutes: 0,
    earlyLeaveMinutes: 0,
    status,
    sessions: perSession,
  };
}

function requireShift(type: WorkShiftType): ShiftDefinition {
  const def = SHIFT_REGISTRY[type];
  if (!def) throw new Error(`Unknown WorkShiftType: ${type}`);
  return def;
}

function getTzOffsetMinutesAt(utcInstant: Date, tz: string): number {
  // Format that UTC instant in the target time zone
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = fmt.formatToParts(utcInstant);
  const get = (t: string) => parts.find(p => p.type === t)?.value!;
  const Y = Number(get("year"));
  const M = Number(get("month"));
  const D = Number(get("day"));
  const h = Number(get("hour"));
  const m = Number(get("minute"));
  const s = Number(get("second"));

  // Build the "naive local" timestamp at that same instant
  const naiveLocalMs = Date.UTC(Y, M - 1, D, h, m, s);
  // Offset = local(naive) - utcInstant
  const offsetMinutes = Math.round((naiveLocalMs - utcInstant.getTime()) / 60000);
  return offsetMinutes;
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
    if ((amO === 0 || amO >= th) && (pmO === 0 || pmO >= th)) return 'FULL';
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

function findLatestSessionEnd(sessions: ShiftSession[]): string {
  if (sessions.length === 0) return '23:59:59.999';
  let latestEnd = 0;
  let latestEndStr = '23:59:59.999';

  for (const s of sessions) {
    const [hh, mm] = s.end.split(':').map(Number);
    const endMinutes = hh * 60 + mm;

    if (endMinutes > latestEnd) {
      latestEnd = endMinutes;
      latestEndStr = `${hh}:${mm}:00`;
    }
  }
  return latestEndStr;
}

function findEarliestSessionStart(sessions: ShiftSession[]): string {
  if (sessions.length === 0) return '23:59:59.999';
  let earliestStart = 24 * 60;
  let earliestStartStr = '23:59:59.999';

  for (const s of sessions) {
    const [hh, mm] = s.start.split(':').map(Number);
    const startMinutes = hh * 60 + mm;

    // Giờ bắt đầu không bao giờ > 24:00, nhưng cần tính cả graceInMins
    const grace = s.graceInMins || 0;
    const effectiveStartMinutes = startMinutes - grace;

    if (effectiveStartMinutes < earliestStart) {
      earliestStart = effectiveStartMinutes;
      // Chuyển lại về HH:mm:ss, có thể bị âm (vd: -30 phút)
      // Để đơn giản, ta chỉ lấy giờ bắt đầu sớm nhất. Hàm zonedTimeToUtc sẽ xử lý offset.
      earliestStartStr = s.start + ':00';
    }
  }
  return earliestStartStr;
}
function zonedTimeToUtc(dateKey: string, timeHHmmss: string, tz: string): Date {
  const [Y, M, D] = dateKey.split("-").map(Number);
  const [hh, mm, ss] = timeHHmmss.split(":").map(Number);

  // naive local timestamp (treat local wall time as if it were UTC components)
  const naiveLocalMs = Date.UTC(Y, M - 1, D, hh, mm, ss);
  const tentativeUtc = new Date(naiveLocalMs);

  // find actual offset at this instant for tz
  const offsetMinutes = getTzOffsetMinutesAt(tentativeUtc, tz);

  // UTC = local - offset
  return new Date(naiveLocalMs - offsetMinutes * 60000);
}

/**
 * Support overflow hours (e.g., '26:30:00' → +1 day 02:30).
 * Example: OV end '26:30' on dateKey means next day's 02:30 local time.
 */
function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function zonedTimeOrOverflowToUtc(dateKey: string, timeHHmmss: string, tz: string): Date {
  const [hhStr, mmStr = "00", ssStr = "00"] = timeHHmmss.split(":");
  let hh = Number(hhStr);
  const mm = Number(mmStr);
  const ss = Number(ssStr);

  if (hh <= 23) {
    return zonedTimeToUtc(dateKey, `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`, tz);
  }

  // Overflow: shift days, wrap hour
  const dayShift = Math.floor(hh / 24);
  hh = hh % 24;

  // Add dayShift to dateKey
  const dateUtc00 = zonedTimeToUtc(dateKey, "00:00:00", tz); // 00:00 local → UTC instant
  const shiftedUtc00 = new Date(dateUtc00.getTime() + dayShift * 86400000);
  const shiftedDateKey = toDateKey(shiftedUtc00, tz); // reconstruct dateKey at tz after shifting days

  return zonedTimeToUtc(shiftedDateKey, `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`, tz);
}

/**
* 00:00:00 của dateKey theo TZ → UTC Date
*/
function toDateAtTz(dateKey: string, tz: string): Date {
  return zonedTimeToUtc(dateKey, '00:00:00', tz);
}


function addMinutes(d: Date, mins: number): Date {
  return new Date(d.getTime() + mins * 60 * 1000);
}


function toPrevDateKey(dateKey: string, tz: string): string {
  const base = toDateAtTz(dateKey, tz);
  const prev = new Date(base.getTime() - 24 * 60 * 60 * 1000);
  return toDateKey(prev, tz);
}


function toDateKey(d: Date, tz: string): string {
  // chuyển Date UTC → dateKey theo TZ (giản lược cho UTC+7)
  const tzOffsetMinutes = tz === 'Asia/Bangkok' ? 7 * 60 : 0;
  const localMs = d.getTime() + tzOffsetMinutes * 60 * 1000;
  const local = new Date(localMs);
  const Y = local.getUTCFullYear();
  const M = String(local.getUTCMonth() + 1).padStart(2, '0');
  const D = String(local.getUTCDate()).padStart(2, '0');
  return `${Y}-${M}-${D}`;
}


// Minutes of overlap between [a1, a2] & [b1, b2]
function overlappedMinutes(a1: Date, a2: Date, b1: Date, b2: Date): number {
  const start = Math.max(a1.getTime(), a2.getTime()) === a2.getTime() ? a1 : a2; // ensure a1<=a2 if swapped
  const end = Math.max(a1.getTime(), a2.getTime()) === a2.getTime() ? a2 : a1;
  const s = Math.max(start.getTime(), b1.getTime());
  const e = Math.min(end.getTime(), b2.getTime());
  return e > s ? Math.floor((e - s) / (60 * 1000)) : 0;
}


function minutesBetween(a: Date, b: Date): number {
  return Math.max(0, Math.floor(Math.abs(b.getTime() - a.getTime()) / (60 * 1000)));
}

function parseFlexibleLocal(dateKey: string, s: string, tz: string): Date {
  // Nếu là ISO (ví dụ '2025-10-15T08:15:00Z' hoặc '2025-10-15T08:15:00+07:00'), dùng luôn:
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }
  // Nếu là 'HH:mm' hoặc 'H:mm' (cho phép >24h cho OV):
  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) throw new Error(`Invalid time format: ${s}`);
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  const ss = m[3] ? Number(m[3]) : 0;
  return zonedTimeOrOverflowToUtc(dateKey, `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`, tz);
}





