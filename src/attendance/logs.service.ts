import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AttendanceLog } from './schemas/attendance-log.schema';
import { CreateLogDto } from './dto/create-log.dto';
import * as XLSX from 'xlsx';

@Injectable()
export class LogsService {
  constructor(
    @InjectModel(AttendanceLog.name) private logModel: Model<AttendanceLog>,
  ) {}

  async create(dto: CreateLogDto): Promise<AttendanceLog> {
    const created = new this.logModel(dto);
    return created.save();
  }

  async findAll(): Promise<AttendanceLog[]> {
    return this.logModel.find().sort({ timestamp: 1 }).exec();
  }

  async findByUser(userId: string): Promise<AttendanceLog[]> {
    return this.logModel.find({ userId }).sort({ timestamp: 1 }).exec();
  }

  async findByDateRange(userId: string, from: Date, to: Date): Promise<AttendanceLog[]> {
    return this.logModel.find({
      userId,
      timestamp: { $gte: from, $lte: to },
    }).exec();
  }

  async findDistinctUserIds(from: Date, to: Date): Promise<string[]> {
    return this.logModel
      .distinct('userId', {
        timestamp: { $gte: from, $lte: to },
      })
      .exec();
  }

  async findByOnlyDateRange(from: string, to: string): Promise<AttendanceLog[]> {
    return this.logModel
      .find({
        timestamp: {
          $gte: new Date(from),
          $lte: new Date(to),
        },
      })
      .sort({ timestamp: -1 })
      .exec();
  }
  
  async importFromFile(file: Express.Multer.File) {
  const workbook = XLSX.read(file.buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet);

  const docs = rows.map(r => ({
    userId: r['userId'],
    timestamp: new Date(r['timestamp']),
    source: r['source'] ?? 'manual',
  }));

  return this.logModel.insertMany(docs);
}
}
