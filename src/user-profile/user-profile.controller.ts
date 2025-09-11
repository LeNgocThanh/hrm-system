import { Controller, Get, Post, Body, Param, Put, Delete, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserProfile, UserProfileDocument } from './schemas/user-profile.schema';
import { CreateUserProfileDto, UpdateUserProfileDto, UserProfileResponseDto } from './dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('user-profile')
@Controller('user-profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard) // Bảo vệ controller bằng JWT Auth Guard
export class UserProfileController {
  constructor(
    @InjectModel(UserProfile.name)
    private readonly userProfileModel: Model<UserProfileDocument>,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Tạo hồ sơ người dùng' })
  @ApiResponse({ status: 201, type: UserProfileResponseDto })
  async create(@Body() dto: CreateUserProfileDto): Promise<UserProfileResponseDto> {
    const created = await this.userProfileModel.create(dto);
    return created.toObject();
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Lấy hồ sơ người dùng theo userId' })
  @ApiResponse({ status: 200, type: UserProfileResponseDto })
  async findByUserId(@Param('userId') userId: string): Promise<UserProfileResponseDto> {
    const profile = await this.userProfileModel.findOne({ userId });
    if (!profile) throw new NotFoundException('Không tìm thấy hồ sơ người dùng');
    return profile.toObject();
  }

  @Put(':userId')
  @ApiOperation({ summary: 'Cập nhật hồ sơ người dùng theo userId' })
  @ApiResponse({ status: 200, type: UserProfileResponseDto })
  async update(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserProfileDto,
  ): Promise<UserProfileResponseDto> {
    console.log('Updating user profile for userId:', userId, 'with data:', dto);
    const updated = await this.userProfileModel.findOneAndUpdate(
      { userId },
      dto,
      { new: true },
    );
    if (!updated) throw new NotFoundException('Không tìm thấy hồ sơ người dùng');
    return updated.toObject();
  }

  @Delete(':userId')
  @ApiOperation({ summary: 'Xóa hồ sơ người dùng theo userId' })
  @ApiResponse({ status: 200, schema: { example: { deleted: true } } })
  async delete(@Param('userId') userId: string) {
    const result = await this.userProfileModel.deleteOne({ userId });
    if (result.deletedCount === 0) throw new NotFoundException('Không tìm thấy hồ sơ người dùng');
    return { deleted: true };
  }
}