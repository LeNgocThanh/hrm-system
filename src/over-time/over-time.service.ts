import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { OvertimeRequest, OvertimeRequestDocument } from './schemas/overtime-request.schema';
import { CreateOvertimeDto } from './dto/create-overtime.dto';
import { UpdateOvertimeDto } from './dto/update-overtime.dto';
import { QueryOvertimeDto } from './dto/query-overtime.dto';
import { ReviewOvertimeDto } from './dto/review.dto';
import { OvertimeStatus, OvertimeKind, CompensationType } from './common/overTime.enum';
import { UserAssignmentsService } from 'src/user-assignments/user-assignments.service';
import { OrganizationsService } from 'src/organizations/organizations.service';


// (tuỳ dự án) hook timesheet
export interface TimesheetService {
  applyOvertimeSegments(ot: OvertimeRequestDocument): Promise<void>;
  revertOvertimeByRequest(otId: Types.ObjectId): Promise<void>;
}

// (tuỳ chọn) Calendar để suy ra kind (weekend/holiday)
export interface WorkingCalendarService {
  isHoliday(date: Date): Promise<boolean>;
  isWeekend(date: Date): boolean;
}

@Injectable()
export class OvertimeService {
  constructor(
    @InjectModel(OvertimeRequest.name)
    private readonly model: Model<OvertimeRequestDocument>,
    private readonly userAssignmentsService: UserAssignmentsService,
    private readonly organizationsService: OrganizationsService,
    // (tuỳ dự án) có thể bỏ @Optional() nếu chắc chắn inject
    @Optional() private readonly timesheet?: TimesheetService,
    @Optional() private readonly calendar?: WorkingCalendarService,
  ) {}

  // ============== CREATE ==============
  async create(dto: CreateOvertimeDto, actorId?: string) {
    const userId = new Types.ObjectId(dto.userId);
    this.validateSegmentsOrThrow(dto.segments);

    await this.assertNoExternalOverlap(userId, dto.segments);

    const segs = await this.computeSegments(dto.segments);
    const totalHours = segs.reduce((s, x: any) => s + (x.hours || 0), 0);

    const doc = await this.model.create({
      userId,
      compensation: dto.compensation,
      segments: segs as any,
      totalHours,
      status: OvertimeStatus.Pending,
      reason: dto.reason,
      attachmentIds: (dto.attachmentIds || []).map((id) => new Types.ObjectId(id)),
      createdBy: actorId ? new Types.ObjectId(actorId) : undefined,
      updatedBy: actorId ? new Types.ObjectId(actorId) : undefined,
    });

    return doc;
  }

  // ============== UPDATE ==============
  async update(id: string, dto: UpdateOvertimeDto, actorId?: string) {
    const doc = await this.model.findById(id);
    if (!doc) throw new NotFoundException('Không tìm thấy đơn tăng ca');

    if (doc.status !== OvertimeStatus.Pending) {
      throw new BadRequestException('Chỉ cập nhật khi đơn ở trạng thái pending');
    }

    if (dto.userId) doc.userId = new Types.ObjectId(dto.userId);
    if (dto.compensation) doc.compensation = dto.compensation;
    if (dto.reason !== undefined) doc.reason = dto.reason;
    if (dto.attachmentIds) {
      (doc.attachmentIds as any) = dto.attachmentIds.map((id) => new Types.ObjectId(id));
    }

    if (dto.segments && dto.segments.length > 0) {
      this.validateSegmentsOrThrow(dto.segments);
      await this.assertNoExternalOverlap(doc.userId as Types.ObjectId, dto.segments, doc._id);
      const segs = await this.computeSegments(dto.segments);
      doc.segments = segs as any;
      doc.totalHours = segs.reduce((s, x: any) => s + (x.hours || 0), 0);
    }

    if (actorId) doc.updatedBy = new Types.ObjectId(actorId);
    return doc.save();
  }

  // ============== REVIEW ==============
  async review(id: string, body: ReviewOvertimeDto, reviewerId: string) {
    const { action, note } = body;
    const doc = await this.model.findById(id);
    if (!doc) throw new NotFoundException('Không tìm thấy đơn tăng ca');

    if (action === 'approve' || action === 'reject') {
      if (doc.status !== OvertimeStatus.Pending) {
        throw new BadRequestException('Chỉ duyệt/từ chối đơn đang pending');
      }
    }
    if (action === 'cancel') {
      if (![OvertimeStatus.Pending, OvertimeStatus.Approved].includes(doc.status)) {
        throw new BadRequestException('Chỉ huỷ đơn pending/approved');
      }
    }

    doc.reviewerId = reviewerId ? new Types.ObjectId(reviewerId) : undefined;
    doc.reviewedAt = new Date();
    doc.reviewNote = note ?? doc.reviewNote;

    if (action === 'approve') doc.status = OvertimeStatus.Approved;
    if (action === 'reject') doc.status = OvertimeStatus.Rejected;
    if (action === 'cancel') doc.status = OvertimeStatus.Cancelled;

    const saved = await doc.save();

    // Timesheet hook
    try {
      if (this.timesheet) {
        if (action === 'approve')      await this.timesheet.applyOvertimeSegments(saved);
        else if (action === 'cancel')  await this.timesheet.revertOvertimeByRequest(saved._id);
      }
    } catch {
      // log nếu cần
    }

    return saved;
  }

  // ============== READ ==============
  async findById(id: string) {
    const doc = await this.model
      .findById(id)
      .populate('userId', 'fullName email')
      .populate('reviewerId', 'fullName email')
      .populate('attachmentIds', 'fileName url size')
      .lean();
    if (!doc) throw new NotFoundException('Không tìm thấy đơn tăng ca');
    return doc;
  }

  async query(q: QueryOvertimeDto, userId: string, roles: any[]) {
    const filter: FilterQuery<OvertimeRequest> = {};
    if (q.userId) filter.userId = new Types.ObjectId(q.userId);
    if (q.reviewerId) filter.reviewerId = new Types.ObjectId(q.reviewerId);
    if (q.status) filter.status = q.status as any;
    if (q.compensation) filter.compensation = q.compensation as CompensationType;

    if (q.kind) {
      filter['segments.kind'] = q.kind as OvertimeKind;
    }

    if (q.from || q.to) {
      const or: any[] = [{
        'segments.endAt': { ...(q.from ? { $gte: q.from } : {}) },
        'segments.startAt': { ...(q.to ? { $lte: q.to } : {}) },
      }];
      filter.$or = or;
    }

    if (q.q?.trim()) {
      filter.reason = { $regex: q.q.trim(), $options: 'i' };
    }

    let sort: any = {};
    switch (q.sort) {
      case 'createdAsc':  sort = { createdAt: 1 }; break;
      case 'createdDesc': sort = { createdAt: -1 }; break;
      case 'updatedAsc':  sort = { updatedAt: 1 }; break;
      case 'updatedDesc': sort = { updatedAt: -1 }; break;
      case 'startAsc':    sort = { 'segments.startAt': 1 }; break;
      case 'startDesc':   sort = { 'segments.startAt': -1 }; break;
      default:            sort = { createdAt: -1 };
    }

    const page = Math.max(1, Number(q.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(q.limit ?? 20)));

    const moduleNames = ['All', 'OverTime'];

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
      const [items, total] = await Promise.all([
      this.model.find(filter).sort(sort).skip((page-1)*limit).limit(limit).lean(),
      this.model.countDocuments(filter),
    ]);

    return { items, total, page, limit };
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
      const [items, total] = await Promise.all([
      this.model.find(filter).sort(sort).skip((page-1)*limit).limit(limit).lean(),
      this.model.countDocuments(filter),
    ]);
      return { items, total, page, limit };
    }

    // 3. Kiểm tra quyền "viewOwner"
    if (hasPermission('viewOwner')) {
      // Chỉ có quyền viewOwner => chỉ get của chính mình
      filter.userId = new Types.ObjectId(userId);
     const [items, total] = await Promise.all([
      this.model.find(filter).sort(sort).skip((page-1)*limit).limit(limit).lean(),
      this.model.countDocuments(filter),
    ]);

    return { items, total, page, limit };
    }

    // Nếu không có quyền nào thì trả về rỗng
    return [];    
  }

  // ============== PRIVATE ==============

  private validateSegmentsOrThrow(segments: Array<{startAt: any; endAt: any;}>) {
    if (!Array.isArray(segments) || segments.length === 0) {
      throw new BadRequestException('segments là mảng và không rỗng');
    }
    for (const s of segments) {
      const a = new Date(s.startAt);
      const b = new Date(s.endAt);
      if (!(b > a)) throw new BadRequestException('endAt phải > startAt');
      // policy: tối thiểu 30 phút?
      // if ((+b - +a) < 30 * 60 * 1000) throw new BadRequestException('Tối thiểu 0.5 giờ');
    }

    // chống chồng lấn nội bộ
    const ivs = segments
      .map(s => ({ start: +new Date(s.startAt), end: +new Date(s.endAt) }))
      .sort((x,y)=>x.start - y.start);
    for (let i = 0; i < ivs.length - 1; i++) {
      if (ivs[i+1].start < ivs[i].end) {
        throw new BadRequestException('Các khoảng tăng ca bị chồng lấn trong cùng đơn');
      }
    }
  }

  private async assertNoExternalOverlap(
    userId: Types.ObjectId,
    segments: Array<{startAt: any; endAt: any;}>,
    excludeId?: Types.ObjectId,
  ) {
    const minStart = new Date(Math.min(...segments.map(s => +new Date(s.startAt))));
    const maxEnd   = new Date(Math.max(...segments.map(s => +new Date(s.endAt))));

    const q: FilterQuery<OvertimeRequest> = {
      userId,
      status: { $in: [OvertimeStatus.Pending, OvertimeStatus.Approved] as any },
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
      $or: [{
        'segments.endAt':   { $gte: minStart },
        'segments.startAt': { $lte: maxEnd },
      }],
    };

    const conflict = await this.model.findOne(q).lean();
    if (conflict) {
      throw new BadRequestException('Khoảng tăng ca chồng lấn với đơn khác');
    }
  }

  private async computeSegments<T extends { startAt: any; endAt: any; kind?: OvertimeKind }>(
    segments: T[],
  ): Promise<(T & { hours: number; kind?: OvertimeKind })[]> {
    const out: (T & { hours: number; kind?: OvertimeKind })[] = [];
    for (const s of segments) {
      const start = new Date(s.startAt);
      const end = new Date(s.endAt);
      const hours = Math.max(0, (+end - +start) / 3_600_000);

      let kind: OvertimeKind | undefined = s.kind;
      if (!kind && this.calendar) {
        // Nếu start & end trong cùng ngày — dùng ngày của start để xác định kind
        const d = new Date(start);
        if (await this.calendar.isHoliday?.(d)) kind = OvertimeKind.Holiday;
        else if (this.calendar.isWeekend?.(d)) kind = OvertimeKind.Weekend;
        else kind = OvertimeKind.Weekday;
      }

      out.push({ ...s, hours, ...(kind ? { kind } : {}) });
    }
    return out;
  }
}
