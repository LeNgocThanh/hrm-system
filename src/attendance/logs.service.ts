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
async bulkCreateFromBody(items: Array<{ userId: string; timestamp: string }>) {
    const cleaned: Array<Partial<AttendanceLog>> = [];
    const invalidIdx: number[] = [];
    const seen = new Set<string>();

    items.forEach((it, idx) => {
      const userId = String(it?.userId ?? '').trim();
      const ts = new Date(it?.timestamp as any);
      if (!userId || isNaN(ts.getTime())) {
        invalidIdx.push(idx);
        return;
      }
      const key = `${userId}|${ts.toISOString()}`;
      if (seen.has(key)) return; // trùng trong payload
      seen.add(key);

      cleaned.push({
        userId,
        timestamp: ts,
        // nếu schema có 'source' => để mặc định 'manual'/'import' tuỳ bạn
        source: 'import',
      } as any);
    });

    if (cleaned.length === 0) {
      return {
        inserted: 0,
        invalid: invalidIdx.length,
        duplicatesInPayload: items.length - invalidIdx.length,
      };
    }

    try {
      const res = await this.logModel.insertMany(cleaned, { ordered: false });
      return {
        inserted: res.length,
        invalid: invalidIdx.length,
        duplicatesInPayload: items.length - invalidIdx.length - res.length,
      };
    } catch (e: any) {      
      const writeErrors = Array.isArray(e?.writeErrors) ? e.writeErrors : [];
      const dupInDb = writeErrors.filter((w: any) => w?.code === 11000).length;
      const inserted = e?.result?.nInserted ?? 0;
      return {
        inserted,
        invalid: invalidIdx.length,
        duplicatesInDb: dupInDb,
      };
    }
  }

}
