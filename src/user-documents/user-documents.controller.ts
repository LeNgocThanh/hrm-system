// src/user-documents/user-documents.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { UserDocumentsService } from './user-documents.service';
import { CreateUserDocumentDto } from './dto/create-user-document.dto';
import { UpdateUserDocumentDto } from './dto/update-user-document.dto';
import { UserDocumentResponseDto } from './dto/user-document-response.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';


@ApiBearerAuth() // Thêm bảo mật JWT cho API
@ApiTags('User Documents') // Thêm tag cho Swagger UI
@Controller('user-documents')
@UseGuards(JwtAuthGuard) // Bảo vệ controller bằng JWT Auth Guard
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })) // Áp dụng ValidationPipe
export class UserDocumentsController {
  constructor(private readonly userDocumentsService: UserDocumentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo tài liệu người dùng mới' })
  @ApiBody({ type: CreateUserDocumentDto, description: 'Dữ liệu để tạo tài liệu người dùng' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Tài liệu người dùng đã được tạo thành công',
    type: UserDocumentResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Dữ liệu đầu vào không hợp lệ' })
  @ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, description: 'Lỗi server' })
  async create(@Body() createUserDocumentDto: CreateUserDocumentDto): Promise<UserDocumentResponseDto> {
    return this.userDocumentsService.create(createUserDocumentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy tất cả tài liệu người dùng' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trả về danh sách tất cả tài liệu người dùng',
    type: [UserDocumentResponseDto],
  })
  @ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, description: 'Lỗi server' })
  async findAll(): Promise<UserDocumentResponseDto[]> {
    return this.userDocumentsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy tài liệu người dùng theo ID' })
  @ApiParam({ name: 'id', description: 'ID của tài liệu người dùng', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trả về tài liệu người dùng',
    type: UserDocumentResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Không tìm thấy tài liệu người dùng' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'ID không hợp lệ' })
  @ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, description: 'Lỗi server' })
  async findOne(@Param('id') id: string): Promise<UserDocumentResponseDto> {
    return this.userDocumentsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật tài liệu người dùng theo ID' })
  @ApiParam({ name: 'id', description: 'ID của tài liệu người dùng', type: 'string' })
  @ApiBody({ type: UpdateUserDocumentDto, description: 'Dữ liệu để cập nhật tài liệu người dùng' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tài liệu người dùng đã được cập nhật thành công',
    type: UserDocumentResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Không tìm thấy tài liệu người dùng' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Dữ liệu đầu vào hoặc ID không hợp lệ' })
  @ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, description: 'Lỗi server' })
  async update(@Param('id') id: string, @Body() updateDocDto: UpdateUserDocumentDto): Promise<UserDocumentResponseDto> {
    return this.userDocumentsService.update(id, updateDocDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT) // 204 No Content cho DELETE thành công
  @ApiOperation({ summary: 'Xóa tài liệu người dùng theo ID' })
  @ApiParam({ name: 'id', description: 'ID của tài liệu người dùng', type: 'string' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Tài liệu người dùng đã được xóa thành công' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Không tìm thấy tài liệu người dùng' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'ID không hợp lệ' })
  @ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, description: 'Lỗi server' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.userDocumentsService.remove(id);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Lấy tất cả tài liệu của một người dùng theo userId' })
  @ApiParam({ name: 'userId', description: 'ID của người dùng', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trả về danh sách tài liệu của người dùng',
    type: [UserDocumentResponseDto],
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'userId không hợp lệ' })
  @ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, description: 'Lỗi server' })
  async findByUserId(@Param('userId') userId: string): Promise<UserDocumentResponseDto[]> {
    return this.userDocumentsService.findByUserId(userId);
  }
}
