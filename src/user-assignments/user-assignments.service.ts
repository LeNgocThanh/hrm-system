import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserAssignment, UserAssignmentDocument } from './schemas/user-assignment.schema';
import { CreateUserAssignmentDto, CreateUserAssignmentByCodeDto } from './dto/create-user-assignment.dto';
import { UpdateUserAssignmentDto } from './dto/update-user-assignment.dto';
import { QueryUserAssignmentDto } from './dto/query-user-assignment.dto';
import { RolesService } from 'src/roles/roles.service';
import { PermissionsService } from 'src/permissions/permissions.service';
//import { OrganizationsService } from 'src/organizations/organizations.service';
//import { PositionsService } from 'src/positions/positions.service';

@Injectable()
export class UserAssignmentsService {
  constructor(
    @InjectModel(UserAssignment.name)
    private userAssignmentModel: Model<UserAssignmentDocument>,
    private readonly rolesService: RolesService,
    private readonly permissionsService: PermissionsService,
   // private readonly organizationsService: OrganizationsService,
   // private readonly positionsService: PositionsService,
  ) { }

  async create(createUserAssignmentDto: CreateUserAssignmentDto, userId: string, userIdRoles: any[]): Promise<UserAssignment> {
    const moduleNames = ['All', 'User'];
    // Hàm tiện ích để kiểm tra quyền
    const hasPermission = (action: string) => {
      return userIdRoles.some(scope =>
        moduleNames.some(moduleName =>
          scope.groupedPermissions?.[moduleName]?.includes(action)
        )
      );
    };

    const roleIds = createUserAssignmentDto.roleIds
      ?.map((roleId: any) => roleId.toString()) ?? [];
    const roles = await this.rolesService.findManyByIds(roleIds);
    const allPermissionIds = roles.flatMap(role => role.permissionIds.map(pId => pId.toString()));
    const uniquePermissionIds = [...new Set(allPermissionIds)];
    const permissions = await this.permissionsService.findManyByIds(uniquePermissionIds);
    //const permissionCodes = permissions.map(p => p.code);
    const groupedPermissions = permissions.reduce((acc, permission) => {
      if (!acc[permission.module]) {
        acc[permission.module] = [];
      }
      acc[permission.module].push(permission.action);
      return acc;
    }, {} as Record<string, string[]>);
    const hasManageInAll = groupedPermissions.All && groupedPermissions.All.includes('manage');
    const hasManageInUser = groupedPermissions.User && groupedPermissions.User.includes('manage');

    // Kiểm tra điều kiện tổng quát: 'manager' có trong module 'All' HOẶC module 'User'
    const hasRequiredPermission = hasManageInAll || hasManageInUser;
    if (!hasRequiredPermission) {
      const createdUserAssignment = new this.userAssignmentModel(createUserAssignmentDto);
      return createdUserAssignment.save();
    } else {
      if (hasPermission('manage')) {
        const createdUserAssignment = new this.userAssignmentModel(createUserAssignmentDto);
        return createdUserAssignment.save();
      } else {
        throw new NotFoundException(`User with ID ${userId} does not have permission to create this assignment`);
      }
    }
  }

  async createByCode(createUserAssignmentByCodeDto: CreateUserAssignmentByCodeDto, userId: string, userIdRoles: any[]): Promise<UserAssignment> {
    let createUserAssignmentDto = { ...createUserAssignmentByCodeDto } as unknown as CreateUserAssignmentDto;
    // const organization = await this.organizationsService.findByCode(createUserAssignmentByCodeDto.organizationCode);
    // if (!organization) {
    //   throw new NotFoundException(`Organization with code ${createUserAssignmentByCodeDto.organizationCode} not found`);
    // }
    // createUserAssignmentDto.organizationId = new Types.ObjectId(organization._id);
    // const position = await this.positionsService.findByCode(createUserAssignmentByCodeDto.positionCode);
    // if (!position) {
    //   throw new NotFoundException(`Organization with code ${createUserAssignmentByCodeDto.positionCode} not found`);
    // }
    // createUserAssignmentDto.positionId = new Types.ObjectId(position._id);
    const moduleNames = ['All', 'User'];
    // Hàm tiện ích để kiểm tra quyền
    const hasPermission = (action: string) => {
      return userIdRoles.some(scope =>
        moduleNames.some(moduleName =>
          scope.groupedPermissions?.[moduleName]?.includes(action)
        )
      );
    };

    const roleIds = createUserAssignmentDto.roleIds
      ?.map((roleId: any) => roleId.toString()) ?? [];
    const roles = await this.rolesService.findManyByIds(roleIds);
    const allPermissionIds = roles.flatMap(role => role.permissionIds.map(pId => pId.toString()));
    const uniquePermissionIds = [...new Set(allPermissionIds)];
    const permissions = await this.permissionsService.findManyByIds(uniquePermissionIds);
    //const permissionCodes = permissions.map(p => p.code);
    const groupedPermissions = permissions.reduce((acc, permission) => {
      if (!acc[permission.module]) {
        acc[permission.module] = [];
      }
      acc[permission.module].push(permission.action);
      return acc;
    }, {} as Record<string, string[]>);
    const hasManageInAll = groupedPermissions.All && groupedPermissions.All.includes('manage');
    const hasManageInUser = groupedPermissions.User && groupedPermissions.User.includes('manage');

    // Kiểm tra điều kiện tổng quát: 'manager' có trong module 'All' HOẶC module 'User'
    const hasRequiredPermission = hasManageInAll || hasManageInUser;
    if (!hasRequiredPermission) {
      const createdUserAssignment = new this.userAssignmentModel(createUserAssignmentDto);
      return createdUserAssignment.save();
    } else {
      if (hasPermission('manage')) {
        const createdUserAssignment = new this.userAssignmentModel(createUserAssignmentDto);
        return createdUserAssignment.save();
      } else {
        throw new NotFoundException(`User with ID ${userId} does not have permission to create this assignment`);
      }
    }
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
      .findOne({ userCode: code })
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

  async update(id: string, updateUserAssignmentDto: UpdateUserAssignmentDto, userId: string, userIdRoles: any[]): Promise<UserAssignment> {
    const moduleNames = ['All', 'User'];
    // Hàm tiện ích để kiểm tra quyền
    const hasPermission = (action: string) => {
      return userIdRoles.some(scope =>
        moduleNames.some(moduleName =>
          scope.groupedPermissions?.[moduleName]?.includes(action)
        )
      );
    };
    const userAssignment = await this.userAssignmentModel.findById(id).exec();
    const roleIds = userAssignment.roleIds?.map((roleId: any) => roleId.toString()) ?? [];
    const roles = await this.rolesService.findManyByIds(roleIds);
    const allPermissionIds = roles.flatMap(role => role.permissionIds.map(pId => pId.toString()));
    const uniquePermissionIds = [...new Set(allPermissionIds)];
    const permissions = await this.permissionsService.findManyByIds(uniquePermissionIds);
    //const permissionCodes = permissions.map(p => p.code);
    const groupedPermissions = permissions.reduce((acc, permission) => {
      if (!acc[permission.module]) {
        acc[permission.module] = [];
      }
      acc[permission.module].push(permission.action);
      return acc;
    }, {} as Record<string, string[]>);
    const hasManageInAll = groupedPermissions.All && groupedPermissions.All.includes('manage');
    const hasManageInUser = groupedPermissions.User && groupedPermissions.User.includes('manage');

    // Kiểm tra điều kiện tổng quát: 'manager' có trong module 'All' HOẶC module 'User'
    const hasRequiredPermission = hasManageInAll || hasManageInUser;
    if (!hasRequiredPermission) {
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
    } else {
      if (hasPermission('manage')) {
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
      } else {
        throw new NotFoundException(`User with ID ${userId} does not have permission to update this assignment`);
      }
    }
  }

  async remove(id: string, userId: string, userIdRoles: any[]): Promise<void> {
    const moduleNames = ['All', 'User'];
    // Hàm tiện ích để kiểm tra quyền
    const hasPermission = (action: string) => {
      return userIdRoles.some(scope =>
        moduleNames.some(moduleName =>
          scope.groupedPermissions?.[moduleName]?.includes(action)
        )
      );
    };
    const userAssignment = await this.userAssignmentModel.findById(id).exec();
    const roleIds = userAssignment.roleIds?.map((roleId: any) => roleId.toString()) ?? [];
    const roles = await this.rolesService.findManyByIds(roleIds);
    const allPermissionIds = roles.flatMap(role => role.permissionIds.map(pId => pId.toString()));
    const uniquePermissionIds = [...new Set(allPermissionIds)];
    const permissions = await this.permissionsService.findManyByIds(uniquePermissionIds);
    //const permissionCodes = permissions.map(p => p.code);
    const groupedPermissions = permissions.reduce((acc, permission) => {
      if (!acc[permission.module]) {
        acc[permission.module] = [];
      }
      acc[permission.module].push(permission.action);
      return acc;
    }, {} as Record<string, string[]>);
    const hasManageInAll = groupedPermissions.All && groupedPermissions.All.includes('manage');
    const hasManageInUser = groupedPermissions.User && groupedPermissions.User.includes('manage');

    // Kiểm tra điều kiện tổng quát: 'manager' có trong module 'All' HOẶC module 'User'
    const hasRequiredPermission = hasManageInAll || hasManageInUser;
    if (!hasRequiredPermission) {
      const result = await this.userAssignmentModel.findByIdAndDelete(id).exec();
      if (!result) {
        throw new NotFoundException(`User assignment with ID ${id} not found`);
      }
    } else {
      if (hasPermission('manage')) {
        const result = await this.userAssignmentModel.findByIdAndDelete(id).exec();
        if (!result) {
          throw new NotFoundException(`User assignment with ID ${id} not found`);
        }
      } else {
        throw new NotFoundException(`User with ID ${userId} does not have permission to delete this assignment`);
      }
    }
  }

  async deactivate(id: string, userId: string, userIdRoles: any[]): Promise < UserAssignment > {
    const moduleNames = ['All', 'User'];
    // Hàm tiện ích để kiểm tra quyền
    const hasPermission = (action: string) => {
      return userIdRoles.some(scope =>
        moduleNames.some(moduleName =>
          scope.groupedPermissions?.[moduleName]?.includes(action)
        )
      );
    };
    const userAssignment = await this.userAssignmentModel.findById(id).exec();
    const roleIds = userAssignment.roleIds?.map((roleId: any) => roleId.toString()) ?? [];
    const roles = await this.rolesService.findManyByIds(roleIds);
    const allPermissionIds = roles.flatMap(role => role.permissionIds.map(pId => pId.toString()));
    const uniquePermissionIds = [...new Set(allPermissionIds)];
    const permissions = await this.permissionsService.findManyByIds(uniquePermissionIds);
    //const permissionCodes = permissions.map(p => p.code);
    const groupedPermissions = permissions.reduce((acc, permission) => {
      if (!acc[permission.module]) {
        acc[permission.module] = [];
      }
      acc[permission.module].push(permission.action);
      return acc;
    }, {} as Record<string, string[]>);
    const hasManageInAll = groupedPermissions.All && groupedPermissions.All.includes('manage');
    const hasManageInUser = groupedPermissions.User && groupedPermissions.User.includes('manage');

    // Kiểm tra điều kiện tổng quát: 'manager' có trong module 'All' HOẶC module 'User'
    const hasRequiredPermission = hasManageInAll || hasManageInUser;
    if (!hasRequiredPermission) {
      const userAssignment = await this.userAssignmentModel
        .findByIdAndUpdate(id, { isActive: false }, { new: true })
        .populate('userId', 'username email firstName lastName')
        .populate('organizationId', 'name')
        .populate('positionId', 'name')
        .populate('roleIds', 'name')
        .exec();

      if(!userAssignment) {
        throw new NotFoundException(`User assignment with ID ${id} not found`);
      }

    return userAssignment;
    } else {
      if (hasPermission('manage')) {
       const userAssignment = await this.userAssignmentModel
        .findByIdAndUpdate(id, { isActive: false }, { new: true })
        .populate('userId', 'username email firstName lastName')
        .populate('organizationId', 'name')
        .populate('positionId', 'name')
        .populate('roleIds', 'name')
        .exec();

      if(!userAssignment) {
        throw new NotFoundException(`User assignment with ID ${id} not found`);
      }

    return userAssignment;
      } else {
        throw new NotFoundException(`User with ID ${userId} does not have permission to delete this assignment`);
      }
    }     
    }
  }
