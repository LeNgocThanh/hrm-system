import { Body, Controller, Get, Param, Post, Query, UseInterceptors, UploadedFile, UsePipes, ValidationPipe, BadRequestException, Put, Delete, Req } from '@nestjs/common';
import { LogsService } from './logs.service';
import { DailyService } from './daily.service';
import { SummaryService } from './summary.service';
import { CreateLogDto } from './dto/create-log.dto';
import { UpdateDailyDto } from './dto/update-daily.dto';
import { AttendanceJobService } from './attendance.job.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { AttendanceDaily } from './schemas/attendance-daily.schema';
import * as XLSX from 'xlsx';
import { RunLogsToDailySmartDto } from './dto/jobs-logs-to-dailly';
import { DaillyToMonthDto } from './dto/daillyToMonth.dto';
import { HolidayService } from './holiday.service';
import { QueryHolidaysDto, UpsertHolidayDto } from './dto/holiday.dto';

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
  async getDaily(
    @Query('userId') userId?: string,
    @Query('date') date?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (userId && date) {
      return this.dailyService.findOne(userId, date);
    }
    if (from || to) {
      // Nếu không truyền userId, bạn có thể trả về rỗng hoặc mở rộng hàm service để hỗ trợ all users
      if (!userId) return [];
      return this.dailyService.findRange(userId, from, to);
    }
    // Không có tham số -> rỗng
    return [];
  }  

  @Put('times')
  async upsertTimes(@Body() body: any) {
    const { userId, dateKey } = body || {};
    if (!userId || !dateKey) {
      throw new BadRequestException('userId và date là bắt buộc');
    }
    return this.dailyService.upsertTimes(body);
  }

  @Put('dailly-manual')
  async upsertTimesManual(@Body() body: any) {
    const { userId, dateKey } = body || {};
    if (!userId || !dateKey) {
      throw new BadRequestException('userId và date là bắt buộc');
    }
    return this.dailyService.upsertTimesNoSession(body);
  }

  // --- SUMMARY ---
  @Get()
  async getMonthly(@Query('userId') userId?: string, @Query('monthKey') monthKey?: string) {
    if (!userId) {
      throw new BadRequestException('Thiếu userId');
    }
    const mk = monthKey || new Date().toISOString().slice(0, 7);
    return this.summaryService.upsertMonthly(userId, mk);
  }
}

@Controller('attendance-job')
export class AttendanceJobController {
  constructor(private readonly jobService: AttendanceJobService) {}

  // Logs → Daily
 @Post('runLogsToDaily')
  async runLogsToDaily(@Body() body: any) {
    const { userId, from, to } = body || {};
    return this.jobService.runLogsToDaily(userId, from, to);
  }

  @Post('runLogsToDailyManual')
  async runLogsToDailyManual(@Body() dto: RunLogsToDailySmartDto) {    
    const { userId, from, to } = dto || {};
    return this.jobService.runLogsToDailySmart(userId, from, to);
  }

  @Post('runLogsOverNightToDailyManual')
  async runLogsOverNightToDailyManual(@Body() dto: RunLogsToDailySmartDto) {    
    const { userId, from, to } = dto || {};
    return this.jobService.runLogsOverNightToDailySmart(userId, from, to);
  }

  /**
   * Mô phỏng job “hôm qua” (giống cronDailyYesterday)
   */
  @Post('runYesterday')
  async runYesterday() {
    return this.jobService.cronDailyYesterday();
  }

  /**
   * Tổng hợp SUMMARY theo tháng (user hoặc tất cả).
   * Body: { userId?: string, monthKey?: 'YYYY-MM' }
   */
  @Post('runMonthlySummary')
  async runMonthlySummary(@Body() body: DaillyToMonthDto) {
    const { userId, monthKey } = body || {};
    return this.jobService.runMonthlySummary(userId, monthKey);
  }
}

@Controller('calendar/holidays')
export class HolidayController {
constructor(private readonly svc: HolidayService) {}


@Get()
async list(@Query() q: QueryHolidaysDto) { return this.svc.list(q); }


@Post()
async upsert(@Body() dto: UpsertHolidayDto, @Req() req: any) {
const userId = String(req?.user?._id || req?.userId || 'system');
return this.svc.upsert(dto, userId);
}


@Delete(':id')
async remove(@Param('id') id: string) { return this.svc.remove(id); }
}
