import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AttendanceController, AttendanceJobController } from './attendance.controller';
import { LogsService } from './logs.service';
import { DailyService } from './daily.service';
import { SummaryService } from './summary.service';
import { AttendanceLog, AttendanceLogSchema } from './schemas/attendance-log.schema';
import { AttendanceDaily, AttendanceDailySchema } from './schemas/attendance-daily.schema';
import { AttendanceSummary, AttendanceSummarySchema } from './schemas/attendance-summary.schema';
import { AttendanceJobService } from './attendance.job.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AttendanceLog.name, schema: AttendanceLogSchema },
      { name: AttendanceDaily.name, schema: AttendanceDailySchema },
      { name: AttendanceSummary.name, schema: AttendanceSummarySchema },
    ]),
  ],
  controllers: [AttendanceController, AttendanceJobController],
  providers: [LogsService, DailyService, SummaryService, AttendanceJobService],
  exports: [LogsService, DailyService, SummaryService],
})
export class AttendanceModule {}
