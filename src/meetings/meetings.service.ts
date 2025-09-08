import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { Meeting, MeetingDocument } from './schemas/meeting.schema';
import { MeetingRoom, MeetingRoomDocument } from '../meeting-rooms/schemas/meeting-room.schema';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { ApproveMeetingDto } from './dto/approve-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { MeetingStatus } from './common/meeting-status.enum';
import { AvailabilityService } from './availability.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/common/notification.enum';
import { Notification } from '../notifications/schemas/notification.schema';

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d: Date)   { const x = new Date(d); x.setHours(23,59,59,999); return x; }
function startOfDayLocal(date: Date) { const d = new Date(date); d.setHours(0,0,0,0); return d; }
function endOfDayLocal(date: Date)   { const d = new Date(date); d.setHours(23,59,59,999); return d; }

@Injectable()
export class MeetingsService {
  constructor(
    @InjectModel(Meeting.name)     private readonly meetingModel: Model<MeetingDocument>,
    @InjectModel(MeetingRoom.name) private readonly roomModel: Model<MeetingRoomDocument>,
    @InjectModel(Notification.name) private readonly notificationModel: Model<Notification>,
    @InjectConnection()            private readonly connection: Connection,
    private readonly availability: AvailabilityService,
    private readonly notif: NotificationsService,
  ) {}

  private ensureDates(startAt: Date, endAt: Date) {
    if (isNaN(startAt.getTime())) throw new BadRequestException('Invalid startAt');
    if (isNaN(endAt.getTime()))   throw new BadRequestException('Invalid endAt');
    if (endAt <= startAt)         throw new BadRequestException('endAt must be after startAt');
  }

  private sumHeadcount(externalGuests?: { headcount?: number }[]) {
    return (externalGuests ?? []).reduce((s, g) => s + (g.headcount ?? 0), 0);
  }

  private pickOrganizer(participants: { userId: Types.ObjectId; role?: string }[], fallbackUserId: string) {
    const chair = participants.find(p => p.role === 'CHAIR');
    return chair?.userId ?? new Types.ObjectId(fallbackUserId);
  }
  

  async create(dto: CreateMeetingDto, userId: string) {    

    const startAt = new Date(dto.startAt);
    const endAt   = new Date(dto.endAt);
    this.ensureDates(startAt, endAt);

    const room = await this.roomModel.findOne({
      _id: new Types.ObjectId(dto.roomId),     
      isActive: true,
    }).lean();
    if (!room) throw new NotFoundException('Room not found or inactive');
    

    const requiresApproval = dto.requiresApproval ?? !!room.requiresApproval;

    const conflict = await this.availability.hasConflict(
      new Types.ObjectId(dto.roomId), startAt, endAt
    );
    if (conflict) throw new BadRequestException('Đã có cuộc họp (xin hoặc đã cho phép họp) trong khung thời gian này');

    // Map internal participants (dedupe)
    const seenUsers = new Set<string>();
    const participants = (dto.participants || []).map(p => {
      const uid = String(p.userId);
      if (seenUsers.has(uid)) throw new BadRequestException('Duplicate internal participant');
      seenUsers.add(uid);
      return {
        userId: new Types.ObjectId(p.userId),
        role: p.role ?? 'REQUIRED',
        response: 'INVITED',
        note: p.note,
      };
    });

    const externalGuests = (dto.externalGuests || []).map(g => ({
      leaderName: g.leaderName, leaderPhone: g.leaderPhone,
      organization: g.organization, note: g.note,
      headcount: g.headcount ?? 0,
    }));
    const externalHeadcount = this.sumHeadcount(externalGuests);

    // Capacity check: REQUIRED+CHAIR internal + all guests
    const requiredInternal = participants.filter(p => p.role !== 'OPTIONAL').length;
    const totalPeople = requiredInternal + externalHeadcount;
    if (room.capacity && totalPeople > room.capacity) {
      throw new BadRequestException(`Room capacity exceeded: ${totalPeople}/${room.capacity}`);
    }

    const organizerId = this.pickOrganizer(participants as any, userId);

    const doc = await this.meetingModel.create({
      organizationId: new Types.ObjectId(dto.organizationId),
      createdBy:      new Types.ObjectId(userId), // TODO: thay bằng req.user._id
      organizerId,
      roomId:         new Types.ObjectId(dto.roomId),
      title:          dto.title,
      agenda:         dto.agenda,
      note:           undefined,
      startAt,
      endAt,
      participants,
      externalGuests,
      externalHeadcount,
      status: requiresApproval ? MeetingStatus.PENDING_APPROVAL : MeetingStatus.SCHEDULED,
      requiresApproval,
    });

    return doc.toObject();
  }

  private async afterApproved(meeting: any) {
    // Gửi thông báo cho nội bộ participants
    const internals = (meeting.participants || []).filter(p => !!p.userId);
    await this.notif.createMany(internals.map(p => ({
      userId: p.userId,
      meetingId: meeting._id,
      type: NotificationType.MEETING_APPROVED,
      title: `Đã duyệt: ${meeting.title}`,
      message: `Thời gian: ${new Date(meeting.startAt).toLocaleString()} → ${new Date(meeting.endAt).toLocaleString()}`,
      meta: { startAt: meeting.startAt, endAt: meeting.endAt, roomId: meeting.roomId },
    })));
  }

  async approve(meetingId: string, dto: ApproveMeetingDto, userId: string) {
  const session = await this.connection.startSession();
  try {
    return await session.withTransaction(async () => {
      const meeting = await this.meetingModel.findById(meetingId).session(session);
      if (!meeting) throw new NotFoundException('Meeting not found');
      if (meeting.status !== MeetingStatus.PENDING_APPROVAL)
        throw new BadRequestException('Meeting is not pending approval');

      const room = await this.roomModel.findById(meeting.roomId).session(session);
      if (!room) throw new NotFoundException('Room not found');

      if (dto.decision === 'APPROVED') {
        // Lấy roomId an toàn
        const roomId =
          meeting.roomId instanceof Types.ObjectId
            ? meeting.roomId
            : (meeting.roomId as any)._id;

        const again = await this.availability.hasConflict(
          roomId,
          meeting.startAt,
          meeting.endAt,
          meeting._id as Types.ObjectId,
        );
        if (again) throw new BadRequestException('Time conflict at approval');

        meeting.status = MeetingStatus.SCHEDULED;
      } else {
        meeting.status = MeetingStatus.REJECTED;
      }

      meeting.approvals.push({
        by: new Types.ObjectId(userId), // TODO: thay bằng req.user._id
        decision: dto.decision,
        at: new Date(),
        note: dto.note,
      });

      await meeting.save({ session });

      // === NEW: tạo thông báo cho participants khi APPROVED ===
      if (meeting.status === MeetingStatus.SCHEDULED) {
        const internals = (meeting.participants || []).filter((p: any) => !!p.userId);
        if (internals.length > 0) {
          const docs = internals.map((p: any) => ({
            userId: new Types.ObjectId(p.userId),
            meetingId: meeting._id,
            type: NotificationType.MEETING_APPROVED,
            title: `Đã duyệt: ${meeting.title}`,
            message: `Thời gian: ${new Date(meeting.startAt).toLocaleString()} → ${new Date(
              meeting.endAt,
            ).toLocaleString()} · Phòng: ${room.name || String(room._id)}`,
            meta: {
              startAt: meeting.startAt,
              endAt: meeting.endAt,
              roomId: meeting.roomId,
            },
            status: 'UNREAD',
          }));

          // chèn trong cùng session/transaction
          await this.notificationModel.insertMany(docs, { session });
        }
      }
      // === END NEW ===

      return meeting.toObject();
    });
  } finally {
    session.endSession();
  }
}


  // PATCH /meetings/:id
  async update(meetingId: string, dto: UpdateMeetingDto) {
    const meeting = await this.meetingModel.findById(meetingId);
    if (!meeting) throw new NotFoundException('Meeting not found');

    const now = new Date();
    const hasStarted = now >= meeting.startAt && now < meeting.endAt;
   const isEnded = meeting.status === MeetingStatus.COMPLETED
             || (meeting.status === MeetingStatus.SCHEDULED && now > meeting.endAt);

    // 1) ĐÃ KẾT THÚC: chỉ cho sửa "note"
    if (isEnded) {
      const keys = Object.keys(dto);
      const allowed = ['note'];
      if (keys.some(k => !allowed.includes(k))) {
        throw new BadRequestException('Meeting has ended; only "note" can be updated');
      }
      meeting.note = dto.note ?? meeting.note;
      await meeting.save();
      return meeting.toObject();
    }

    // 2) ĐANG DIỄN RA: chỉ cho sửa endAt (không trùng với meetings SCHEDULED khác)
    if (hasStarted) {
      const keys = Object.keys(dto);
      const allowed = ['endAt'];
      if (keys.some(k => !allowed.includes(k))) {
        throw new BadRequestException('Meeting in progress; only "endAt" can be updated');
      }
      if (!dto.endAt) throw new BadRequestException('endAt is required to update during meeting');

      const newEnd = new Date(dto.endAt);
      this.ensureDates(meeting.startAt, newEnd);
      const roomId = meeting.roomId instanceof Types.ObjectId
            ? meeting.roomId
            : (meeting.roomId as any)._id;

      const conflict = await this.availability.hasConflict(
        meeting.roomId as any,
        meeting.startAt,
        newEnd,
        meeting._id as Types.ObjectId,
        [MeetingStatus.SCHEDULED], // chỉ so với approved khác
      );
      if (conflict) throw new BadRequestException('Time conflict with other approved meetings');

      meeting.endAt = newEnd;
      await meeting.save();
      return meeting.toObject();
    }

    // 3) CHƯA BẮT ĐẦU:
    // - Nếu PENDING_APPROVAL: cho sửa tự do (title, agenda, note, thời gian, phòng, participants, externalGuests...)
    // - Nếu SCHEDULED: cho sửa tương tự (sau này bạn gắn guard quyền cao hơn); nhưng phải kiểm tra xung đột & capacity lại.
    // Map các thay đổi
    if (dto.title !== undefined) meeting.title = dto.title;
    if (dto.agenda !== undefined) meeting.agenda = dto.agenda;
    if (dto.note !== undefined) meeting.note = dto.note;

    // Có thể đổi phòng/thời gian
    if (dto.startAt !== undefined) meeting.startAt = new Date(dto.startAt);
    if (dto.endAt   !== undefined) meeting.endAt   = new Date(dto.endAt);
    this.ensureDates(meeting.startAt, meeting.endAt);

    if (dto.roomId !== undefined) meeting.roomId = new Types.ObjectId(dto.roomId);

    // participants/externalGuests có thể sửa trước giờ bắt đầu
    if (dto.participants !== undefined) {
      const seen = new Set<string>();
      meeting.participants = dto.participants.map(p => {
        const uid = String(p.userId);
        if (seen.has(uid)) throw new BadRequestException('Duplicate internal participant');
        seen.add(uid);
        return {
          userId: new Types.ObjectId(p.userId),
          role: p.role ?? 'REQUIRED',
          response: 'INVITED',
          note: p.note,
        } as any;
      });
      // Organizer re-pick nếu cần
      meeting.organizerId = this.pickOrganizer(meeting.participants as any, String(meeting.createdBy));
    }

    if (dto.externalGuests !== undefined) {
      meeting.externalGuests = (dto.externalGuests || []).map(g => ({
        leaderName: g.leaderName,
        leaderPhone: g.leaderPhone,
        organization: g.organization,
        note: g.note,
        headcount: g.headcount ?? 0,
      })) as any;
      meeting.externalHeadcount = this.sumHeadcount(meeting.externalGuests);
    } else {
      // giữ nguyên tổng
      meeting.externalHeadcount = this.sumHeadcount(meeting.externalGuests);
    }

    // Reload room để check capacity nếu có đổi roomId hoặc participants/externalGuests
    const room = await this.roomModel.findById(meeting.roomId).lean();
    if (!room || !room.isActive) throw new NotFoundException('Room not found or inactive');
    const roomId = meeting.roomId instanceof Types.ObjectId
            ? meeting.roomId
            : (meeting.roomId as any)._id;

    // Conflict trước giờ bắt đầu: check với PENDING_APPROVAL & SCHEDULED (trừ chính nó)
    const conflict = await this.availability.hasConflict(
      meeting.roomId as any, meeting.startAt, meeting.endAt, meeting._id as Types.ObjectId
    );
    if (conflict) throw new BadRequestException('Time conflict in this room');

    // Capacity check lại
    const requiredInternal = (meeting.participants || []).filter(p => p.role !== 'OPTIONAL').length;
    const totalPeople = requiredInternal + (meeting.externalHeadcount || 0);
    if (room.capacity && totalPeople > room.capacity) {
      throw new BadRequestException(`Room capacity exceeded: ${totalPeople}/${room.capacity}`);
    }

    await meeting.save();
    return meeting.toObject();
  }

  // DELETE /meetings/:id
  async remove(meetingId: string) {
    const meeting = await this.meetingModel.findById(meetingId);
    if (!meeting) throw new NotFoundException('Meeting not found');

    const now = new Date();
    // Cho xóa nếu:
    // - PENDING_APPROVAL (bất kể thời gian)
    // - hoặc SCHEDULED nhưng còn trước giờ bắt đầu (sau này bạn gắn guard quyền cao hơn ở controller)
    if (meeting.status === MeetingStatus.PENDING_APPROVAL) {
      await meeting.deleteOne();
      return { deleted: true };
    }
    if (meeting.status === MeetingStatus.SCHEDULED && now < meeting.startAt) {
      await meeting.deleteOne();
      return { deleted: true };
    }

    throw new BadRequestException('Cannot delete: meeting has started or ended or not in deletable state');
  }

  // POST /meetings/:id/cancel
  async cancel(meetingId: string, actorId: string) {
    const meeting = await this.meetingModel.findById(meetingId);
    if (!meeting) throw new NotFoundException('Meeting not found');

    const now = new Date();
    // Chỉ cho cancel khi chưa bắt đầu (pending hoặc scheduled)
    if (now >= meeting.startAt) {
      throw new BadRequestException('Cannot cancel after meeting has started');
    }
    if (![MeetingStatus.PENDING_APPROVAL, MeetingStatus.SCHEDULED].includes(meeting.status)) {
      throw new BadRequestException('Only pending/scheduled meeting can be cancelled');
    }

    meeting.status = MeetingStatus.CANCELLED;
    meeting.cancelledAt = now;
    meeting.cancelledBy = new Types.ObjectId(actorId);
    await meeting.save();
    return meeting.toObject();
  }

  async findOne(id: string) {
    const m = await this.meetingModel.findById(id).lean();
    if (!m) throw new NotFoundException('Meeting not found');
    return m;
  }

  async list(params: {
    organizationId?: string;
    roomId?: string;
    from?: string;
    to?: string;
    status?: MeetingStatus;
    participantId?: string;
    organizerId?: string;         // <-- thêm
  }) {
    const q: any = {};
    if (params.organizationId) q.organizationId = new Types.ObjectId(params.organizationId);
    if (params.roomId)         q.roomId         = new Types.ObjectId(params.roomId);
    if (params.status)         q.status         = params.status;
    if (params.from)           (q.endAt   = { ...(q.endAt || {}),   $gt: new Date(params.from) });
    if (params.to)             (q.startAt = { ...(q.startAt || {}), $lt: new Date(params.to)   });
    if (params.participantId)  q['participants.userId'] = new Types.ObjectId(params.participantId);
    if (params.organizerId)    q.organizerId    = new Types.ObjectId(params.organizerId); // <-- thêm

    return this.meetingModel.find(q).sort({ startAt: 1 }).lean();
  }

  async rsvp(id: string, userId: string, response: 'ACCEPTED'|'DECLINED', note?: string) {
    const _id = new Types.ObjectId(id);
    const uid = new Types.ObjectId(userId);

    const meeting = await this.meetingModel.findById(_id);
    if (!meeting) throw new Error('Meeting not found');

    if ([MeetingStatus.CANCELLED, MeetingStatus.REJECTED, MeetingStatus.COMPLETED].includes(meeting.status as any)) {
      throw new Error('Không thể RSVP cho cuộc họp đã huỷ/từ chối/hoàn tất');
    }

    const p = (meeting.participants || []).find((x: any) => new Types.ObjectId(x.userId).equals(uid));
    if (!p) throw new Error('Bạn không nằm trong danh sách tham gia');

    p.response = response;
    if (note !== undefined) p.note = note;

    await meeting.save();

    // Đánh dấu các notify RSVP_REQUEST của user này cho meeting này là READ
    await this.notificationModel.updateMany(
      { userId: uid, meetingId: _id, type: NotificationType.MEETING_RSVP_REQUEST, status: 'UNREAD' },
      { $set: { status: 'READ' } },
    );

    return { ok: true };
  }

  // --- C) Danh sách meeting cần RSVP cho người dùng hiện tại ---

  // helpers: đầu/cuối ngày theo múi giờ server. Nếu bạn chạy server ở VN thì OK.
// Nếu muốn chuẩn tz, truyền ?date=YYYY-MM-DD từ FE rồi tính ranh ngày theo Asia/Ho_Chi_Minh.


async listTodaysForUser(
  userId: string,
  opts?: { date?: Date; acceptedOnly?: boolean; limit?: number }
) {
  const uid = new Types.ObjectId(userId);
  const date = opts?.date ?? new Date();
  const from = startOfDayLocal(date);
  const to   = endOfDayLocal(date);
  const acceptedOnly = opts?.acceptedOnly ?? true;
  const limit = Math.min(Math.max(opts?.limit ?? 100, 1), 500);

  const participantsMatch: any = {
    userId: uid,
    role: { $in: ['CHAIR', 'REQUIRED', 'OPTIONAL'] },
  };
  if (acceptedOnly) participantsMatch.response = 'ACCEPTED';

  const filter: any = {
    status: { $in: [MeetingStatus.SCHEDULED, MeetingStatus.IN_PROGRESS] },
    startAt: { $gte: from, $lte: to },
    participants: { $elemMatch: participantsMatch },
  };

  return this.meetingModel
    .find(filter, { title: 1, startAt: 1, endAt: 1, roomId: 1, organizerId: 1 })
    .sort({ startAt: 1 })
    .limit(limit)
    .lean();
}

async listPendingRsvpForUser(
  userId: string,
  from?: Date,
  to?: Date,
  limit = 100,
) {
  const uid = new Types.ObjectId(userId);
  const filter: any = {
    status: { $in: [MeetingStatus.SCHEDULED, MeetingStatus.IN_PROGRESS] },
    participants: {
      $elemMatch: {
        userId: uid,
        role: { $in: ['CHAIR', 'REQUIRED', 'OPTIONAL'] },
        $or: [{ response: { $exists: false } }, { response: null },  { response: 'PENDING' }, { response: 'INVITED' }],
      },
    },
  };
  if (from || to) {
    filter.startAt = {};
    if (from) filter.startAt.$gte = from;
    if (to) filter.startAt.$lte = to;
  }

  return this.meetingModel
    .find(filter, { title: 1, startAt: 1, endAt: 1, roomId: 1, organizerId: 1, participants: 1 })
    .sort({ startAt: 1 })
    .limit(Math.min(Math.max(limit, 1), 500))
    .lean();
}
  
}

