import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MeetingRoom, MeetingRoomDocument } from './schemas/meeting-room.schema';
import { CreateMeetingRoomDto } from './dto/create-meeting-room.dto';
import { UpdateMeetingRoomDto } from './dto/update-meeting-room.dto';

@Injectable()
export class MeetingRoomsService {
  constructor(
    @InjectModel(MeetingRoom.name) private readonly roomModel: Model<MeetingRoomDocument>,
  ) {}

  async create(data: CreateMeetingRoomDto) {
    const doc = await this.roomModel.create({
      organizationId: new Types.ObjectId(data.organizationId),
      name: data.name,
      location: data.location,
      capacity: (data.capacity ?? 4),
      equipment: data.equipment ?? [],
      requiresApproval: (data.requiresApproval ?? true),
      managers: (data.managers ?? []).map(id => new Types.ObjectId(id)),
    });
    return doc.toObject();
  }

  async update(id: string, patch: UpdateMeetingRoomDto) {
    const room = await this.roomModel.findById(id);
    if (!room) throw new NotFoundException('Room not found');

    if (patch.capacity !== undefined && patch.capacity < 1) {
      throw new BadRequestException('Capacity must be >= 1');
    }

    // Map managers nếu có
    const mappedManagers =
      patch.managers ? patch.managers.map(x => new Types.ObjectId(x)) : undefined;

    Object.assign(room, {
      ...patch,
      ...(mappedManagers ? { managers: mappedManagers } : {}),
    });

    await room.save();
    return room.toObject();
  }

  async getOne(id: string) {
    const room = await this.roomModel.findById(id).lean();
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  async list(organizationId?: string) {
    const q: any = {};
    if (organizationId) q.organizationId = new Types.ObjectId(organizationId);
    return this.roomModel.find(q).sort({ name: 1 }).lean();
  }
}
