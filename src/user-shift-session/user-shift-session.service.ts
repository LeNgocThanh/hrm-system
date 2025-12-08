// src/attendance/user-shift-session.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  UserShiftSession,
  UserShiftSessionDocument,
} from './schemas/user-shift-session.schema';
import { CreateUserShiftSessionDto } from './dto/create-user-shift-session.dto';
import { UpdateUserShiftSessionDto } from './dto/update-user-shift-session.dto';
import * as XLSX from 'xlsx';
import { UserAssignmentsService } from 'src/user-assignments/user-assignments.service';

@Injectable()
export class UserShiftSessionService {
  constructor(
    @InjectModel(UserShiftSession.name)
    private readonly userShiftModel: Model<UserShiftSessionDocument>,

    private readonly userAssignmentSvc: UserAssignmentsService,
  ) { }

  /**
   * Tạo mới hoặc cập nhật ca của 1 user theo ngày (upsert)
   */
  async upsertByUserAndDate(
    dto: CreateUserShiftSessionDto,
  ): Promise<UserShiftSession> {
    const { userId, userCode, dateKey, shiftSessionCodes } = dto;

    const doc = await this.userShiftModel
      .findOneAndUpdate(
        { userId, dateKey },
        { userId, userCode, dateKey, shiftSessionCodes },
        { new: true, upsert: true },
      )
      .exec();

    return doc;
  }

  async findByUserAndDate(
    userId: string,
    dateKey: string,
  ): Promise<UserShiftSession | null> {
    return this.userShiftModel.findOne({ userId, dateKey }).exec();
  }

  async findByUserCodeAndRange(
    userCode: string,
    fromDate: string,
    toDate: string,
  ): Promise<UserShiftSession[]> {
    return this.userShiftModel
      .find({
        userCode,
        dateKey: { $gte: fromDate, $lte: toDate },
      })
      .sort({ dateKey: 1 })
      .exec();
  }

  async findByUserIdsAndRange(
    fromDate: string,
    toDate: string,
    userIds?: string[],
  ): Promise<UserShiftSession[]> {
    if (!userIds || userIds.length === 0) {
      return this.userShiftModel
        .find({
          dateKey: { $gte: fromDate, $lte: toDate },
        })
        .sort({ userId: 1, dateKey: 1 })
        .exec();
    }
    return this.userShiftModel
      .find({
        userId: { $in: userIds },
        dateKey: { $gte: fromDate, $lte: toDate },
      })
      .sort({ dateKey: 1 })
      .exec();
  }

  async remove(userId: string, dateKey: string): Promise<void> {
    const res = await this.userShiftModel.deleteOne({ userId, dateKey }).exec();
    if (res.deletedCount === 0) {
      throw new NotFoundException(
        `UserShiftSession not found for userId=${userId}, dateKey=${dateKey}`,
      );
    }
  }

  async importFromExcel(
    fileBuffer: Buffer,
  ): Promise<{
    totalRows: number;
    successCount: number;
    errorCount: number;
    errors: { row: number; message: string }[];
  }> {
    if (!fileBuffer) {
      throw new BadRequestException('Không có file upload.');
    }

    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new BadRequestException('File Excel không có sheet nào.');
    }

    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    let successCount = 0;
    const errors: { row: number; message: string }[] = [];

    // duyệt từng dòng (rowIndex + 2 vì index 0 = dòng 2 nếu có header)
    for (let i = 0; i < rows.length; i++) {
      const excelRow = rows[i];
      const excelRowNumber = i + 2; // giả sử dòng 1 là header

      const userCode = String(excelRow.userCode || '').trim();

      // 2. Dùng await để chờ kết quả từ service
      // userAssignment sẽ là đối tượng UserAssignment được populate
      const userAssignment = await this.userAssignmentSvc.findByCode(userCode);
      if (!userAssignment) {
        continue;
      }
      // 3. Trả về đối tượng log với userId đã lấy được

      // Truy cập thuộc tính userId từ kết quả
      const userId = String(userAssignment.userId._id);

      const date = String(excelRow.date || '').trim();
      const shifts = String(excelRow.shifts || '').trim();

      if (!userCode || !date || !shifts) {
        errors.push({
          row: excelRowNumber,
          message: 'Thiếu userCode, date hoặc shifts.',
        });
        continue;
      }

      // chuẩn hoá date về YYYY-MM-DD (nếu file đã đúng thì giữ nguyên)
      let dateKey = date;
      // nếu date là dạng Date object (XLSX parse), xử lý thêm:
      if (excelRow.date instanceof Date) {
        const d = excelRow.date as Date;
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        dateKey = `${yyyy}-${mm}-${dd}`;
      }

      else if (typeof excelRow.date === 'number') {
       
        const MS_PER_DAY = 24 * 60 * 60 * 1000;
       
        const EXCEL_EPOCH = new Date(Date.UTC(1899, 11, 30)).getTime();
      
        const ms = Math.round(excelRow.date * MS_PER_DAY);
        const d = new Date(EXCEL_EPOCH + ms);

        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        dateKey = `${yyyy}-${mm}-${dd}`;
      }


      // parse shift codes
      const shiftSessionCodes = shifts
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => !!s);

      if (!shiftSessionCodes.length) {
        errors.push({
          row: excelRowNumber,
          message: `Không có mã ca hợp lệ trong cột shifts.`,
        });
        continue;
      }

      try {
        await this.upsertByUserAndDate({
          userId: String(userId),
          userCode: userCode,
          dateKey,
          shiftSessionCodes,
        } as CreateUserShiftSessionDto);

        successCount++;
      } catch (e: any) {
        errors.push({
          row: excelRowNumber,
          message:
            e?.message ??
            'Lỗi không xác định khi upsert UserShiftSession.',
        });
        continue;
      }
    }

    return {
      totalRows: rows.length,
      successCount,
      errorCount: errors.length,
      errors,
    };
  }
}
