import { Module } from '@nestjs/common';
import { UploadFilesController } from './upload-files.controller';
import { UploadFilesService } from './upload-files.service';
import { MongooseModule } from '@nestjs/mongoose';
import { UploadFile, UploadFileSchema } from './schemas/upload-files.schema';
@Module({
  imports: [
    MongooseModule.forFeature([{ name: UploadFile.name, schema: UploadFileSchema }]),
  ],
  controllers: [UploadFilesController],
  providers: [UploadFilesService],
  exports: [UploadFilesService], // Export service if needed in other modules
})
export class UploadFilesModule {}
