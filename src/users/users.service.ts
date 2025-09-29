import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto';
import { UserAssignmentsService } from 'src/user-assignments/user-assignments.service';
import { OrganizationsService } from 'src/organizations/organizations.service';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly userAssignmentsService: UserAssignmentsService,
    private readonly organizationsService: OrganizationsService,
  ) { }

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    // Hash password before saving
    //const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    //const userData = { ...createUserDto, password: hashedPassword };

    const createdUser = await this.userModel.create(createUserDto);
    return createdUser.toObject() as unknown as UserResponseDto;
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.userModel.find().exec();
    return users.map(user => user.toObject() as unknown as UserResponseDto);
  }

  async findByOrganization(userId: string, roles: any[]): Promise<UserResponseDto[]> {
    const filter: FilterQuery<UserResponseDto> = {};   
    const moduleNames = ['All', 'User'];
    console.log('Roles:', roles);
    console.log('User ID:', userId);
    // Hàm tiện ích để kiểm tra quyền
    const hasPermission = (action: string) => {
      return roles.some(scope =>
        moduleNames.some(moduleName =>
          scope.groupedPermissions?.[moduleName]?.includes(action)
        )
      );
    };

    // 1. Kiểm tra quyền "manage"
    if (hasPermission('manage')) {
      // Có quyền manage => get tất cả
      const users = await this.userModel.find().exec();
      return users.map(user => user.toObject() as unknown as UserResponseDto);
    }

    // 2. Kiểm tra quyền "read"
    if (hasPermission('read')) {
      // Có quyền read => get toàn bộ cây tổ chức
      console.log('Fetching users have read:', userId);
      const userAssignments = await this.userAssignmentsService.findByUserId(userId);
      const userOrgIds = userAssignments.map(a => a.organizationId._id.toString());


      const allUsersInScope = new Set<string>();
      for (const orgId of userOrgIds) {
        const { users } = await this.organizationsService.findUsersInTree(orgId);
        users.forEach(user => allUsersInScope.add(user._id.toString()));
      }

      filter._id = { $in: Array.from(allUsersInScope).map(id => new Types.ObjectId(id)) };      
      const users = await this.userModel.find(filter).exec();
      return users.map(user => user.toObject() as unknown as UserResponseDto);
    }

    // 3. Kiểm tra quyền "viewOwner"
    if (hasPermission('viewOwner')) {
      // Chỉ có quyền viewOwner => chỉ get của chính mình
      filter._id = new Types.ObjectId(userId);
      const users = await this.userModel.find(filter).exec();
      return users.map(user => user.toObject() as unknown as UserResponseDto);
    }
    // Nếu không có quyền nào thì trả về rỗng
    return [];    
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.userModel.findById(id).exec();
    return user?.toObject() as unknown as UserResponseDto;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    // Hash password if it's being updated
    let updateData = { ...updateUserDto };
    //   if (updateUserDto.password) {
    //    updateData.password = await bcrypt.hash(updateUserDto.password, 10);
    //  }

    const updatedUser = await this.userModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
    return updatedUser?.toObject() as unknown as UserResponseDto;
  }

  async delete(id: string): Promise<UserResponseDto> {
    const deletedUser = await this.userModel.findByIdAndDelete(id).exec();
    return deletedUser?.toObject() as unknown as UserResponseDto;
  }

  // Method to verify password (for login purposes)
  // async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  //   return bcrypt.compare(plainPassword, hashedPassword);
  //  }

  // Method to find user by email (for login purposes)
  async findByEmail(email: string): Promise<UserResponseDto | null> {
    const user = await this.userModel.findOne({ email }).exec();
    return user ? user.toObject() as unknown as UserResponseDto : null;
  }
}
