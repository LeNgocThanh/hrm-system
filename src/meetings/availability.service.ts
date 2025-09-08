import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Meeting, MeetingDocument } from './schemas/meeting.schema';
import { MeetingStatus } from './common/meeting-status.enum';

type ParticipantResponse = 'ACCEPTED' | 'DECLINED' | 'PENDING' | 'INVITED' | string;
type ParticipantRole = 'CHAIR' | 'REQUIRED' | 'OPTIONAL' | string;

export type ConflictSeverity = 'HIGH' | 'MEDIUM' | 'LOW';
export interface ParticipantConflictItem {
  meetingId: string;
  title: string;
  startAt: Date;
  endAt: Date;
  roomId: string;
  otherStatus: MeetingStatus | string;
  response?: ParticipantResponse;
  role?: ParticipantRole;
  severity: ConflictSeverity;
}
export interface ParticipantConflictByUser {
  userId: string;
  conflicts: ParticipantConflictItem[];
}
export interface ParticipantConflictResult {
  hasConflicts: boolean;
  summary: Record<ConflictSeverity, number>;
  byUser: ParticipantConflictByUser[];
}

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectModel(Meeting.name) private readonly meetingModel: Model<MeetingDocument>,
  ) {}

  // Kiểm tra xung đột khoảng thời gian trong 1 phòng
  async hasConflict(
    roomId: Types.ObjectId,
    startAt: Date,
    endAt: Date,
    excludeId?: Types.ObjectId,
    statuses: MeetingStatus[] = [MeetingStatus.PENDING_APPROVAL, MeetingStatus.SCHEDULED],
  ): Promise<boolean> {
    const q: any = {
      roomId,
      status: { $in: statuses },
      startAt: { $lt: endAt },
      endAt:   { $gt: startAt },
    };
    if (excludeId) q._id = { $ne: excludeId };
    const count = await this.meetingModel.countDocuments(q).exec();
    return count > 0;
  }

async findParticipantsConflicts(params: {
    participantIds: (string | Types.ObjectId)[];
    startAt: Date;
    endAt: Date;
    excludeMeetingId?: string | Types.ObjectId;
  }): Promise<ParticipantConflictResult> {
    const ids = (params.participantIds || [])
      .filter(Boolean)
      .map((x) => new Types.ObjectId(x as any));
    if (!ids.length) {
      return { hasConflicts: false, summary: { HIGH: 0, MEDIUM: 0, LOW: 0 }, byUser: [] };
    }

    const filter: any = {
      status: { $in: [MeetingStatus.SCHEDULED, MeetingStatus.IN_PROGRESS, MeetingStatus.PENDING_APPROVAL] },
      startAt: { $lt: params.endAt }, // A.start < B.end
      endAt:   { $gt: params.startAt }, // A.end   > B.start
      participants: {
        $elemMatch: {
          userId: { $in: ids },
          role: { $in: ['CHAIR', 'REQUIRED', 'OPTIONAL'] },
          $or: [
            { response: { $exists: false } },
            { response: null },
            { response: { $in: ['PENDING', 'INVITED', 'ACCEPTED'] } }, // DECLINED bỏ qua
          ],
        },
      },
    };
    if (params.excludeMeetingId) {
      filter._id = { $ne: new Types.ObjectId(params.excludeMeetingId) };
    }

    const others = await this.meetingModel.find(filter, {
      title: 1, startAt: 1, endAt: 1, roomId: 1, status: 1, participants: 1,
    }).lean();

    let high = 0, med = 0, low = 0;
    const byUserMap = new Map<string, ParticipantConflictItem[]>();

    for (const m of others) {
      for (const pid of ids) {
        const p = (m.participants || []).find((pp: any) => String(pp.userId) === String(pid));
        if (!p) continue;

        const severity = this.classifySeverity(m.status as any, p?.response);
        if (!severity) continue;

        const item: ParticipantConflictItem = {
          meetingId: String(m._id),
          title: m.title,
          startAt: m.startAt,
          endAt: m.endAt,
          roomId: String(m.roomId),
          otherStatus: m.status as any,
          response: p?.response,
          role: p?.role,
          severity,
        };

        const key = String(pid);
        if (!byUserMap.has(key)) byUserMap.set(key, []);
        byUserMap.get(key)!.push(item);

        if (severity === 'HIGH') high++;
        else if (severity === 'MEDIUM') med++;
        else low++;
      }
    }

    const byUser: ParticipantConflictByUser[] = Array.from(byUserMap.entries()).map(([userId, conflicts]) => ({
      userId,
      conflicts: conflicts.sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt)),
    }));

    return {
      hasConflicts: high + med + low > 0,
      summary: { HIGH: high, MEDIUM: med, LOW: low },
      byUser,
    };
  }

  private classifySeverity(otherStatus: MeetingStatus | string, response?: ParticipantResponse): ConflictSeverity | null {
    if ([MeetingStatus.CANCELLED, MeetingStatus.REJECTED, MeetingStatus.COMPLETED].includes(otherStatus as any)) {
      return null;
    }
    if ([MeetingStatus.SCHEDULED, MeetingStatus.IN_PROGRESS].includes(otherStatus as any)) {
      if (response === 'ACCEPTED') return 'HIGH';
      return 'MEDIUM'; // INVITED/PENDING/undefined
    }
    if (otherStatus === MeetingStatus.PENDING_APPROVAL) return 'LOW';
    return 'LOW';
  }
}

