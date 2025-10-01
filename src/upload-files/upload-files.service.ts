// src/files/files.service.ts
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UploadFile, UploadFileDocument } from './schemas/upload-files.schema';
import { FileResponseDto } from './dto/upload-files-response.dto';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid'; // Để tạo tên file duy nhất
import * as crypto from 'crypto'; // Để tạo hash

@Injectable()
export class UploadFilesService {
  private readonly logger = new Logger(UploadFilesService.name);
  private readonly UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'); // Thư mục lưu trữ file

  constructor(@InjectModel(UploadFile.name) private fileModel: Model<UploadFileDocument>) {
    // Đảm bảo thư mục uploads tồn tại
    if (!fs.existsSync(this.UPLOAD_DIR)) {
      fs.mkdirSync(this.UPLOAD_DIR, { recursive: true });
      this.logger.log(`Created upload directory: ${this.UPLOAD_DIR}`);
    }
  }

  async findByResourceType(resourceType: string): Promise<UploadFile[]> {
    return this.fileModel.find({ resourceType }).exec();
  }

  async findByPath(path: string): Promise<UploadFile[]> {
    return this.fileModel.find({ path }).exec();
  }

  async findByPublicUrl(publicUrl: string): Promise<UploadFile[]> {
    return this.fileModel.find({ publicUrl }).exec();
  }

  async findByRelatedId(relatedId: string): Promise<UploadFile[]> {
    return this.fileModel.find({ relatedId }).exec();
  }

  async findByUploadedBy(uploadedBy: string): Promise<UploadFile[]> {
    return this.fileModel.find({ uploadedBy }).exec();
  }

  async findOne(id: string): Promise<FileResponseDto> {
      const user = await this.fileModel.findById(id).exec();
      return user?.toObject() as unknown as FileResponseDto;
    }
  /**
   * Tính toán SHA256 hash của file
   * @param filePath Đường dẫn đến file
   * @returns Promise<string> Mã hash SHA256
   */
  private async calculateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', (err) => reject(err));
    });
  }

  /**
   * Xử lý upload file và lưu thông tin vào DB
   * @param file Đối tượng file từ Multer
   * @param uploadedBy ID người dùng tải lên
   * @param resourceType Loại tài nguyên (optional)
   * @param relatedId ID đối tượng liên quan (optional)
   * @returns Promise<FileResponseDto> Thông tin file đã lưu
   */
  async uploadFile(
    file: Express.Multer.File,
    uploadedBy: string,
    resourceType?: string,
    relatedId?: string,
  ): Promise<FileResponseDto> {
    try {
      const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
      const filePath = path.join(this.UPLOAD_DIR, uniqueFilename);

      // Lưu file vào ổ đĩa
      fs.writeFileSync(filePath, file.buffer);
      this.logger.log(`File saved to: ${filePath}`);

      // Tính toán hash của file
      const fileHash = await this.calculateFileHash(filePath);

      // Tạo một bản ghi mới trong MongoDB
      const newFile = new this.fileModel({
        originalName: file.originalname,
        filename: uniqueFilename,
        mimetype: file.mimetype,
        size: file.size,
        path: filePath, // Lưu đường dẫn đầy đủ trên server
        publicUrl: `/uploads/${uniqueFilename}`, // Có thể là URL của CDN sau này
        uploadedBy: uploadedBy,
        resourceType: resourceType,
        relatedId: relatedId,
        hash: fileHash,
        status: 'active', // Mặc định là active sau khi upload
      });

      const savedFile = await newFile.save();
      this.logger.log(`File metadata saved to DB: ${savedFile.id}`);

      // Chuyển đổi sang DTO để trả về
      return {
        id: savedFile._id.toString(),
        originalName: savedFile.originalName,
        filename: savedFile.filename,
        mimetype: savedFile.mimetype,
        size: savedFile.size,
        path: savedFile.path,
        publicUrl: savedFile.publicUrl,
        uploadedBy: savedFile.uploadedBy,
        uploadedAt: savedFile.uploadedAt,
        updatedAt: savedFile.updatedAt,
        status: savedFile.status,
        resourceType: savedFile.resourceType,
        relatedId: savedFile.relatedId,
        hash: savedFile.hash,
      };
    } catch (error) {
      this.logger.error(`Error uploading file: ${error.message}`, error.stack);
      // Xóa file đã lưu nếu có lỗi xảy ra trong quá trình lưu DB
      const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
      const filePath = path.join(this.UPLOAD_DIR, uniqueFilename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw new InternalServerErrorException('Không thể tải lên file. Vui lòng thử lại.');
    }
  }
}