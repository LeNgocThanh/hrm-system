import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AttendanceDaily } from './schemas/attendance-daily.schema';
import { AttendanceLog } from './schemas/attendance-log.schema';
import { UpdateDailyDto } from './dto/update-daily.dto';
import { WorkShiftType, SHIFT_CONFIG } from './common/work-shift-type.enum';

function dayWindow(dateStr: string) {
  const d0 = new Date(dateStr); // kỳ vọng 'YYYY-MM-DD'
  const start = new Date(d0); start.setHours(0,0,0,0);
  const end   = new Date(d0); end.setHours(23,59,59,999);
  return { start, end };
}

@Injectable()
export class DailyService {
  constructor(
    @InjectModel(AttendanceDaily.name) private dailyModel: Model<AttendanceDaily>,
    @InjectModel(AttendanceLog.name) private logModel: Model<AttendanceLog>,
  ) {}

  // === CRUD cơ bản ===
  async upsert(userId: string, workDate: string, update: UpdateDailyDto): Promise<AttendanceDaily> {
  const shiftType = WorkShiftType.REGULAR; 
  const config = SHIFT_CONFIG[shiftType];

  let workedMinutes = update.workedMinutes ?? 0;
  let lateMinutes = update.lateMinutes ?? 0;
  let earlyLeaveMinutes = update.earlyLeaveMinutes ?? 0;

  if (update.checkIn && update.checkOut) {
    const standardIn = new Date(workDate);
    standardIn.setHours(+config.start.split(':')[0], +config.start.split(':')[1]);

    const standardOut = new Date(workDate);
    standardOut.setHours(+config.end.split(':')[0], +config.end.split(':')[1]);
    const checkIn = new Date(update.checkIn);
    const checkOut = new Date(update.checkOut);

    lateMinutes =
      checkIn > standardIn
        ? Math.floor((checkIn.getTime() - standardIn.getTime()) / 60000)
        : 0;

    earlyLeaveMinutes =
      checkOut < standardOut
        ? Math.floor((standardOut.getTime() - checkOut.getTime()) / 60000)
        : 0;

    workedMinutes = Math.max(
      Math.floor((checkOut.getTime() - checkIn.getTime()) / 60000) -
        config.breakMinutes,
      0,
    );
  }
  const rawUpdate = update as Record<string, any>;
  delete rawUpdate.userId;
  delete rawUpdate.workDate; 

  return this.dailyModel.findOneAndUpdate(
  { userId, workDate },
  {
    $set: {
      shiftType,
      workedMinutes,
      lateMinutes,
      earlyLeaveMinutes,           
      ...rawUpdate,
    },
    $setOnInsert: {
      userId,
      workDate,
    },
  },
  { new: true, upsert: true }
);
}

  async findAll(): Promise<AttendanceDaily[]> {
    return this.dailyModel.find().exec();
  }

  async findByUser(userId: string): Promise<AttendanceDaily[]> {
    return this.dailyModel.find({ userId }).exec();
  }

  async findByDateRange(userId: string, from: string, to: string): Promise<AttendanceDaily[]> {
    return this.dailyModel.find({
      userId,
      workDate: { $gte: from, $lte: to },
    }).exec();
  }

  async findDistinctUserIds(from: string, to: string): Promise<string[]> {
    return this.dailyModel
      .distinct('userId', {
        workDate: { $gte: from, $lte: to },
      })
      .exec();
  }

  // === Logic từ Logs → Daily ===
  async upsertFromLogs(userId: string, workDate: Date, shiftType: WorkShiftType = WorkShiftType.REGULAR) {
    // 1. Lấy log trong ngày
    const { start, end } = dayWindow(workDate.toISOString().slice(0, 10));
    const cfg = SHIFT_CONFIG[shiftType];  

    const [sh, sm] = cfg.start.split(':').map(Number);
    const [eh, em] = cfg.end.split(':').map(Number);

    const standardIn = new Date(workDate); standardIn.setHours(sh, sm, 0, 0);
    const standardOut = new Date(workDate); standardOut.setHours(eh, em, 0, 0);

    const logs = await this.logModel.find({
      userId,
      timestamp: { $gte: start, $lte: end },
    }).sort({ timestamp: 1 }).exec();

    if (!logs.length) return null;

    // 2. Xác định checkIn/checkOut
    const checkIn = logs[0].timestamp;
    const checkOut = logs[logs.length - 1].timestamp;

    // 3. Lấy config ca làm
      

    // 4. Tính toán
    const lateMinutes = checkIn > standardIn
      ? Math.floor((checkIn.getTime() - standardIn.getTime()) / 60000)
      : 0;

    const earlyLeaveMinutes = checkOut < standardOut
      ? Math.floor((standardOut.getTime() - checkOut.getTime()) / 60000)
      : 0;

    const workedMinutes = Math.max(
      Math.floor((checkOut.getTime() - checkIn.getTime()) / 60000) - cfg.breakMinutes,
      0,
    );

    // 5. Upsert vào Daily
    return this.dailyModel.findOneAndUpdate(
      { userId, workDate },
      {
        $set: {
          userId,
          workDate,
          checkIn,
          checkOut,
          shiftType,
          workedMinutes,
          lateMinutes,
          earlyLeaveMinutes,
        },
      },
      { new: true, upsert: true },
    );
  }
}
