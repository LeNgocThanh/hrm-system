import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Permission, PermissionDocument } from './schemas/permission.schema';
import { CreatePermissionDto, UpdatePermissionDto, PermissionResponseDto } from './dto';
import { Action } from './common/permission.constants';

@Injectable()
export class PermissionsService {
  constructor(@InjectModel(Permission.name) private permissionModel: Model<PermissionDocument>) {}

  async create(createPermissionDto: CreatePermissionDto): Promise<PermissionResponseDto> {
    const createdPermission = await this.permissionModel.create(createPermissionDto);
    return createdPermission.toObject() as unknown as PermissionResponseDto;
  }

  async findAll(module?: string): Promise<PermissionResponseDto[]> {
    const filter = module ? { module } : {};
    const permissions = await this.permissionModel.find(filter).sort({ module: 1, action: 1 }).exec();
    return permissions.map(permission => permission.toObject() as unknown as PermissionResponseDto);
  }

  async getModules(): Promise<string[]> {
    const modules = await this.permissionModel.distinct('module').exec();
    return modules.sort();
  }

  async findByModule(module: string): Promise<PermissionResponseDto[]> {
    const permissions = await this.permissionModel.find({ module }).sort({ action: 1 }).exec();
    return permissions.map(permission => permission.toObject() as unknown as PermissionResponseDto);
  }

  async findByAction(action: Action): Promise<PermissionResponseDto[]> {
    const permissions = await this.permissionModel.find({ action }).sort({ module: 1 }).exec();
    return permissions.map(permission => permission.toObject() as unknown as PermissionResponseDto);
  }

  async findOne(id: string): Promise<PermissionResponseDto> {
    const permission = await this.permissionModel.findById(id).exec();
    return permission?.toObject() as unknown as PermissionResponseDto;
  }

  async findManyByIds(ids: string[]): Promise<PermissionDocument[]> {
    // Sử dụng $in để tìm tất cả các permissions có _id nằm trong mảng ids
    return this.permissionModel.find({ _id: { $in: ids.map(id => new Types.ObjectId(id)) } }).exec();
  }

  async update(id: string, updatePermissionDto: UpdatePermissionDto): Promise<PermissionResponseDto> {
    const updatedPermission = await this.permissionModel.findByIdAndUpdate(id, updatePermissionDto, { new: true }).exec();
    return updatedPermission?.toObject() as unknown as PermissionResponseDto;
  }

  async delete(id: string): Promise<PermissionResponseDto> {
    const deletedPermission = await this.permissionModel.findByIdAndDelete(id).exec();
    return deletedPermission?.toObject() as unknown as PermissionResponseDto;
  }
}
