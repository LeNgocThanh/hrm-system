import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { UserAccount, UserAccountDocument } from './schemas/user-account.schema';
import { CreateUserAccountDto, UpdateUserAccountDto, UserAccountResponseDto } from './dto';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UserAccountsService {
  constructor(
    @InjectModel(UserAccount.name) private userAccountModel: Model<UserAccountDocument>
  ) {}

  async create(createUserAccountDto: CreateUserAccountDto): Promise<UserAccountResponseDto> {
    // Check if username already exists
    const existingAccount = await this.userAccountModel.findOne({ 
      username: createUserAccountDto.username 
    });
    if (existingAccount) {
      throw new ConflictException('Username already exists');
    }

    // Check if user already has an account
    const existingUserAccount = await this.userAccountModel.findOne({ 
      userId: createUserAccountDto.userId 
    });
    if (existingUserAccount) {
      throw new ConflictException('User already has an account');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserAccountDto.password, 10);
    
    const accountData = {
      ...createUserAccountDto,
      password: hashedPassword,
    };

    const createdAccount = await this.userAccountModel.create(accountData);
    return this.toResponseDto(createdAccount);
  }

  async findAll(): Promise<UserAccountResponseDto[]> {
    const accounts = await this.userAccountModel
      .find()
      .populate('userId', 'fullName email')
      .exec();
    return accounts.map(account => this.toResponseDto(account));
  }

  async findOne(id: string): Promise<UserAccountResponseDto> {
    const account = await this.userAccountModel
      .findById(id)
      .populate('userId', 'fullName email')
      .exec();
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    return this.toResponseDto(account);
  }

  async findByUsername(username: string): Promise<UserAccountDocument | null> {
    return this.userAccountModel
      .findOne({ username })
      .populate('userId')
      .exec();
  }

  async findByUserId(userId: string): Promise<UserAccountResponseDto | null> {
      const account = await this.userAccountModel
      .findOne({ userId })
      .populate('userId', 'fullName email')
      .exec();      
    return account ? this.toResponseDto(account) : null;
  }

  async update(id: string, updateUserAccountDto: UpdateUserAccountDto): Promise<UserAccountResponseDto> {
    let updateData = { ...updateUserAccountDto };

    // Hash password if provided
    if (updateUserAccountDto.password) {
      updateData.password = await bcrypt.hash(updateUserAccountDto.password, 10);
    }

    const updatedAccount = await this.userAccountModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('userId', 'fullName email')
      .exec();

    if (!updatedAccount) {
      throw new NotFoundException('Account not found');
    }

    return this.toResponseDto(updatedAccount);
  }
  //only for reset password
  async changePassword(
    id: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<UserAccountResponseDto> {
    const { oldPassword, newPassword } = changePasswordDto;

    // 1. Find the user account
    const userAccount = await this.userAccountModel.findById(id);
    if (!userAccount) {
      throw new HttpException('Account not found', HttpStatus.NOT_FOUND);
    }

    // 2. Compare the old password with the stored password
    const isPasswordMatch = await bcrypt.compare(oldPassword, userAccount.password);
    if (!isPasswordMatch) {
      throw new HttpException('Invalid old password', HttpStatus.BAD_REQUEST);
    }

    // 3. Hash the new password
    const salt = await bcrypt.genSalt(10);
    userAccount.password = await bcrypt.hash(newPassword, salt);

    // 4. Save the updated user account
    const updatedUser = await userAccount.save();

    // 5. Return the updated user without the password field
    // (You'll need a way to transform the Mongoose document to a DTO,
    // for example, by creating a UserAccountResponseDto class)
    const userResponse = new UserAccountResponseDto();
    // Assuming your DTO has these fields
    userResponse._id = updatedUser._id as string;
    userResponse.userId = updatedUser.userId.toString();
    userResponse.username = updatedUser.username;
    // ...other fields

    return userResponse;
  }

  async remove(id: string): Promise<UserAccountResponseDto> {
    const deletedAccount = await this.userAccountModel
      .findByIdAndDelete(id)
      .populate('userId', 'fullName email')
      .exec();

    if (!deletedAccount) {
      throw new NotFoundException('Account not found');
    }

    return this.toResponseDto(deletedAccount);
  }

  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userAccountModel.findByIdAndUpdate(id, {
      lastLoginAt: new Date(),
      loginAttempts: 0, // Reset login attempts on successful login
    });
  }

  async incrementLoginAttempts(id: string): Promise<void> {
    const account = await this.userAccountModel.findById(id);
    if (account) {
      account.loginAttempts += 1;
      
      // Lock account after 5 failed attempts for 30 minutes
      if (account.loginAttempts >= 5) {
        account.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      }
      
      await account.save();
    }
  }

  private toResponseDto(account: UserAccountDocument): UserAccountResponseDto {
    const accountObj = account.toObject();
    // Remove sensitive fields
    delete accountObj.password;
    delete accountObj.resetPasswordToken;
    delete accountObj.twoFactorSecret;
    
    return accountObj as UserAccountResponseDto;
  }
}
