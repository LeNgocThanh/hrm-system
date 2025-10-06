import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AttendanceController } from './attendance.controller';
import { LogsService } from './logs.service';
import { DailyService } from './daily.service';
import { SummaryService } from './summary.service';
import { AttendanceLog, AttendanceLogSchema } from './schemas/attendance-log.schema';
import { AttendanceDaily, AttendanceDailySchema } from './schemas/attendance-daily.schema';
import { AttendanceSummary, AttendanceSummarySchema } from './schemas/attendance-summary.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AttendanceLog.name, schema: AttendanceLogSchema },
      { name: AttendanceDaily.name, schema: AttendanceDailySchema },
      { name: AttendanceSummary.name, schema: AttendanceSummarySchema },
    ]),
  ],
  controllers: [AttendanceController],
  providers: [LogsService, DailyService, SummaryService],
  exports: [LogsService, DailyService, SummaryService],
})
export class AttendanceModule {}
