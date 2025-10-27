import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserTimeEntry, UserTimeEntryDocument } from './schemas/user-time-entries.schema';
import { CreateUserTimeEntryDto } from './dto/create-user-time-entries.dto';
import { UpdateUserTimeEntryDto } from './dto/update-user-time-entries.dto';
import { CheckConflictDto } from './dto/check-conflict-user-time-entries.dto';
import { QuerryUserTimeEntryDto } from './dto/querry-user-time-entry.dto';

@Injectable()
export class UserTimeEntriesService {
  constructor(
    @InjectModel(UserTimeEntry.name)
    private readonly userTimeEntryModel: Model<UserTimeEntryDocument>,
  ) {}

  // 🔹 Kiểm tra trùng thời gian
  async checkConflict(dto: CheckConflictDto): Promise<boolean> {
    const conflict = await this.userTimeEntryModel.exists({
      userId: dto.userId,
      _id: dto.refId ? { $ne: dto.refId } : { $exists: true },
      startAt: { $lt: dto.endAt },
      endAt: { $gt: dto.startAt },
    });
    return !!conflict;
  }

  // 🔹 Create
  async create(dto: CreateUserTimeEntryDto): Promise<UserTimeEntry> {
    const isConflict = await this.checkConflict(dto);
    if (isConflict) {
      throw new ConflictException('Time overlap detected');
    }
    const created = new this.userTimeEntryModel(dto);
    return created.save();
  }

  // 🔹 Find all
  async findAll(): Promise<UserTimeEntry[]> {
    return this.userTimeEntryModel.find().exec();
  }

  async findByUserAndTime(dto: QuerryUserTimeEntryDto): Promise<UserTimeEntry[]> {
    const query: any = {
      userId: dto.userId,
      // Logic kiểm tra khoảng thời gian giao nhau: Entry.startAt < Query.endAt VÀ Entry.endAt > Query.startAt
      startAt: { $lt: dto.endAt },
      endAt: { $gt: dto.startAt },
    };

    if (dto.type) {
      query.type = dto.type;
    }
    
    // Tìm và sắp xếp theo startAt
    return this.userTimeEntryModel.find(query).sort({ startAt: 1 }).exec();
  }

  // 🔹 Find by id
  async findOne(id: string): Promise<UserTimeEntry> {
    const found = await this.userTimeEntryModel.findById(id).exec();
    if (!found) {
      throw new NotFoundException(`UserTimeEntry ${id} not found`);
    }
    return found;
  }

  // 🔹 Update
  async update(id: string, dto: UpdateUserTimeEntryDto): Promise<UserTimeEntry> {
    const isConflict = await this.checkConflict({
  userId: dto.userId,
  refId: id,
  startAt: dto.startAt!,
  endAt: dto.endAt!,
});
    if (isConflict) {
      throw new ConflictException('Time overlap detected');
    }
    const updated = await this.userTimeEntryModel.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!updated) {
      throw new NotFoundException(`UserTimeEntry ${id} not found`);
    }
    return updated;
  }

  // 🔹 Delete
  async remove(id: string): Promise<void> {
    const deleted = await this.userTimeEntryModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`UserTimeEntry ${id} not found`);
    }
  }

  async removeByRefId(doc: UserTimeEntry): Promise<void> {
    const deleted = await this.userTimeEntryModel.findOneAndDelete({refId: doc.refId,
    startAt: doc.startAt,
    endAt: doc.endAt}).exec();
    if (!deleted) {
      throw new NotFoundException(`UserTimeEntry ${doc.refId, doc.startAt, doc.endAt} not found`);
    }
  }
}
