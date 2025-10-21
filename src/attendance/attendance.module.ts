import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AttendanceController, AttendanceJobController, HolidayController } from './attendance.controller';
import { LogsService } from './logs.service';
import { DailyService } from './daily.service';
import { SummaryService } from './summary.service';
import { AttendanceLog, AttendanceLogSchema } from './schemas/attendance-log.schema';
import { AttendanceDaily, AttendanceDailySchema } from './schemas/attendance-daily.schema';
import { AttendanceSummary, AttendanceSummarySchema } from './schemas/attendance-summary.schema';
import { AttendanceJobService } from './attendance.job.service';
import { HolidayService } from './holiday.service';
import { Holiday, HolidaySchema } from './schemas/holiday-exception.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AttendanceLog.name, schema: AttendanceLogSchema },
      { name: AttendanceDaily.name, schema: AttendanceDailySchema },
      { name: AttendanceSummary.name, schema: AttendanceSummarySchema },
      {name: Holiday.name, schema: HolidaySchema},
    ]),
  ],
  controllers: [AttendanceController, AttendanceJobController, HolidayController],
  providers: [LogsService, DailyService, SummaryService, AttendanceJobService, HolidayService],
  exports: [LogsService, DailyService, SummaryService, HolidayService],
})
export class AttendanceModule {}
