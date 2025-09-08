import { Controller, Get, Query, Res, BadRequestException } from '@nestjs/common';
import { FilesService } from './files.service';
import { Response } from 'express';

@Controller('fileDetails')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get('info')
  async getFileInfo(@Query('path') filePath: string) {
    if (!filePath) throw new BadRequestException('Missing file path');
    return this.filesService.getFileInfo(filePath);
  }

  @Get('download')
  async downloadFile(@Query('path') filePath: string, @Res() res: Response) {
    if (!filePath) throw new BadRequestException('Missing file path');
    const fileInfo = await this.filesService.getFileInfo(filePath);
    const fileBuffer = await this.filesService.downloadFile(filePath);
    res.set({
      'Content-Disposition': `attachment; filename="${fileInfo.fileName}"`,
      'Content-Type': 'application/octet-stream',
    });
    res.send(fileBuffer);
  }
}