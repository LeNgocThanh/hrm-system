// src/user-documents/user-documents.service.ts
import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserDocument, UserDocumentDocument } from './schemas/user-document.schema';
import { CreateUserDocumentDto } from './dto/create-user-document.dto';
import { UpdateUserDocumentDto } from './dto/update-user-document.dto';
import { UserDocumentResponseDto } from './dto/user-document-response.dto';
import { DocTypeEnum } from './enums/doc-type.enum';
import { UploadFilesService } from '../upload-files/upload-files.service'; // Để kiểm tra sự tồn tại của fileId

@Injectable()
export class UserDocumentsService {
  private readonly logger = new Logger(UserDocumentsService.name);

  constructor(
    @InjectModel(UserDocument.name) private userDocumentModel: Model<UserDocumentDocument>,
    private readonly filesService: UploadFilesService, // Inject FilesService
  ) {}

  /**
   * Chuyển đổi UserDocument từ MongoDB sang DTO trả về
   * @param doc UserDocument từ MongoDB
   * @returns UserDocumentResponseDto
   */
  private mapToResponseDto(doc: UserDocumentDocument): UserDocumentResponseDto {
    return {
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      docType: doc.docType,
      otherDocTypeDescription: doc.otherDocTypeDescription,
      fileId: doc.fileId.toString(),
      description: doc.description,
      isActive: doc.isActive,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  /**
   * Tạo một tài liệu người dùng mới
   * @param createUserDocumentDto DTO chứa thông tin tài liệu
   * @returns Promise<UserDocumentResponseDto>
   */
  async create(createUserDocumentDto: CreateUserDocumentDto): Promise<UserDocumentResponseDto> {
    try {
      // Tùy chọn: Kiểm tra xem fileId có tồn tại trong bảng Files không
      // try {
      //   await this.filesService.getFileById(createUserDocumentDto.fileId);
      // } catch (error) {
      //   throw new BadRequestException(`File với ID ${createUserDocumentDto.fileId} không tồn tại.`);
      // }

      const newUserDocument = new this.userDocumentModel({
        userId: new Types.ObjectId(createUserDocumentDto.userId),
        docType: createUserDocumentDto.docType,
        otherDocTypeDescription:
          createUserDocumentDto.docType === DocTypeEnum.OTHER
            ? createUserDocumentDto.otherDocTypeDescription
            : undefined,
        fileId: new Types.ObjectId(createUserDocumentDto.fileId),
        description: createUserDocumentDto.description,
        isActive: createUserDocumentDto.isActive,
      });

      const savedDoc = await newUserDocument.save();
      this.logger.log(`User document created: ${savedDoc._id}`);
      return this.mapToResponseDto(savedDoc);
    } catch (error) {
      this.logger.error(`Error creating user document: ${error.message}`, error.stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Không thể tạo tài liệu người dùng.');
    }
  }

  /**
   * Lấy tất cả tài liệu người dùng
   * @returns Promise<UserDocumentResponseDto[]>
   */
  async findAll(): Promise<UserDocumentResponseDto[]> {
    try {
      const docs = await this.userDocumentModel.find().exec();
      return docs.map(this.mapToResponseDto);
    } catch (error) {
      this.logger.error(`Error finding all user documents: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Không thể lấy danh sách tài liệu người dùng.');
    }
  }

  /**
   * Lấy tài liệu người dùng theo ID
   * @param id ID của tài liệu
   * @returns Promise<UserDocumentResponseDto>
   */
  async findOne(id: string): Promise<UserDocumentResponseDto> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException('ID tài liệu không hợp lệ.');
      }
      const doc = await this.userDocumentModel.findById(id).exec();
      if (!doc) {
        throw new NotFoundException(`Tài liệu người dùng với ID ${id} không tìm thấy.`);
      }
      return this.mapToResponseDto(doc);
    } catch (error) {
      this.logger.error(`Error finding user document by ID ${id}: ${error.message}`, error.stack);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Không thể lấy tài liệu người dùng.');
    }
  }

  /**
   * Cập nhật tài liệu người dùng theo ID
   * @param id ID của tài liệu
   * @param updateDocDto DTO chứa thông tin cập nhật
   * @returns Promise<UserDocumentResponseDto>
   */
  async update(id: string, updateDocDto: UpdateUserDocumentDto): Promise<UserDocumentResponseDto> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException('ID tài liệu không hợp lệ.');
      }

      const existingDoc = await this.userDocumentModel.findById(id).exec();
      if (!existingDoc) {
        throw new NotFoundException(`Tài liệu người dùng với ID ${id} không tìm thấy.`);
      }

      // Cập nhật các trường
      if (updateDocDto.userId) existingDoc.userId = new Types.ObjectId(updateDocDto.userId);
      if (updateDocDto.fileId) existingDoc.fileId = new Types.ObjectId(updateDocDto.fileId);
      if (updateDocDto.description !== undefined) existingDoc.description = updateDocDto.description;
      if (updateDocDto.isActive !== undefined) existingDoc.isActive = updateDocDto.isActive;

      // Logic đặc biệt cho docType và otherDocTypeDescription
      if (updateDocDto.docType !== undefined) { // <-- THÊM KIỂM TRA NÀY
        existingDoc.docType = updateDocDto.docType; // Cập nhật docType trước

        if (updateDocDto.docType === DocTypeEnum.OTHER) {
          // Nếu docType là 'other', otherDocTypeDescription là bắt buộc
          if (!updateDocDto.otherDocTypeDescription) {
            throw new BadRequestException('otherDocTypeDescription không được để trống khi docType là "other".');
          }
          existingDoc.otherDocTypeDescription = updateDocDto.otherDocTypeDescription;
        } else {
          // Nếu docType được thay đổi sang một giá trị không phải 'other',
          // hoặc nếu nó đã là một giá trị khác 'other' và được cập nhật lại,
          // thì xóa otherDocTypeDescription.
          existingDoc.otherDocTypeDescription = undefined; // Hoặc null
        }
      } else if (updateDocDto.otherDocTypeDescription !== undefined) {
        // Trường hợp chỉ otherDocTypeDescription được gửi lên để cập nhật
        // mà docType không được gửi hoặc không phải 'other' trong existingDoc
        if (existingDoc.docType !== DocTypeEnum.OTHER) {
          throw new BadRequestException('Không thể cập nhật otherDocTypeDescription khi docType hiện tại không phải "other".');
        }
        // Nếu docType hiện tại là 'other', thì cho phép cập nhật otherDocTypeDescription
        existingDoc.otherDocTypeDescription = updateDocDto.otherDocTypeDescription;
      }


      const updatedDoc = await existingDoc.save();
      this.logger.log(`User document updated: ${updatedDoc._id}`);
      return this.mapToResponseDto(updatedDoc);
    } catch (error) {
      this.logger.error(`Error updating user document with ID ${id}: ${error.message}`, error.stack);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Không thể cập nhật tài liệu người dùng.');
    }
  }

  /**
   * Xóa tài liệu người dùng theo ID
   * @param id ID của tài liệu
   * @returns Promise<void>
   */
  async remove(id: string): Promise<void> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException('ID tài liệu không hợp lệ.');
      }
      const result = await this.userDocumentModel.deleteOne({ _id: id }).exec();
      if (result.deletedCount === 0) {
        throw new NotFoundException(`Tài liệu người dùng với ID ${id} không tìm thấy.`);
      }
      this.logger.log(`User document deleted: ${id}`);
    } catch (error) {
      this.logger.error(`Error deleting user document with ID ${id}: ${error.message}`, error.stack);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Không thể xóa tài liệu người dùng.');
    }
  }

  /**
   * Lấy tất cả tài liệu của một người dùng theo userId
   * @param userId ID của người dùng
   * @returns Promise<UserDocumentResponseDto[]>
   */
  async findByUserId(userId: string): Promise<UserDocumentResponseDto[]> {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestException('userId không hợp lệ.');
      }

      const docs = await this.userDocumentModel
        .find({ userId: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 }) // Sắp xếp theo thời gian tạo mới nhất
        .exec();

      return docs.map(this.mapToResponseDto);
    } catch (error) {
      this.logger.error(`Error finding user documents by userId ${userId}: ${error.message}`, error.stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Không thể lấy danh sách tài liệu người dùng.');
    }
  }
}
