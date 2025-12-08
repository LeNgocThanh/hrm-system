// src/attendance/user-shift-session.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { UserShiftSessionService } from './user-shift-session.service';
import { CreateUserShiftSessionDto } from './dto/create-user-shift-session.dto';
import { QueryUserShiftSessionDto } from './dto/query-user-shift-session.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('user-shift-sessions')
export class UserShiftSessionController {
  constructor(
    private readonly userShiftSessionService: UserShiftSessionService,
  ) {}

  @Post('')
  findByUserId(
    @Body() dto: QueryUserShiftSessionDto,
  ) {
    const { userIds, from, to } = dto;  
    return this.userShiftSessionService.findByUserIdsAndRange(    
      from,
      to,
      userIds,
    );
  }

  @Post('upsert')
  upsert(@Body() dto: CreateUserShiftSessionDto) {
    return this.userShiftSessionService.upsertByUserAndDate(dto);
  }

  @Get(':userId/:dateKey')
  findOne(
    @Param('userId') userId: string,
    @Param('dateKey') dateKey: string,
  ) {
    return this.userShiftSessionService.findByUserAndDate(userId, dateKey);
  }

  @Get('by-user-code/:userCode')
  findByUserCode(
    @Param('userCode') userCode: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.userShiftSessionService.findByUserCodeAndRange(
      userCode,
      from,
      to,
    );
  }

  @Delete(':userId/:dateKey')
  remove(
    @Param('userId') userId: string,
    @Param('dateKey') dateKey: string,
  ) {
    return this.userShiftSessionService.remove(userId, dateKey);
  }

  @Post('import-excel')
  @UseInterceptors(FileInterceptor('file'))
  async importExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('Không nhận được file upload (field name phải là "file").');
    }

    const result = await this.userShiftSessionService.importFromExcel(
      file.buffer,
    );
    return result;
  }
}
