import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AttendanceDaily } from './schemas/attendance-daily.schema';
import { AttendanceLog } from './schemas/attendance-log.schema';
import { UpdateDailyDto } from './dto/update-daily.dto';
import { WorkShiftType, SHIFT_CONFIG } from './common/work-shift-type.enum';

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

    lateMinutes =
      update.checkIn > standardIn
        ? Math.floor((update.checkIn.getTime() - standardIn.getTime()) / 60000)
        : 0;

    earlyLeaveMinutes =
      update.checkOut < standardOut
        ? Math.floor((standardOut.getTime() - update.checkOut.getTime()) / 60000)
        : 0;

    workedMinutes = Math.max(
      Math.floor((update.checkOut.getTime() - update.checkIn.getTime()) / 60000) -
        config.breakMinutes,
      0,
    );
  }

  return this.dailyModel.findOneAndUpdate(
    { userId, workDate },
    {
      $set: {
        ...update,
        shiftType,
        workedMinutes,
        lateMinutes,
        earlyLeaveMinutes,
      },
    },
    { new: true, upsert: true },
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
    const startOfDay = new Date(workDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(workDate);
    endOfDay.setHours(23, 59, 59, 999);

    const logs = await this.logModel.find({
      userId,
      timestamp: { $gte: startOfDay, $lte: endOfDay },
    }).sort({ timestamp: 1 }).exec();

    if (!logs.length) return null;

    // 2. Xác định checkIn/checkOut
    const checkIn = logs[0].timestamp;
    const checkOut = logs[logs.length - 1].timestamp;

    // 3. Lấy config ca làm
    const config = SHIFT_CONFIG[shiftType];

    const standardIn = new Date(workDate);
    standardIn.setHours(+config.start.split(':')[0], +config.start.split(':')[1]);

    const standardOut = new Date(workDate);
    standardOut.setHours(+config.end.split(':')[0], +config.end.split(':')[1]);

    // 4. Tính toán
    const lateMinutes = checkIn > standardIn
      ? Math.floor((checkIn.getTime() - standardIn.getTime()) / 60000)
      : 0;

    const earlyLeaveMinutes = checkOut < standardOut
      ? Math.floor((standardOut.getTime() - checkOut.getTime()) / 60000)
      : 0;

    const workedMinutes = Math.max(
      Math.floor((checkOut.getTime() - checkIn.getTime()) / 60000) - config.breakMinutes,
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
