import { Body, Controller, Get, Param, Post, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { LogsService } from './logs.service';
import { DailyService } from './daily.service';
import { SummaryService } from './summary.service';
import { CreateLogDto } from './dto/create-log.dto';
import { UpdateDailyDto } from './dto/update-daily.dto';
import { AttendanceJobService } from './attendance.job.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly logsService: LogsService,
    private readonly dailyService: DailyService,
    private readonly summaryService: SummaryService,
  ) {}

  // --- LOGS ---
  @Post('logs')
  async createLog(@Body() dto: CreateLogDto) {
    return this.logsService.create(dto);
  }

  @Get('logs')
  async getLogs(@Query('from') from?: string, @Query('to') to?: string) {
    if (from && to) {
      return this.logsService.findByOnlyDateRange(from,to);
    }
    return this.logsService.findAll();
  }


  @Get('logs/:userId')
  async getLogsByUser(@Param('userId') userId: string, @Query('from') from?: string, @Query('to') to?: string) {
    if (from && to) {
      return this.logsService.findByDateRange(userId, new Date(from), new Date(to));
    }
    return this.logsService.findByUser(userId);
  }

  @Post('logs/import/:userId')
  @UseInterceptors(FileInterceptor('file'))
  async importLogs(@UploadedFile() file: Express.Multer.File) {
    return this.logsService.importFromFile(file);
  }

  // --- DAILY ---
  @Post('daily/:userId/:date')
  async upsertDaily(
    @Param('userId') userId: string,
    @Param('date') date: string,
    @Body() dto: UpdateDailyDto,
  ) {
    return this.dailyService.upsert(userId, date, dto);
  }

  @Get('daily/:userId')
  async getDaily(@Param('userId') userId: string, @Query('from') from?: string, @Query('to') to?: string) {
    if (from && to) {
      return this.dailyService.findByDateRange(userId, from, to);
    }
    return this.dailyService.findByUser(userId);
  }

  // --- SUMMARY ---
  @Post('summary/:userId/:month')
  async upsertSummary(
    @Param('userId') userId: string,
    @Param('month') month: string,
    @Body() data: any,
  ) {
    return this.summaryService.upsert(userId, month, data);
  }

  @Get('summary/:userId')
  async getSummary(@Param('userId') userId: string, @Query('month') month?: string) {
    if (month) {
      return this.summaryService.findByMonth(userId, month);
    }
    return this.summaryService.findByUser(userId);
  }
}

@Controller('attendance/job')
export class AttendanceJobController {
  constructor(private readonly jobService: AttendanceJobService) {}

  // Logs → Daily
  @Post('logs-to-daily')
  async runLogsToDaily(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('userId') userId?: string,
  ) {
    return this.jobService.runLogsToDaily(
      userId,
      new Date(from),
      new Date(to),
    );
  }

  // Daily → Summary
  @Post('daily-to-summary')
  async runDailyToSummary(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('userId') userId?: string,
  ) {
    return this.jobService.runDailyToSummary(userId, from, to);
  }
}