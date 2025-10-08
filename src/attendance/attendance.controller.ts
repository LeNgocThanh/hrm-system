import { Body, Controller, Get, Param, Post, Query, UseInterceptors, UploadedFile, UsePipes, ValidationPipe, BadRequestException } from '@nestjs/common';
import { LogsService } from './logs.service';
import { DailyService } from './daily.service';
import { SummaryService } from './summary.service';
import { CreateLogDto } from './dto/create-log.dto';
import { UpdateDailyDto } from './dto/update-daily.dto';
import { AttendanceJobService } from './attendance.job.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { AttendanceDaily } from './schemas/attendance-daily.schema';
import * as XLSX from 'xlsx';

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

  @Post('logs/import')
  @UseInterceptors(FileInterceptor('file'))
  async importLogs(@UploadedFile() file: Express.Multer.File) {
    console.log('Importing logs from file:', file);
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    return this.logsService.importFromFile(file);
  }

  @Post('logs/bulk')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async createLogsBulk(@Body() body: any) {   
    const items = Array.isArray(body) ? body : body?.items;

    if (!Array.isArray(items) || items.length < 1) {
      throw new BadRequestException('Body phải là mảng logs hoặc { items: logs } và không rỗng');
    }

    // (Tuỳ) kiểm tra nhẹ từng phần tử
    const shapeOk = items.every(
      (x) => x && typeof x.userId === 'string' && typeof x.timestamp === 'string',
    );
    if (!shapeOk) {
      throw new BadRequestException('Mỗi log phải có userId:string và timestamp:string (ISO).');
    }

    return this.logsService.bulkCreateFromBody(items);
  }

  // --- DAILY ---
   @Get('daily')
  async getDailyFrom(@Query('userId') userId?: string,@Query('from') from?: string, @Query('to') to?: string) {      
    if (from && to) {
      return this.dailyService.findByDateRange(userId, from, to);
    }
    return this.dailyService.findByUser(userId);
  }

  @Post('daily')
  async upsertDaily(    
    @Body() body: any,
  ) {
    const { userId, workDate } = body as any;
    const dto = body as UpdateDailyDto;
    return this.dailyService.upsert(userId, workDate, dto);
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

@Controller('attendance-job')
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
      from,
      to,
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