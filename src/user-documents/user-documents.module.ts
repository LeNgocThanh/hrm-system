// src/user-documents/user-documents.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserDocumentsService } from './user-documents.service';
import { UserDocumentsController } from './user-documents.controller';
import { UserDocument, UserDocumentSchema } from './schemas/user-document.schema';
import { UploadFilesModule } from '../upload-files/upload-files.module'; // Import FilesModule nếu bạn muốn liên kết đến FileService

@Module({
  imports: [
    MongooseModule.forFeature([{ name: UserDocument.name, schema: UserDocumentSchema }]),
    UploadFilesModule, // Import FilesModule nếu UserDocumentsService cần tương tác với FilesService
  ],
  controllers: [UserDocumentsController],
  providers: [UserDocumentsService],
  exports: [UserDocumentsService], // Export nếu các module khác cần sử dụng UserDocumentsService
})
export class UserDocumentsModule {}