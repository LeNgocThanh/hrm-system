// src/leave/leave.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';

import { LeaveRequest, LeaveRequestDocument } from './schemas/leave-request.schema';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveDto } from './dto/update-leave.dto';
import { QueryLeaveDto } from './dto/query-leave.dto';

import { LeaveType, LeaveUnit, TimeEntryType } from './common/leave-type.enum';

import { UserAssignmentsService } from 'src/user-assignments/user-assignments.service';
import { OrganizationsService } from 'src/organizations/organizations.service';
import { UserTimeEntriesService } from 'src/user-time-entries/user-time-entries.service';

export interface WorkingCalendarService {
  // Đếm số "ngày làm việc" giữa 2 mốc (bao gồm đầu/cuối nếu là ngày làm việc)
  countBusinessDays(fromDate: Date, toDate: Date): Promise<number>;
  isHoliday(date: Date): Promise<boolean>;
  isWeekend(date: Date): boolean;
}
export interface TimesheetService {
  // Áp đơn nghỉ vào timesheet (sinh entries) theo segments
  applyLeaveSegments(leave: LeaveRequestDocument): Promise<void>;
  // Gỡ entries liên quan tới đơn nghỉ này
  revertLeaveByRequest(leaveId: Types.ObjectId): Promise<void>;
}

const WORKDAY_HOURS = 8;
const HALF_AM_HOURS = 4;
const HALF_PM_HOURS = 4;

// Giờ làm việc — nếu cần khung làm việc thì dùng các hằng này.
const WORK_START_H = 8, WORK_START_M = 30;
const WORK_END_H = 17, WORK_END_M = 30;

/** Tiện ích ngày */
function atMidnight(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function at12PM(d: Date): Date {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  return x;
}
function sameDay(a: Date, b: Date): boolean {
  return atMidnight(a).getTime() === atMidnight(b).getTime();
}
function msToHours(ms: number): number {
  return Math.max(0, ms) / 3_600_000;
}
/** Tạo mốc giờ làm việc */
function dayTime(date: Date, h: number, m = 0): Date {
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

@Injectable()
export class LeaveService {
  constructor(
    @InjectModel(LeaveRequest.name)
    private readonly leaveModel: Model<LeaveRequestDocument>,
    private readonly userAssignmentsService: UserAssignmentsService,
    private readonly organizationsService: OrganizationsService,
    private readonly userTimeEntriesService: UserTimeEntriesService,

    @Optional() private readonly calendar?: WorkingCalendarService,
    @Optional() private readonly timesheet?: TimesheetService,


  ) { }

  // =========================
  // ======= CREATE ==========
  // =========================
  async create(dto: CreateLeaveDto, actorId?: string) {
    const userId = new Types.ObjectId(dto.userId);

    // 1) Validate nội bộ segments 
    this.validateSegmentsOrThrow(dto.segments);

    // 2) Chống overlap với đơn khác (pending/approved) của user
    await this.assertNoExternalOverlap(userId, dto.segments);

    // 3) Tính hours cho từng segment + totalHours (snapshot)
    const segmentsWithHours = await this.computeSegmentsHours(dto.segments);
    const totalHours = segmentsWithHours.reduce((s, seg) => s + (seg.hours || 0), 0);

    // 4) Lưu
    const doc = await this.leaveModel.create({
      userId,
      leaveType: dto.leaveType,
      segments: segmentsWithHours,
      totalHours,
      status: 'pending',
      reason: dto.reason,
      attachmentIds: (dto.attachmentIds || []).map((id) => new Types.ObjectId(id)),
      // audit
      createdBy: actorId ? new Types.ObjectId(actorId) : undefined,
      updatedBy: actorId ? new Types.ObjectId(actorId) : undefined,
    });

    return doc;
  }

  // =========================
  // ======= UPDATE ==========
  // =========================
  async update(id: string, dto: UpdateLeaveDto) {
    const leave = await this.leaveModel.findById(id);
    if (!leave) throw new NotFoundException('Không tìm thấy đơn nghỉ');

    // (Chính sách) Chỉ cho update khi pending
    if (leave.status !== 'pending') {
      throw new BadRequestException('Chỉ đơn trạng thái pending mới được cập nhật');
    }

    if (dto.userId) leave.userId = new Types.ObjectId(dto.userId);
    if (dto.leaveType) leave.leaveType = dto.leaveType;
    if (dto.reason !== undefined) leave.reason = dto.reason;
    if (dto.attachmentIds) {
      (leave.attachmentIds as any) = dto.attachmentIds.map((id) => new Types.ObjectId(id));
    }

    // Nếu cập nhật segments → thay thế toàn bộ
    if (dto.segments && dto.segments.length > 0) {
      this.validateSegmentsOrThrow(dto.segments);
      await this.assertNoExternalOverlap(leave.userId as Types.ObjectId, dto.segments, leave._id);
      const segs = await this.computeSegmentsHours(dto.segments);
      leave.segments = segs as any;
      leave.totalHours = segs.reduce((s, x) => s + (x.hours || 0), 0);
    }  

    return leave.save();
  }

  // =========================
  // ======= REVIEW ==========
  // =========================
  async review(id: string, dto, reviewerId: string) {
    const leave = await this.leaveModel.findById(id);
    console.log('Review leave', id, ' by ', reviewerId, ' action=', dto.action, 'data=', leave);
    if (!leave) throw new NotFoundException('Không tìm thấy đơn nghỉ');

    // Kiểm tra trạng thái hợp lệ theo action
    if (dto.action === 'approve' || dto.action === 'reject') {
      if (leave.status !== 'pending') {
        throw new BadRequestException('Chỉ duyệt/từ chối đơn đang pending');
      }
    }
    if (dto.action === 'cancel') {
      if (!['pending', 'approved'].includes(leave.status as string)) {
        throw new BadRequestException('Chỉ hủy được đơn ở trạng thái pending/approved');
      }
    }

    leave.reviewerId = new Types.ObjectId(reviewerId);
    leave.reviewedAt = new Date();
    leave.reviewNote = dto.note ?? leave.reviewNote;

    if (dto.action === 'approve') {
      for (const seg of leave.segments) {
        let startD: Date, endD: Date;
        if (seg.unit === LeaveUnit.DAY) {
          startD = atMidnight(new Date(seg.fromDate));
          endD = endOfDay(new Date(seg.toDate));
        }
        if (seg.unit === LeaveUnit.HALF_DAY) {
          startD = seg.slot === 'AM' ? atMidnight(new Date(seg.date)) : at12PM(new Date(seg.date));
          endD = seg.slot === 'AM' ? at12PM(new Date(seg.date)) : endOfDay(new Date(seg.date));
        }
        if (seg.unit === LeaveUnit.HOUR) {
          startD = new Date(seg.startAt);
          endD = new Date(seg.endAt);
        }
        const conflict = await this.userTimeEntriesService.checkConflict({
          userId: leave.userId.toString(),
          startAt: startD,
          endAt: endD,
        });   
        if (conflict) {
          throw new ConflictException(`Nghỉ phép bị trùng với tăng ca hoặc chấm công tại ${seg.startAt} - ${seg.endAt}`);
        }
      }
      leave.status = 'approved' as any;
    }
    if (dto.action === 'reject') leave.status = 'rejected' as any;
    if (dto.action === 'cancel') {
      for (const seg of leave.segments) {
        let startD: Date, endD: Date;     
        if (seg.unit === LeaveUnit.DAY) {
          startD = atMidnight(new Date(seg.fromDate));
          endD = endOfDay(new Date(seg.toDate));
        }
        if (seg.unit === LeaveUnit.HALF_DAY) {
          startD = seg.slot === 'AM' ? atMidnight(new Date(seg.date)) : at12PM(new Date(seg.date));
          endD = seg.slot === 'AM' ? at12PM(new Date(seg.date)) : endOfDay(new Date(seg.date));
        }
        if (seg.unit === LeaveUnit.HOUR) {
          startD = new Date(seg.startAt);
          endD = new Date(seg.endAt);
        }
        const now = new Date();      
        if (startD <= now) {
          throw new BadRequestException('Chỉ huỷ được đơn tăng ca trong tương lai');
        }
        leave.status = 'cancelled' as any;
      }
    }

    const saved = await leave.save();

    if (dto.action === 'approve') {
      for (const seg of leave.segments) {
        let startD: Date, endD: Date;
        if (seg.unit === LeaveUnit.DAY) {
          startD = atMidnight(new Date(seg.fromDate));
          endD = endOfDay(new Date(seg.toDate));
        }
        if (seg.unit === LeaveUnit.HALF_DAY) {
          startD = seg.slot === 'AM' ? atMidnight(new Date(seg.date)) : at12PM(new Date(seg.date));
          endD = seg.slot === 'AM' ? at12PM(new Date(seg.date)) : endOfDay(new Date(seg.date));
        }
        if (seg.unit === LeaveUnit.HOUR) {
          startD = new Date(seg.startAt);
          endD = new Date(seg.endAt);
        }
        await this.userTimeEntriesService.create({
          userId: leave.userId.toString(),
          type: TimeEntryType.LEAVE,
          startAt: startD,
          endAt: endD,
          refId: leave._id.toString(),
        });       
      }
    }
    if (dto.action === 'cancel' && saved.status === 'cancelled') {
      for (const seg of leave.segments) {
        let startD: Date, endD: Date;
        if (seg.unit === LeaveUnit.DAY) {
          startD = atMidnight(new Date(seg.fromDate));
          endD = endOfDay(new Date(seg.toDate));
        }
        if (seg.unit === LeaveUnit.HALF_DAY) {
          startD = seg.slot === 'AM' ? atMidnight(new Date(seg.date)) : at12PM(new Date(seg.date));
          endD = seg.slot === 'AM' ? at12PM(new Date(seg.date)) : endOfDay(new Date(seg.date));
        }
        if (seg.unit === LeaveUnit.HOUR) {
          startD = new Date(seg.startAt);
          endD = new Date(seg.endAt);
        }
        const isdelete = await this.userTimeEntriesService.removeByRefId({
          userId: leave.userId.toString(),
          type: TimeEntryType.LEAVE,
          startAt: startD,
          endAt: endD,
          refId: leave._id.toString(),
        });      
      }
    }
    // Hook timesheet (nếu có)
    try {
      if (this.timesheet) {
        if (dto.action === 'approve') {
          await this.timesheet.applyLeaveSegments(saved);
        } else if (dto.action === 'cancel') {
          await this.timesheet.revertLeaveByRequest(saved._id);
        }
        // (reject) không cần tác động timesheet
      }
    } catch (e) {

      console.error('Timesheet hook error:', e);
    }

    return saved;
  }

  // =========================
  // ========= READ ==========
  // =========================
  async findById(id: string) {
    const doc = await this.leaveModel
      .findById(id)
      .populate('userId', 'fullName email')
      .populate('reviewerId', 'fullName email')
      .populate('attachmentIds', 'fileName url size')
      .lean();
    if (!doc) throw new NotFoundException('Không tìm thấy đơn nghỉ');
    return doc;
  }

  async query(q: QueryLeaveDto, userId: string, roles: any[]): Promise<LeaveRequest[]> {
    const filter: FilterQuery<LeaveRequestDocument> = {};
    if (q.userId) filter.userId = new Types.ObjectId(q.userId);
    if (q.leaveType) filter.leaveType = q.leaveType;
    if (q.status) filter.status = q.status;
    if (q.from || q.to) {
      const fromDate = q.from ? atMidnight(new Date(q.from)) : undefined;
      const toDate = q.to ? atMidnight(new Date(q.to)) : undefined;

      filter.segments = {
        $elemMatch: {
          $or: [
            // FULL_DAY
            {
              unit: "DAY",
              ...(fromDate ? { toDate: { $gte: new Date(q.from) } } : {}),
              ...(toDate ? { fromDate: { $lte: new Date(q.to) } } : {}),
            },
            // HALF_DAY
            {
              unit: "HALF_DAY",
              ...(fromDate && toDate
                ? { date: { $gte: fromDate, $lte: toDate } }
                : fromDate
                  ? { date: { $gte: fromDate } }
                  : toDate
                    ? { date: { $lte: toDate } }
                    : {}),
            },
            // HOUR
            {
              unit: "HOUR",
              ...(fromDate ? { endAt: { $gt: fromDate } } : {}),
              ...(toDate ? { startAt: { $lt: toDate } } : {}),
            },
          ],
        },
      };
    }

    if (q.q) {
      filter.reason = { $regex: q.q, $options: 'i' };
    }
    if (q.unit && q.unit.length > 0) {
      filter.segments = filter.segments || { $elemMatch: {} };
      filter.segments.$elemMatch = filter.segments.$elemMatch || {};
      filter.segments.$elemMatch.unit = { $in: q.unit };
    }
    const moduleNames = ['All', 'LeaveRequest'];

    // Hàm tiện ích để kiểm tra quyền
    const hasPermission = (action: string) => {
      return roles.some(scope =>
        moduleNames.some(moduleName =>
          scope.groupedPermissions?.[moduleName]?.includes(action)
        )
      );
    };

    // 1. Kiểm tra quyền "manage"
    if (hasPermission('manage')) {
      // Có quyền manage => get tất cả
      return this.leaveModel.find(filter).exec();
    }

    // 2. Kiểm tra quyền "read"
    if (hasPermission('read')) {
      // Có quyền read => get toàn bộ cây tổ chức
      const userAssignments = await this.userAssignmentsService.findByUserId(userId);
      const userOrgIds = userAssignments.map(a => a.organizationId._id.toString());


      const allUsersInScope = new Set<string>();
      for (const orgId of userOrgIds) {
        const { users } = await this.organizationsService.findUsersInTree(orgId);
        users.forEach(user => allUsersInScope.add(user._id.toString()));
      }

      filter.userId = { $in: Array.from(allUsersInScope).map(id => new Types.ObjectId(id)) };
      return this.leaveModel.find(filter).exec();
    }

    // 3. Kiểm tra quyền "viewOwner"
    if (hasPermission('viewOwner')) {
      // Chỉ có quyền viewOwner => chỉ get của chính mình
      filter.userId = new Types.ObjectId(userId);
      return this.leaveModel.find(filter).exec();
    }
    // Nếu không có quyền nào thì trả về rỗng
    return [];
  }

  private async calculateTotalHours(segments: any[]): Promise<number> {
    let totalHours = 0;
    for (const seg of segments) {
      let hours = 0;
      if (seg.unit === LeaveUnit.DAY) {
        // Tích hợp working calendar service nếu có
        const from = this.atMidnight(new Date(seg.fromDate));
        const to = this.atMidnight(new Date(seg.toDate));
        let days: number;

        if (this.calendar?.countBusinessDays) {
          days = await this.calendar.countBusinessDays(from, to);
        } else {
          // Fallback: đếm ngày, loại trừ T7/CN
          let cnt = 0;
          for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
            const wd = d.getDay();
            if (wd !== 0 && wd !== 6) cnt++;
          }
          days = cnt;
        }
        hours = days * WORKDAY_HOURS;
      }
      if (seg.unit === LeaveUnit.HALF_DAY) {
        hours = seg.slot === 'AM' ? HALF_AM_HOURS : HALF_PM_HOURS;
      }
      if (seg.unit === LeaveUnit.HOUR) {
        const start = new Date(seg.startAt);
        const end = new Date(seg.endAt);
        hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }
      totalHours += hours;
    }
    return totalHours;
  }

  private atMidnight(d: Date): Date {
    const midnight = new Date(d);
    midnight.setHours(0, 0, 0, 0);
    return midnight;
  }

  // =====================================================
  // =============== PRIVATE: VALIDATION =================
  // =====================================================

  /** Kiểm tra các segment đủ dữ liệu theo unit, và **không chồng lấn nội bộ** */
  private validateSegmentsOrThrow(segments: Array<any>) {
    if (!Array.isArray(segments) || segments.length === 0) {
      throw new BadRequestException('segments là mảng và không rỗng');
    }

    // 1) validate theo unit
    for (const seg of segments) {
      if (!seg || !seg.unit) throw new BadRequestException('Mỗi segment cần trường unit');

      if (seg.unit === LeaveUnit.DAY) {
        if (!seg.fromDate || !seg.toDate) throw new BadRequestException('DAY segment cần fromDate & toDate');
        if (atMidnight(new Date(seg.toDate)) < atMidnight(new Date(seg.fromDate))) {
          throw new BadRequestException('toDate phải >= fromDate');
        }
      }

      if (seg.unit === LeaveUnit.HALF_DAY) {
        if (!seg.date || !seg.slot) throw new BadRequestException('HALF_DAY segment cần date & slot');
        if (!['AM', 'PM'].includes(seg.slot)) throw new BadRequestException('slot phải là AM hoặc PM');
      }

      if (seg.unit === LeaveUnit.HOUR) {
        if (!seg.startAt || !seg.endAt) throw new BadRequestException('HOUR segment cần startAt & endAt');
        if (!(new Date(seg.endAt) > new Date(seg.startAt))) {
          throw new BadRequestException('endAt phải > startAt');
        }
        // (policy) nếu yêu cầu cùng một ngày:
        if (!sameDay(new Date(seg.startAt), new Date(seg.endAt))) {
          throw new BadRequestException('HOUR segment startAt & endAt phải trong cùng 1 ngày');
        }
      }
    }

    // 2) chống chồng lấn nội bộ: normalize các khoảng [start,end) rồi so giao nhau
    const intervals = this.segmentsToIntervals(segments);
    for (let i = 0; i < intervals.length; i++) {
      for (let j = i + 1; j < intervals.length; j++) {
        const a = intervals[i], b = intervals[j];
        if (a.end > b.start && a.start < b.end) {
          throw new BadRequestException('Các segment bị chồng lấn (overlap) trong cùng đơn');
        }
      }
    }
  }

  /** Chuyển segments về danh sách interval [start,end) (theo ms epoch) để so sánh overlap */
  private segmentsToIntervals(segments: Array<any>): Array<{ start: number; end: number }> {
    const out: Array<{ start: number; end: number }> = [];
    for (const seg of segments) {
      if (seg.unit === LeaveUnit.DAY) {
        // Mỗi "ngày" là một interval full day (00:00-24:00) — đủ để detect overlap thô
        const from = atMidnight(new Date(seg.fromDate));
        const to = atMidnight(new Date(seg.toDate));
        for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
          out.push({ start: d.getTime(), end: endOfDay(d).getTime() + 1 }); // +1ms để bao trùm hết ngày
        }
      } else if (seg.unit === LeaveUnit.HALF_DAY) {
        const d = atMidnight(new Date(seg.date));
        const start = seg.slot === 'AM' ? d.getTime() : dayTime(d, 12, 0).getTime();
        const end = seg.slot === 'AM'
          ? dayTime(d, 12, 0).getTime()
          : endOfDay(d).getTime() + 1;
        out.push({ start, end });
      } else if (seg.unit === LeaveUnit.HOUR) {
        out.push({ start: new Date(seg.startAt).getTime(), end: new Date(seg.endAt).getTime() });
      }
    }
    return out.sort((a, b) => a.start - b.start);
  }

  /** Kiểm tra overlap với các đơn khác (pending/approved) của user */
  private async assertNoExternalOverlap(
    userId: Types.ObjectId,
    segments: Array<any>,
    excludeId?: Types.ObjectId,
  ) {
    // Lấy cận min/max để thu hẹp tìm kiếm
    const ivs = this.segmentsToIntervals(segments);
    const minStart = new Date(Math.min(...ivs.map((x) => x.start)));
    const maxEnd = new Date(Math.max(...ivs.map((x) => x.end)));

    const q: FilterQuery<LeaveRequest> = {
      userId,
      status: { $in: ['pending', 'approved'] as any },
    };
    if (excludeId) q._id = { $ne: excludeId };

    // Điều kiện $or bao phủ 3 loại segment
    const or: any[] = [];

    // DAY overlap
    or.push({
      'segments.unit': LeaveUnit.DAY,
      'segments.toDate': { $gte: atMidnight(minStart) },
      'segments.fromDate': { $lte: endOfDay(maxEnd) },
    });

    // HALF_DAY overlap — nếu ngày nằm trong [minStart, maxEnd]
    or.push({
      'segments.unit': LeaveUnit.HALF_DAY,
      'segments.date': { $gte: atMidnight(minStart), $lte: endOfDay(maxEnd) },
    });

    // HOUR overlap
    or.push({
      'segments.unit': LeaveUnit.HOUR,
      'segments.endAt': { $gte: minStart },
      'segments.startAt': { $lte: maxEnd },
    });

    q.$or = or;

    const conflict = await this.leaveModel.findOne(q).lean();
    if (conflict) {
      throw new BadRequestException('Khoảng thời gian yêu cầu bị chồng lấn với đơn khác.');
    }
  }

  // =====================================================
  // =============== PRIVATE: COMPUTATION ================
  // =====================================================

  /** Tính giờ cho từng segment theo policy; gán `hours` và trả mảng mới */
  private async computeSegmentsHours<T extends { unit: LeaveUnit;[k: string]: any }>(
    segments: T[],
  ): Promise<(T & { hours: number })[]> {
    const out: (T & { hours: number })[] = [];

    for (const seg of segments) {
      let hours = 0;

      if (seg.unit === LeaveUnit.DAY) {
        const from = atMidnight(new Date(seg.fromDate));
        const to = atMidnight(new Date(seg.toDate));
        let days: number;

        if (this.calendar?.countBusinessDays) {
          days = await this.calendar.countBusinessDays(from, to);
        } else {
          // Fallback: đếm ngày, loại trừ T7/CN
          let cnt = 0;
          for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
            const wd = d.getDay(); // 0 CN, 6 T7
            if (wd !== 0 && wd !== 6) cnt++;
          }
          days = cnt;
        }
        hours = days * WORKDAY_HOURS;
      }

      if (seg.unit === LeaveUnit.HALF_DAY) {
        // Policy đơn giản: AM = 4h, PM = 4h
        hours = seg.slot === 'AM' ? HALF_AM_HOURS : HALF_PM_HOURS;
      }

      if (seg.unit === LeaveUnit.HOUR) {
        // Policy đơn giản: chênh lệch thô theo giờ
        const start = new Date(seg.startAt);
        const end = new Date(seg.endAt);

        hours = msToHours(+end - +start);
      }

      out.push({ ...seg, hours });
    }

    return out;
  }
}
