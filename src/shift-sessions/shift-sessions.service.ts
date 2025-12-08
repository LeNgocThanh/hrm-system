// src/attendance/shift-session.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ShiftSessionNew,
  ShiftSessionDocument,
} from './schemas/shift-session.schema';
import { CreateShiftSessionDto } from './dto/create-shift-session.dto';
import { UpdateShiftSessionDto } from './dto/update-shift-session.dto';

@Injectable()
export class ShiftSessionService {
  constructor(
    @InjectModel(ShiftSessionNew.name)
    private readonly shiftSessionModel: Model<ShiftSessionDocument>,
  ) {}

  async create(dto: CreateShiftSessionDto): Promise<ShiftSessionNew> {   
    const created = await this.shiftSessionModel.create(dto);    
    return created.toObject();
  }

  async findAll(): Promise<ShiftSessionNew[]> {
    return this.shiftSessionModel.find().sort({ code: 1 }).exec();
  }

  async findOneByCode(code: string): Promise<ShiftSessionNew> {
    const doc = await this.shiftSessionModel.findOne({ code }).exec();
    if (!doc) throw new NotFoundException(`ShiftSession ${code} not found`);
    return doc;
  }

  async update(code: string, dto: UpdateShiftSessionDto): Promise<ShiftSessionNew> {
    const updated = await this.shiftSessionModel
      .findOneAndUpdate({ code }, dto, { new: true })
      .exec();
    if (!updated) throw new NotFoundException(`ShiftSession ${code} not found`);
    return updated;
  }

  async remove(code: string): Promise<void> {
    const res = await this.shiftSessionModel.deleteOne({ code }).exec();
    if (res.deletedCount === 0) {
      throw new NotFoundException(`ShiftSession ${code} not found`);
    }
  }
}
