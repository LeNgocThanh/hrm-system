import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { get, Model, Types } from 'mongoose';

import { AttendanceDaily, AttendanceDailyDocument } from './schemas/attendance-daily.schema';
import { AttendanceLog, AttendanceLogDocument } from './schemas/attendance-log.schema';
import { WorkShiftType } from './common/work-shift-type.enum';
import { HolidayService } from './holiday.service';

import { UserPolicyBindingService } from 'src/user-policies/user-policies.service';
import { UserPolicyType } from 'src/user-policies/common/user-policy-type.enum';
import { ShiftTypesService } from 'src/shift_types/shift_types.service';
import { ShiftType, WeeklyRules, ShiftSession } from 'src/shift_types/schemas/shift-type.schema';
import { SessionCode } from 'src/shift_types/common/session-code.enum';
import { OrganizationsService } from 'src/organizations/organizations.service';

interface ListUserPolicyQueryDto {
  userId?: Types.ObjectId;
  policyType?: UserPolicyType;
  onDate?: string;
  page?: number;
  limit?: number;
}



interface UpsertByShiftOverrideDto {
  userId: string;
  dateKey: string;        // YYYY-MM-DD
  shiftTypeCode: string;  // ví dụ "HC"
  tz?: string;
  editNote?: string;
}

interface UpsertOptions {
  allowWeekendWork?: boolean;
  halfThresholdMinutes?: number; // ngưỡng chấm HALF
}

interface MixSessionResult {
  pairsBySession: Record<string, SessionPair[]>;
  workingSession: 'AM' | 'PM' | 'AM_OVERTIME' | 'ABSENT';
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
  times: Record<string, UpsertTimesByCodeEntry>;
  editNote?: string;
  lateMinutes?: number;
  earlyLeaveMinutes?: number;
  workedMinutes?: number;
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
    private readonly orgSvc: OrganizationsService,
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

  async findRangeByOrgTree(
    orgId: string,
    from?: string,
    to?: string,
  ) {
    // 1) Lấy toàn bộ user trong cây org (theo OrganizationsService.findUsersInTreeNew)
    const result = await this.orgSvc.findUsersInTreeNew(orgId);
    const userIds: string[] = (result?.users ?? [])
      .map(u => (u?._id ? String(u._id) : undefined))
      .filter((x): x is string => Boolean(x));

    // Không có người dùng nào => trả về mảng rỗng
    if (userIds.length === 0) {
      return [];
    }

    // 2) Xây query tương tự findRange nhưng userId là $in danh sách userIds
    const q: any = { userId: { $in: userIds } };
    if (from || to) {
      q.dateKey = {};
      if (from) q.dateKey.$gte = from; // YYYY-MM-DD
      if (to) q.dateKey.$lte = to;   // YYYY-MM-DD
    }

    // 3) Trả về theo thứ tự userId, dateKey (hoặc đổi thứ tự tùy nhu cầu)
    return this.dailyModel
      .find(q)
      .sort({ userId: 1, dateKey: 1 })
      .lean();
  }

  /**
   * Upsert Daily từ LOGS dựa trên shift-definition (REGULAR: AM/PM; T7 chỉ AM; CN nghỉ).
   */
  async upsertByShiftDefinition(
    userId: string,
    dateKey: string, // 'YYYY-MM-DD' theo TZ    
    opts?: UpsertOptions,
  ) {
    let querry: ListUserPolicyQueryDto = {};
    querry.policyType = UserPolicyType.SHIFT_TYPE;
    querry.userId = new Types.ObjectId(userId);
    querry.onDate = dateKey;

    const dataAlreadyInDb = await this.dailyModel.findOne({ userId, dateKey }).lean();
    const isManualEdit = dataAlreadyInDb?.isManualEdit || false;
    if (isManualEdit) {
      // Không ghi đè dữ liệu đã chỉnh sửa tay
      return;
    }

    let userShiftType = [];
    try {
      userShiftType = await this.userPolicyBindingSvc.findAll(querry);
    }
    catch (error) {
      console.log('findAll execution failed');
      console.error('Error occurred while executing findAll:', error);
    }

    let policyCode = 'REGULAR';
    if (userShiftType.length === 0) {
      return this.upsertByFirstInLastOut(userId, dateKey);
    }
    if (userShiftType.length > 0) {
      policyCode = userShiftType[0].policyCode;
    }

    const shiftTypeDef = await this.shiftTypeSvc.findByCode(policyCode);
    if (!shiftTypeDef) {
      throw new Error(`Không tìm thấy định nghĩa ca làm việc cho code: ${policyCode}`);
    }
    const dow = getDow(dateKey, TZ);
    let ShiftSessionsForDay: ShiftSession[] = [];
    let isCheckTwoTimes = false;
    if (shiftTypeDef) {
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

    // 2) Xét OV của ngày N-1 để loại bỏ logs có thể thuộc về OV ngày N-1
    const prevDate = toPrevDateKey(dateKey, TZ);
    querry.onDate = prevDate;
    const userShiftTypePre = await this.userPolicyBindingSvc.findAll(querry);
    let policyCodePre = 'REGULAR'
    if (userShiftTypePre.length > 0) {
      policyCodePre = userShiftTypePre[0].policyCode;
    }
    const shiftTypeDefPre = await this.shiftTypeSvc.findByCode(policyCodePre);
    if (!shiftTypeDefPre) {
      throw new Error(`Không tìm thấy định nghĩa ca làm việc cho code: ${policyCode}`);
    }
    const dowPre = getDow(dateKey, TZ);
    let ShiftSessionsForDayPre: ShiftSession[] = [];

    if (shiftTypeDefPre) {
      ShiftSessionsForDayPre = shiftTypeDefPre.weeklyRules[String(dowPre) as keyof WeeklyRules] ?? [];
    }

    const hasOVPrev = ShiftSessionsForDayPre.find((s) => s.code === "OV") ? true : false;

    let lowerBound = startOfN; // mốc nhỏ nhất để lấy log ngày N gán đầu tiên là 00:00:00
    if (hasOVPrev) {
      const prevOV = ShiftSessionsForDayPre.find((s) => s.code === 'OV')!;
      const endPlusPrev = prevOV.maxCheckOutLateMins ?? 0;
      const prevOVEndPlus = addMinutes(
        zonedTimeOrOverflowToUtc(prevDate, `${prevOV.end}:00`, TZ),
        endPlusPrev,
      );
      if (prevOVEndPlus > lowerBound) lowerBound = prevOVEndPlus; // gán lại mốc nhỏ nhất lấy log (chú ý tránh mất log ca sau do cộng thêm thời gian cho phép ra muộn )
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
    if (holiday) {
      agg.status = 'HOLIDAY';
    }
    const replacementDocument = {
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
    };

    await this.dailyModel.replaceOne(
      { userId, dateKey },
      replacementDocument,
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

    let querry: ListUserPolicyQueryDto = {};
    querry.policyType = UserPolicyType.SHIFT_TYPE;
    querry.userId = new Types.ObjectId(userId);
    querry.onDate = dateKey;

    const userShiftType = await this.userPolicyBindingSvc.findAll(querry);
    let policyCode = 'REGULAR'
    if (userShiftType.length > 0) {
      policyCode = userShiftType[0].policyCode;
    }
    const shiftTypeDef = await this.shiftTypeSvc.findByCode(policyCode);
    if (!shiftTypeDef) {
      throw new Error(`Không tìm thấy định nghĩa ca làm việc cho code: ${policyCode}`);
    }
    const dow = getDow(dateKey, TZ);
    let ShiftSessionsForDay: ShiftSession[] = [];
    let isCheckTwoTimes = false;
    if (shiftTypeDef) {
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
    const agg = aggregateSessions(pairsBySession, sessions, dateKey, tz, { halfThresholdMinutes: dto?.['halfThresholdMinutes' as any] });

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

  async upsertTimesNoSession(dto: UpsertTimesDto) {
    const userId = dto.userId;
    const dateKey = dto.dateKey;
    const tz = dto.tz || TZ;

    const editNote = dto.editNote || '';
    const earlyLeaveMinutes = dto.earlyLeaveMinutes || 0;
    const workedMinutes = dto.workedMinutes || 0;
    const lateMinutes = dto.lateMinutes || 0;
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
    const realWorkedMinutes = (workedMinutes > 0) ? workedMinutes : agg.workedMinutes;
    const replacementDocument = {
      userId,
      dateKey,
      shiftType: 'NO' as any, // hoặc 'No' tùy bạn, cast để qua type
      workedCheckIn: agg.workedCheckIn,
      hourWork: agg.hourWork,
      workedMinutes: realWorkedMinutes,
      lateMinutes: lateMinutes,
      earlyLeaveMinutes: earlyLeaveMinutes,
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
    };

    // 3) Ghi DB
    await this.dailyModel.replaceOne(
      { userId, dateKey },
      replacementDocument,
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
    const dataAlreadyInDb = await this.dailyModel.findOne({ userId, dateKey }).lean();
    const isManualEdit = dataAlreadyInDb?.isManualEdit || false;
    if (isManualEdit) {
      // Không ghi đè dữ liệu đã chỉnh sửa tay
      return;
    }

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
    await this.dailyModel.replaceOne(
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
          editNote: '[auto] first-in/last-out trong ngày do không có ca gán',
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

  async upsertByShiftDefinitionOverlapped(
    userId: string,
    dateKey: string,
    opts?: UpsertOptions,
  ) {
    // 0) Chặn ghi đè nếu bản ghi người dùng đã “edit tay”
    const dataAlreadyInDb = await this.dailyModel.findOne({ userId, dateKey }).lean();
    const isManualEdit = dataAlreadyInDb?.isManualEdit || false;
    if (isManualEdit) {
      this.logger.log(`[SKIP] ${userId} ${dateKey} isManualEdit=true`);
      return;
    }

    // 1) Lấy ShiftType hiệu lực và sessions trong ngày
    const TZ = 'Asia/Bangkok';
    const bindings = await this.userPolicyBindingSvc.findAll({
      policyType: UserPolicyType.SHIFT_TYPE,
      userId: new Types.ObjectId(userId),
      onDate: dateKey,
    });

    const policyCode = bindings?.[0]?.policyCode || WorkShiftType.REGULAR;
    const shiftTypeDef = await this.shiftTypeSvc.findByCode(policyCode as any);
    if (!shiftTypeDef) throw new Error(`Không tìm thấy ShiftType: ${policyCode}`);

    const dow = getDow(dateKey, TZ);
    const sessions: ShiftSession[] = (shiftTypeDef.weeklyRules[String(dow) as keyof WeeklyRules] || [])
      .filter(Boolean);

    // 2) Khoanh khung thời gian lấy logs cho ngày N (nới biên để bắt đủ earliest/latest)
    //    Bạn có thể tái dùng logic khung của hàm cũ; dưới đây minh hoạ lấy logs trong ngày theo TZ
    const dayStart = zonedTimeToUtc(dateKey, '00:00:00', TZ);
    const dayEnd = zonedTimeToUtc(dateKey, '23:59:59', TZ);
    const rawLogs = await this.logsModel
      .find({
        userId: new Types.ObjectId(userId),
        timestamp: { $gte: dayStart, $lte: dayEnd },
      })
      .sort({ timestamp: 1 })
      .lean();

    const logs: Date[] = rawLogs.map(l => new Date(l.timestamp)).sort((a, b) => a.getTime() - b.getTime());
    if (logs.length === 0) {
      // upsert vắng mặt
      const replacementDocument = {
        userId: new Types.ObjectId(userId),
        dateKey,
        status: 'ABSENT',
        workedMinutes: 0,
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        workedCheckIn: 0,
        hourWork: sessions.reduce((s, x) => s, 0),
        sessions: {},
        isManualEdit: false,
      }
      await this.dailyModel.replaceOne(
        { userId, dateKey },
        replacementDocument,
      { upsert: true },
      );
      return;
    }

    // 3) Dựng cặp in/out theo rule 1h (AM/PM có thể chồng lấn)
    const { pairsBySession, zeroLateForPm } =
      buildPairsOverlappedAmPmByEarliestLatest(logs, sessions, dateKey, TZ);

    // 4) Tính tổng hợp
    let agg = aggregateSessions(pairsBySession, sessions, dateKey, TZ, opts);

    // 4.1) Yêu cầu “bỏ lateMinutes của PM” khi tính cả 2 ca và gán firstIn PM = end(AM)
    if (zeroLateForPm && agg.sessions) {
      for (const s of agg.sessions) {
        if ((s.code || '').toUpperCase() === 'PM') {
          // trừ phần late PM khỏi tổng
          agg.lateMinutes -= (s.lateMinutes || 0);
          s.lateMinutes = 0;
        }
      }
    }

    // 5) Kết xuất về schema “legacy sessions” (am/pm/ov)
    const sessionsLegacy = projectLegacySessions(agg.sessions || []);

    const replacementDocument = {
      userId: new Types.ObjectId(userId),
      dateKey,
      workedMinutes: agg.workedMinutes,
      lateMinutes: agg.lateMinutes,
      earlyLeaveMinutes: agg.earlyLeaveMinutes,
      workedCheckIn: agg.workedCheckIn,
      hourWork: agg.hourWork,
      status: agg.status,
      sessions: sessionsLegacy,
      isManualEdit: false,
    }

    // 6) Ghi DB
    await this.dailyModel.updateOne(
      { userId, dateKey },
      replacementDocument,
      { upsert: true },
    );
  }

  async upsertByShiftDefinitionMix(
  userId: string,
  dateKey: string,
  opts?: UpsertOptions,
) {
  // 0) Chặn ghi đè nếu đã manual edit
  const dataAlreadyInDb = await this.dailyModel.findOne({ userId, dateKey }).lean();
  const isManualEdit = dataAlreadyInDb?.isManualEdit || false;
  if (isManualEdit) {
    this.logger.log(`[SKIP] ${userId} ${dateKey} isManualEdit=true`);
    return;
  }

  // 1) Lấy ShiftType và sessions
  let querry: ListUserPolicyQueryDto = {
    policyType: UserPolicyType.SHIFT_TYPE,
    userId: new Types.ObjectId(userId),
    onDate: dateKey,
  };

  const userShiftType = await this.userPolicyBindingSvc.findAll(querry);
  let policyCode = 'REGULAR';
  if (userShiftType.length > 0) {
    policyCode = userShiftType[0].policyCode;
  }

  const shiftTypeDef = await this.shiftTypeSvc.findByCode(policyCode);
  if (!shiftTypeDef) {
    throw new Error(`Không tìm thấy định nghĩa ca làm việc cho code: ${policyCode}`);
  }

  const dow = getDow(dateKey, TZ);
  let ShiftSessionsForDay: ShiftSession[] = [];
  let isMixSession = false;

  if (shiftTypeDef) {
    ShiftSessionsForDay = shiftTypeDef.weeklyRules[String(dow) as keyof WeeklyRules] ?? [];
    isMixSession = (shiftTypeDef as any).isMixSession || false;
  }

  // Nếu KHÔNG phải Mix Session => dùng hàm cũ
  if (!isMixSession) {
    return this.upsertByShiftDefinition(userId, dateKey, opts);
  }

  // 2) Lấy logs trong ngày
  const startOfN = zonedTimeToUtc(dateKey, '00:00:00', TZ);
  const endOfN = zonedTimeToUtc(dateKey, '23:59:59', TZ);

  const rawLogs = await this.logsModel
    .find({ userId, timestamp: { $gte: startOfN, $lte: endOfN } })
    .sort({ timestamp: 1 })
    .lean<AttendanceLogDocument[]>();

  const logTimes = rawLogs.map((x) => new Date(x.timestamp));

  // 3) Build pairs với logic Mix Session
  const { pairsBySession, workingSession } = buildPairsMixSession(
    logTimes,
    ShiftSessionsForDay,
    dateKey,
    TZ,
  );

  // 4) Aggregate với logic Mix Session
  const agg = aggregateMixSession(
    pairsBySession,
    ShiftSessionsForDay,
    dateKey,
    TZ,
    workingSession,
    opts,
  );

  // 5) Kiểm tra holiday
  const holiday = await this.holidaySvc.findEffective(dateKey);
  if (holiday) {
    agg.status = 'HOLIDAY';
  }

  // 6) Chuẩn bị document để lưu
  const replacementDocument = {
    userId,
    dateKey,
    shiftType: policyCode,
    workedCheckIn: agg.workedCheckIn,
    hourWork: agg.hourWork,
    workedMinutes: agg.workedMinutes,
    lateMinutes: agg.lateMinutes,
    earlyLeaveMinutes: agg.earlyLeaveMinutes,
    status: agg.status,
    sessions: agg.sessions,
    ...(function () {
      const legacy = projectLegacySessions(agg.sessions ?? []);
      const set: any = {};
      if (legacy.am) set.am = legacy.am;
      if (legacy.pm) set.pm = legacy.pm;
      if (legacy.ov) set.ov = legacy.ov;
      return set;
    })(),
  };

  // 7) Lưu vào DB
  await this.dailyModel.replaceOne(
    { userId, dateKey },
    replacementDocument,
    { upsert: true },
  );

  return { ok: true, workingSession };
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
      .filter((s): s is ShiftSession => !!s)
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
      .filter((s): s is { code: SessionCode; start: Date; end: Date } => !!s); 

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
      workedCheckIn += Math.max(0, minutesBetween(inT, outT));
    }
    worked = worked > workbreakMins ? (worked - workbreakMins) : worked; // max = workHour

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

  const status = total <= 0 ? 'ABSENT' : total > 240 ? 'FULL' : 'PARTIAL';

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

function overlapMs(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): number {
  const s = Math.max(aStart.getTime(), bStart.getTime());
  const e = Math.min(aEnd.getTime(), bEnd.getTime());
  return Math.max(0, e - s);
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

function buildPairsOverlappedAmPmByEarliestLatest(
  logs: Date[],
  sessions: ShiftSession[],
  dateKey: string,
  tz: string,
): {
  pairsBySession: Record<string, { in: Date; out?: Date }[]>;
  zeroLateForPm: boolean; // khi true, sau khi aggregate sẽ set lateMinutes của PM = 0
} {
  const res: Record<string, { in: Date; out?: Date }[]> = {};
  for (const s of sessions) res[s.code] = [];

  const am = sessions.find(s => (s.code || '').toUpperCase() === 'AM');
  const pm = sessions.find(s => (s.code || '').toUpperCase() === 'PM');

  if (!am && !pm) return { pairsBySession: res, zeroLateForPm: false };
  if (!logs || logs.length === 0) return { pairsBySession: res, zeroLateForPm: false };

  const earliest = new Date([...logs].sort((a, b) => a.getTime() - b.getTime())[0]);
  const latest = new Date([...logs].sort((a, b) => a.getTime() - b.getTime()).slice(-1)[0]);

  const d = (hhmm: string) => zonedTimeToUtc(dateKey, `${hhmm}:00`, tz);

  const startAM = am ? d(am.start) : undefined;
  const endAM = am ? d(am.end) : undefined;
  const startPM = pm ? d(pm.start) : undefined;
  const endPM = pm ? d(pm.end) : undefined;

  const inRange = (t: Date | undefined, a: Date | undefined, b: Date | undefined) =>
    !!(t && a && b && t.getTime() >= a.getTime() && t.getTime() <= b.getTime());

  const plusMs = (t: Date | undefined, ms: number) => t ? new Date(t.getTime() + ms) : undefined;
  const minusMs = (t: Date | undefined, ms: number) => t ? new Date(t.getTime() - ms) : undefined;

  const ONE_HOUR = 60 * 60 * 1000;

  // Các cờ tình huống
  const latestInPM = inRange(latest, startPM, endPM);
  const earliestInAM = inRange(earliest, startAM, endAM);

  // Helpers clamp
  const clamp = (t: Date, lo?: Date, hi?: Date): Date => {
    let x = t;
    if (lo && x < lo) x = lo;
    if (hi && x > hi) x = hi;
    return x;
  };

  // Quyết định tính AM/PM
  let takeAM = !!am;
  let takePM = !!pm;
  let both = false;
  let zeroLateForPm = false;

  if (am && pm) {
    // (1) latest nằm trong PM nhưng latest ≤ end(AM)+1h → chỉ AM
    if (latestInPM && endAM && latest.getTime() <= plusMs(endAM, ONE_HOUR)!.getTime()) {
      takePM = false; takeAM = true; both = false;
    }
    // (2) latest > end(AM)+1h ⇒ sẽ tính PM (nhưng có thể đồng thời tính AM nếu không rơi vào (3))
    else if (endAM && latest.getTime() > plusMs(endAM, ONE_HOUR)!.getTime()) {
      takePM = true; // giữ nguyên takeAM, xét tiếp (3)
    }

    // (3) earliest nằm trong AM nhưng earliest ≥ start(PM)-1h → không tính AM
    if (earliestInAM && startPM && earliest.getTime() >= minusMs(startPM, ONE_HOUR)!.getTime()) {
      takeAM = false;
    }

    // (4) Còn lại mà cả AM/PM đều true ⇒ tính cả 2
    both = takeAM && takePM;
  }

  // Dựng pairs
  if (am && takeAM) {
    const inAM = clamp(earliest, startAM, endAM);
    const outAM = clamp(latest, startAM, endAM);
    if (outAM.getTime() >= inAM.getTime()) {
      res[am.code] = [{ in: inAM, out: outAM }];
    }
  }

  if (pm && takePM) {
    // nếu tính cả 2 ca: PM.firstIn = end(AM), bỏ late PM
    if (both && endAM) {
      const inPM = clamp(endAM, startPM, endPM);
      const outPM = clamp(latest, startPM, endPM);
      if (outPM.getTime() >= inPM.getTime()) {
        res[pm.code] = [{ in: inPM, out: outPM }];
        zeroLateForPm = true; // yêu cầu "bỏ lateMinutes của PM"
      }
    } else {
      const inPM = clamp(earliest, startPM, endPM);
      const outPM = clamp(latest, startPM, endPM);
      if (outPM.getTime() >= inPM.getTime()) {
        res[pm.code] = [{ in: inPM, out: outPM }];
      }
    }
  }

  // Đảm bảo key tồn tại (kể cả rỗng)
  if (am && !res[am.code]) res[am.code] = [];
  if (pm && !res[pm.code]) res[pm.code] = [];

  return { pairsBySession: res, zeroLateForPm };
}

function buildPairsMixSession(
  logs: Date[],
  sessions: ShiftSession[],
  dateKey: string,
  tz: string,
): MixSessionResult {
  const result: Record<string, SessionPair[]> = {};
  for (const s of sessions) result[s.code] = [];

  if (logs.length === 0) {
    return { 
      pairsBySession: result, 
      workingSession: 'ABSENT' 
    };
  }

  const am = sessions.find(s => (s.code || '').toUpperCase() === 'AM');
  const pm = sessions.find(s => (s.code || '').toUpperCase() === 'PM');

  if (!am || !pm) {
    return { 
      pairsBySession: result, 
      workingSession: 'ABSENT' 
    };
  }

  // Sắp xếp logs và lấy earliest/latest
  const sortedLogs = [...logs].sort((a, b) => a.getTime() - b.getTime());
  const earliest = sortedLogs[0];
  const latest = sortedLogs[sortedLogs.length - 1];

  // Parse thời gian ca
  const startAM = zonedTimeOrOverflowToUtc(dateKey, `${am.start}:00`, tz);
  const endAM = zonedTimeOrOverflowToUtc(dateKey, `${am.end}:00`, tz);
  const startPM = zonedTimeOrOverflowToUtc(dateKey, `${pm.start}:00`, tz);
  const endPM = zonedTimeOrOverflowToUtc(dateKey, `${pm.end}:00`, tz);

  const ONE_HOUR = 60 * 60 * 1000;

  // Ngưỡng kiểm tra
  const amStartPlus1h = new Date(startAM.getTime() + ONE_HOUR);
  const amEndPlus1h = new Date(endAM.getTime() + ONE_HOUR);
  const pmStartPlus1h = new Date(startPM.getTime() + ONE_HOUR);

  // === CASE 1: Làm ca AM (có log không vượt quá am.start + 1h) ===
  if (earliest.getTime() <= amStartPlus1h.getTime()) {
    
    // CASE 1a: Log cuối KHÔNG vượt quá (am.end + 1h) => CHỈ tính AM
    if (latest.getTime() <= amEndPlus1h.getTime()) {
      const inAM = new Date(earliest.getTime());
      const outAM = new Date(latest.getTime());
      
      if (outAM.getTime() >= inAM.getTime()) {
        result[am.code] = [{ in: inAM, out: outAM }];
      }
      
      return {
        pairsBySession: result,
        workingSession: 'AM'
      };
    }
    
    // CASE 1b: Log cuối VƯỢT QUÁ (am.end + 1h) => Tính TĂNG CA từ AM
    else {
      const inAM = new Date(earliest.getTime());
      const outOvertime = new Date(latest.getTime());
      
      if (outOvertime.getTime() >= inAM.getTime()) {
        result[am.code] = [{ in: inAM, out: outOvertime }];
      }
      
      return {
        pairsBySession: result,
        workingSession: 'AM_OVERTIME'
      };
    }
  }
  
  // === CASE 2: KHÔNG làm AM, kiểm tra có làm PM không ===
  // Điều kiện: có log không vượt quá (pm.start + 1h)
  if (earliest.getTime() <= pmStartPlus1h.getTime()) {
    const inPM = new Date(earliest.getTime());
    const outPM = new Date(latest.getTime());
    
    if (outPM.getTime() >= inPM.getTime()) {
      result[pm.code] = [{ in: inPM, out: outPM }];
    }
    
    return {
      pairsBySession: result,
      workingSession: 'PM'
    };
  }

  // === CASE 3: Không thuộc trường hợp nào => ABSENT ===
  return {
    pairsBySession: result,
    workingSession: 'ABSENT'
  };
}

/**
 * Aggregate cho Mix Session với logic late/early đặc biệt
 */
function aggregateMixSession(
  pairsBySession: Record<string, SessionPair[]>,
  sessions: ShiftSession[],
  dateKey: string,
  tz: string,
  workingSession: 'AM' | 'PM' | 'AM_OVERTIME' | 'ABSENT',
  opts?: UpsertOptions,
): AggregateResult {
  const am = sessions.find(s => (s.code || '').toUpperCase() === 'AM');
  const pm = sessions.find(s => (s.code || '').toUpperCase() === 'PM');

  if (!am || !pm || workingSession === 'ABSENT') {
    return {
      workedMinutes: 0,
      lateMinutes: 0,
      earlyLeaveMinutes: 0,
      workedCheckIn: 0,
      hourWork: 0,
      status: 'ABSENT',
      sessions: [],
    };
  }

  const startAM = zonedTimeOrOverflowToUtc(dateKey, `${am.start}:00`, tz);
  const endAM = zonedTimeOrOverflowToUtc(dateKey, `${am.end}:00`, tz);
  const startPM = zonedTimeOrOverflowToUtc(dateKey, `${pm.start}:00`, tz);
  const endPM = zonedTimeOrOverflowToUtc(dateKey, `${pm.end}:00`, tz);

  const perSession: AggregateResult['sessions'] = [];
  let totalWorked = 0;
  let totalLate = 0;
  let totalEarly = 0;
  let totalWorkedCheckIn = 0;
  let totalHourWork = 0;

  // Xử lý theo từng case
  if (workingSession === 'AM' || workingSession === 'AM_OVERTIME') {
    const pairs = pairsBySession[am.code] || [];
    
    if (pairs.length > 0 && pairs[0].in && pairs[0].out) {
      const firstIn = pairs[0].in;
      const lastOut = pairs[0].out;

      // Tính workedMinutes
      const worked = Math.floor((lastOut.getTime() - firstIn.getTime()) / 60000);
      const workedCheckIn = worked;
      
      // Tính late/early CHỈ dựa trên khung giờ AM
      let late = 0;
      let early = 0;        
      
      // Late: so với AM start + grace
      if (firstIn.getTime() > startAM.getTime()) {
        late = Math.floor((firstIn.getTime() - startAM.getTime()) / 60000);
      }
      
      // Early: chỉ tính nếu KHÔNG phải AM_OVERTIME và out < AM end - grace
      if (workingSession === 'AM') {
        if (lastOut.getTime() < endAM.getTime()) {
          early = Math.floor((endAM.getTime() - lastOut.getTime()) / 60000);
        }
      }
      
      // Tính hourWork
      const breakMins = am.breakMinutes ?? 0;
      const hourWork = Math.floor((endAM.getTime() - startAM.getTime()) / 60000) - breakMins;
      
      totalWorked = worked;
      totalLate = late;
      totalEarly = early;
      totalWorkedCheckIn = workedCheckIn;
      totalHourWork = hourWork;

      perSession.push({
        code: am.code,
        workedMinutes: worked,
        hourWork: hourWork,
        workedCheckIn: workedCheckIn,
        lateMinutes: late,
        earlyLeaveMinutes: early,
        pairs,
      });
    }
  } 
  else if (workingSession === 'PM') {
    const pairs = pairsBySession[pm.code] || [];
    
    if (pairs.length > 0 && pairs[0].in && pairs[0].out) {
      const firstIn = pairs[0].in;
      const lastOut = pairs[0].out;

      // Tính workedMinutes
      const worked = Math.floor((lastOut.getTime() - firstIn.getTime()) / 60000);
      const workedCheckIn = worked;
      
      // Tính late/early dựa trên khung giờ PM
      let late = 0;
      let early = 0;    
      
      // Late: so với PM start + grace
      if (firstIn.getTime() > startPM.getTime() ) {
        late = Math.floor((firstIn.getTime() - startPM.getTime()) / 60000);
      }
      
      // Early: so với PM end - grace
      if (lastOut.getTime() < endPM.getTime()) {
        early = Math.floor((endPM.getTime() - lastOut.getTime()) / 60000);
      }
      
      // Tính hourWork
      const breakMins = pm.breakMinutes ?? 0;
      const hourWork = Math.floor((endPM.getTime() - startPM.getTime()) / 60000) - breakMins;
      
      totalWorked = worked;
      totalLate = late;
      totalEarly = early;
      totalWorkedCheckIn = workedCheckIn;
      totalHourWork = hourWork;

      perSession.push({
        code: pm.code,
        workedMinutes: worked,
        hourWork: hourWork,
        workedCheckIn: workedCheckIn,
        lateMinutes: late,
        earlyLeaveMinutes: early,
        pairs,
      });
    }
  }

  // Xác định status
  const half = opts?.halfThresholdMinutes ?? 120;
  const isOvertime = totalWorked > (totalHourWork + 60); 
  let status: any;
  if (totalWorked <= 0) {
    status = 'ABSENT';
  } else if (totalWorked < half) {
    status = 'HALF';
  } else {
    status = 'FULL';
  }
  if (isOvertime) {
    status = 'OVERTIME';
  }

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








