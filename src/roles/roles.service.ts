import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Role, RoleDocument } from './schemas/role.schema';
import { CreateRoleDto, UpdateRoleDto, RoleResponseDto } from './dto';

@Injectable()
export class RolesService {
  constructor(@InjectModel(Role.name) private roleModel: Model<RoleDocument>) {}

  async create(createRoleDto: CreateRoleDto): Promise<RoleResponseDto> {
    const createdRole = await this.roleModel.create(createRoleDto);
    return createdRole.toObject() as unknown as RoleResponseDto;
  }

  async findAll(isActive?: boolean): Promise<RoleResponseDto[]> {
    const filter = isActive !== undefined ? { isActive } : {};
    const roles = await this.roleModel.find(filter).sort({ name: 1 }).exec();
    return roles.map(role => role.toObject() as unknown as RoleResponseDto);
  }

  async findActiveRoles(): Promise<RoleResponseDto[]> {
    const activeRoles = await this.roleModel.find({ isActive: true }).sort({ name: 1 }).exec();
    return activeRoles.map(role => role.toObject() as unknown as RoleResponseDto);
  }

  async findOne(id: string): Promise<RoleResponseDto> {
    const role = await this.roleModel.findById(id).exec();
    return role?.toObject() as unknown as RoleResponseDto;
  }

  async findManyByIds(ids: string[]): Promise<RoleDocument[]> {
    // Sử dụng $in để tìm tất cả các roles có _id nằm trong mảng ids
    return this.roleModel.find({ _id: { $in: ids.map(id => new Types.ObjectId(id)) } }).exec();
  }

  async getRolePermissions(id: string): Promise<any[]> {
    const role = await this.roleModel.findById(id).populate('permissionIds').exec();
    return role?.permissionIds || [];
  }

  async update(id: string, updateRoleDto: UpdateRoleDto): Promise<RoleResponseDto> {
    const updatedRole = await this.roleModel.findByIdAndUpdate(id, updateRoleDto, { new: true }).exec();
    return updatedRole?.toObject() as unknown as RoleResponseDto;
  }

  async updateRolePermissions(id: string, permissionIds: string[]): Promise<RoleResponseDto> {
    const updatedRole = await this.roleModel.findByIdAndUpdate(
      id, 
      { permissionIds }, 
      { new: true }
    ).exec();
    return updatedRole?.toObject() as unknown as RoleResponseDto;
  }

  async delete(id: string): Promise<RoleResponseDto> {
    const deletedRole = await this.roleModel.findByIdAndDelete(id).exec();
    return deletedRole?.toObject() as unknown as RoleResponseDto;
  }
}
