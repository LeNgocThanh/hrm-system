import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Holiday, HolidayDocument } from './schemas/holiday-exception.schema';
import { QueryHolidaysDto, UpsertHolidayDto } from './dto/holiday.dto';


@Injectable()
export class HolidayService {
constructor(@InjectModel(Holiday.name) private readonly model: Model<HolidayDocument>) {}


async list(q: QueryHolidaysDto) {
const filter: FilterQuery<HolidayDocument> = {};
if (q.from || q.to) filter.dateKey = {} as any;
if (q.from) (filter.dateKey as any).$gte = q.from;
if (q.to) (filter.dateKey as any).$lte = q.to;
return this.model.find(filter).sort({ dateKey: 1 }).lean();
}

//find date 
async findEffective( dateKey: string) {
return this.model.findOne({ dateKey }).lean();
}


async upsert(dto: UpsertHolidayDto, createdBy: string) {
const key = { dateKey: dto.dateKey };
const update = { name: dto.name, isPaid: dto.isPaid ?? true, note: dto.note, createdBy };
return this.model.findOneAndUpdate(key, update, { new: true, upsert: true, setDefaultsOnInsert: true });
}


async remove(id: string) {
return this.model.findByIdAndDelete(id);
}
}