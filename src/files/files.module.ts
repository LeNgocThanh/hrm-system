import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { UploadFilesModule } from '../upload-files/upload-files.module';

@Module({
  imports: [UploadFilesModule], // Import UploadFilesModule to use UploadFilesService
  controllers: [FilesController],
  providers: [FilesService]
})
export class FilesModule {}
