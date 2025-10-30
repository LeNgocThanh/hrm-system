// src/shift-types/shift-types.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { ShiftType, ShiftTypeDocument } from './schemas/shift-type.schema';
import { CreateShiftTypeDto } from './dto/create-shift-type.dto';
import { UpdateShiftTypeDto } from './dto/update-shift-type.dto';

@Injectable()
export class ShiftTypesService {
  constructor(
    @InjectModel(ShiftType.name)
    private readonly model: Model<ShiftTypeDocument>,
  ) {}

  async create(dto: CreateShiftTypeDto) {
    try {
      const doc = await this.model.create({
        code: dto.code,
        name: dto.name,
        timezone: dto.timezone ?? 'Asia/Bangkok',
        isCheckTwoTimes : dto.isCheckTwoTimes ?? false,
        weeklyRules: dto.weeklyRules,
      });
      return doc.toObject();
    } catch (e: any) {
      // duplicate code
      if (e?.code === 11000) {
        throw new Error(`ShiftType code "${dto.code}" đã tồn tại`);
      }
      throw e;
    }
  }

  async findAll(params: {
    q?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const page = Math.max(1, Number(params.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(params.limit ?? 20)));
    const skip = (page - 1) * limit;

    const filter: FilterQuery<ShiftTypeDocument> = {};
    if (params.q) {
      const q = String(params.q).trim();
      filter.$or = [
        { code: new RegExp(q, 'i') },
        { name: new RegExp(q, 'i') },
        { timezone: new RegExp(q, 'i') },
      ];
    }

    const [items, total] = await Promise.all([
      this.model.find(filter).sort({ code: 1 }).skip(skip).limit(limit).lean().exec(),
      this.model.countDocuments(filter),
    ]);

    return {
      items,
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findById(id: string) {
    const doc = await this.model.findById(id).lean();
    if (!doc) throw new NotFoundException('Không tìm thấy ShiftType');
    return doc;
  }

  async findByCode(code: string) {
    const doc = await this.model.findOne({ code }).lean();
    if (!doc) throw new NotFoundException('Không tìm thấy ShiftType');
    return doc;
  }

  async update(id: string, dto: UpdateShiftTypeDto) {
    // Lưu ý: nếu đổi "code" có thể đụng unique index
    const doc = await this.model.findByIdAndUpdate(
      id,
      {
        ...(dto.code ? { code: dto.code } : {}),
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.isCheckTwoTimes !== undefined ? { isCheckTwoTimes: dto.isCheckTwoTimes } : {}),
        ...(dto.timezone ? { timezone: dto.timezone } : {}),
        ...(dto.weeklyRules ? { weeklyRules: dto.weeklyRules as any } : {}),
      },
      { new: true, runValidators: true },
    ).lean();

    if (!doc) throw new NotFoundException('Không tìm thấy ShiftType để cập nhật');
    return doc;
  }

  async remove(id: string) {
    const res = await this.model.findByIdAndDelete(id).lean();
    if (!res) throw new NotFoundException('Không tìm thấy ShiftType để xoá');
    return { status: 'ok', id };
  }
}
