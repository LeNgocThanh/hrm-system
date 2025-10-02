import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { UploadFilesService } from '../upload-files/upload-files.service'; // Adjust the import based on your project structure

@Injectable()
export class FilesService {
   constructor(
    @Inject(forwardRef(() => UploadFilesService))
    private readonly uploadFilesService: UploadFilesService,
  ) {}
  async getFileInfo(filePath: string) {   
    const files = await this.uploadFilesService.findByPath(filePath);
    if (!files || files.length === 0) {
      throw new NotFoundException('File metadata not found in database');
    }
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }
    const stats = fs.statSync(filePath);
    return {
      fileName: path.basename(filePath),
      size: stats.size,
      createdAt: stats.birthtime,
      updatedAt: stats.mtime,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      path: filePath,
    };
  }

  async downloadFile(filePath: string): Promise<Buffer> {
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }
    return fs.readFileSync(filePath);
  }
}