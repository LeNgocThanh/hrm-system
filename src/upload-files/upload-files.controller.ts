// src/files/files.controller.ts
import {
  Controller,
  Post,
  Get,
  Query,
  UseInterceptors,
  UploadedFile,
  Body,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  InternalServerErrorException,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { UploadFilesService } from './upload-files.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiBody, ApiTags, ApiResponse } from '@nestjs/swagger';
import { FileUploadDto } from './dto/upload-files.dto';
import { FileResponseDto } from './dto/upload-files-response.dto';
import { UploadFile } from './schemas/upload-files.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';


@ApiTags('UploadFiles') // Thêm tag cho Swagger UI
@Controller('files')
@UseGuards(JwtAuthGuard)
export class UploadFilesController {
  constructor(private readonly filesService: UploadFilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file')) // 'file' là tên trường trong form-data
  @ApiConsumes('multipart/form-data') // Cho Swagger biết đây là multipart/form-data
  @ApiBody({
    description: 'Upload file và các thông tin liên quan',
    type: FileUploadDto, // Sử dụng DTO để mô tả các trường
  })
  @ApiResponse({
    status: 201,
    description: 'File đã được tải lên thành công',
    type: FileResponseDto,
  })
  @ApiResponse({ status: 500, description: 'Lỗi server' })
  async uploadFile(
    @Req() req: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 25 * 1024 * 1024 }), // Giới hạn 25MB
          // new FileTypeValidator({ fileType: 'image/(jpeg|png|gif)|application/pdf' }), // Chỉ cho phép ảnh và PDF
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() body: FileUploadDto, // Nhận các trường dữ liệu khác từ body
  ): Promise<FileResponseDto> {
    try {
      const uploadedBy = req.user._id || req.user.id || req.user.userId || req.user;
      const { resourceType, relatedId } = body;

      // Kiểm tra uploadedBy, nếu không có thì trả về lỗi
      if (!uploadedBy) {
        throw new InternalServerErrorException('Trường uploadedBy là bắt buộc.');
      }

      return this.filesService.uploadFile(file, uploadedBy, resourceType, relatedId);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  @Get('by-resource-type')
  async getByResourceType(@Query('resourceType') resourceType: string): Promise<UploadFile[]> {
    return this.filesService.findByResourceType(resourceType);
  }

  @Get('by-path')
  async getByPath(@Query('path') path: string): Promise<UploadFile[]> {
    return this.filesService.findByPath(path);
  }

  @Get('by-public-url')
  async getByPublicUrl(@Query('publicUrl') publicUrl: string): Promise<UploadFile[]> {
    return this.filesService.findByPublicUrl(publicUrl);
  }

  @Get('by-related-id')
  async getByRelatedId(@Query('relatedId') relatedId: string): Promise<UploadFile[]> {
    return this.filesService.findByRelatedId(relatedId);
  }

  @Get('by-uploaded-by')
  async getByUploadedBy(@Query('uploadedBy') uploadedBy: string): Promise<UploadFile[]> {
    return this.filesService.findByUploadedBy(uploadedBy);
  }
   
   @Get(':id')
    findOne(@Param('id') id: string): Promise<UploadFile> {
      return this.filesService.findOne(id);
    }
}


