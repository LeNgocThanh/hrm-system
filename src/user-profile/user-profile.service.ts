import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserProfile, UserProfileDocument } from './schemas/user-profile.schema';
import { CreateUserProfileDto, UpdateUserProfileDto } from './dto';

@Injectable()
export class UserProfileService {
  constructor(
    @InjectModel(UserProfile.name)
    private readonly userProfileModel: Model<UserProfileDocument>,
  ) {}

  async create(dto: CreateUserProfileDto) {
    const created = await this.userProfileModel.create(dto);
    return created.toObject();
  }

  async findByUserId(userId: string) {
    const profile = await this.userProfileModel.findOne({ userId });
    if (!profile) throw new NotFoundException('Không tìm thấy hồ sơ người dùng');
    return profile.toObject();
  }

  async update(userId: string, dto: UpdateUserProfileDto) {
    const updated = await this.userProfileModel.findOneAndUpdate(
      { userId },
      dto,
      { new: true },
    );
    if (!updated) throw new NotFoundException('Không tìm thấy hồ sơ người dùng');
    return updated.toObject();
  }

  async delete(userId: string) {
    const result = await this.userProfileModel.deleteOne({ userId });
    if (result.deletedCount === 0) throw new NotFoundException('Không tìm thấy hồ sơ người dùng');
    return { deleted: true };
  }
}