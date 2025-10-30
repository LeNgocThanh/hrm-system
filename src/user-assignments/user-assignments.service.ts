import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserAssignment, UserAssignmentDocument } from './schemas/user-assignment.schema';
import { CreateUserAssignmentDto } from './dto/create-user-assignment.dto';
import { UpdateUserAssignmentDto } from './dto/update-user-assignment.dto';
import { QueryUserAssignmentDto } from './dto/query-user-assignment.dto';

@Injectable()
export class UserAssignmentsService {
  constructor(
    @InjectModel(UserAssignment.name)
    private userAssignmentModel: Model<UserAssignmentDocument>,
  ) {}

  async create(createUserAssignmentDto: CreateUserAssignmentDto): Promise<UserAssignment> {
    const createdUserAssignment = new this.userAssignmentModel(createUserAssignmentDto);
    return createdUserAssignment.save();
  }

  async findAll(query: QueryUserAssignmentDto): Promise<{ data: UserAssignment[]; total: number; page: number; limit: number }> {
    const { page = '1', limit = '10', ...filters } = query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build filter object
    const filterObj: any = {};
    if (filters.userId) filterObj.userId = new Types.ObjectId(filters.userId);
    if (filters.organizationId) filterObj.organizationId = new Types.ObjectId(filters.organizationId);
    if (filters.positionId) filterObj.positionId = new Types.ObjectId(filters.positionId);
    if (filters.isPrimary !== undefined) filterObj.isPrimary = filters.isPrimary;
    if (filters.isActive !== undefined) filterObj.isActive = filters.isActive;

    const [data, total] = await Promise.all([
      this.userAssignmentModel
        .find(filterObj)
        .populate('userId', 'username email firstName lastName')
        .populate('organizationId', 'name')
        .populate('positionId', 'name')
        .populate('roleIds', 'name')
        .skip(skip)
        .limit(limitNum)
        .exec(),
      this.userAssignmentModel.countDocuments(filterObj).exec(),
    ]);

    return {
      data,
      total,
      page: pageNum,
      limit: limitNum,
    };
  }

  async findOne(id: string): Promise<UserAssignment> {
    const userAssignment = await this.userAssignmentModel
      .findById(id)
      .populate('userId', 'username email firstName lastName')
      .populate('organizationId', 'name')
      .populate('positionId', 'name')
      .populate('roleIds', 'name')
      .exec();

    if (!userAssignment) {
      throw new NotFoundException(`User assignment with ID ${id} not found`);
    }

    return userAssignment;
  }

   async findByCode(code: string): Promise<UserAssignment> {
    const userAssignment = await this.userAssignmentModel
      .findOne({userCode: code})
      .populate('userId', 'username email firstName lastName')
      .populate('organizationId', 'name')
      .populate('positionId', 'name')
      .populate('roleIds', 'name')
      .exec();

    if (!userAssignment) {
      throw new NotFoundException(`User assignment with userCode ${code} not found`);
    }
    return userAssignment;
  }

  async findByUserId(userId: string): Promise<UserAssignment[]> {
    return this.userAssignmentModel
      .find({ userId: userId })
      .populate('userId', 'username email firstName lastName')
      .populate('organizationId', 'name')
      .populate('positionId', 'name')
      .populate('roleIds', 'name')
      .exec();
  }

  async findByOrganizationId(organizationId: string): Promise<UserAssignment[]> {
    return this.userAssignmentModel
      .find({ organizationId: organizationId })
      .populate('userId', 'username email firstName lastName')
      .populate('organizationId', 'name')
      .populate('positionId', 'name')
      .populate('roleIds', 'name')
      .exec();
  }

  async update(id: string, updateUserAssignmentDto: UpdateUserAssignmentDto): Promise<UserAssignment> {
    const updatedUserAssignment = await this.userAssignmentModel
      .findByIdAndUpdate(id, updateUserAssignmentDto, { new: true })
      .populate('userId', 'username email firstName lastName')
      .populate('organizationId', 'name')
      .populate('positionId', 'name')
      .populate('roleIds', 'name')
      .exec();

    if (!updatedUserAssignment) {
      throw new NotFoundException(`User assignment with ID ${id} not found`);
    }

    return updatedUserAssignment;
  }

  async remove(id: string): Promise<void> {
    const result = await this.userAssignmentModel.findByIdAndDelete(id).exec();
    
    if (!result) {
      throw new NotFoundException(`User assignment with ID ${id} not found`);
    }
  }

  async deactivate(id: string): Promise<UserAssignment> {
    const userAssignment = await this.userAssignmentModel
      .findByIdAndUpdate(id, { isActive: false }, { new: true })
      .populate('userId', 'username email firstName lastName')
      .populate('organizationId', 'name')
      .populate('positionId', 'name')
      .populate('roleIds', 'name')
      .exec();

    if (!userAssignment) {
      throw new NotFoundException(`User assignment with ID ${id} not found`);
    }

    return userAssignment;
  }
}
