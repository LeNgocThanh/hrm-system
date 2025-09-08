import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

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
