import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserAccountsService } from './user-accounts.service';
import { CreateUserAccountDto, UpdateUserAccountDto, UserAccountResponseDto } from './dto';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('User Accounts')
@Controller('user-accounts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserAccountsController {
  constructor(private readonly userAccountsService: UserAccountsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user account' })
  @ApiResponse({ 
    status: 201, 
    description: 'User account created successfully',
    type: UserAccountResponseDto 
  })
  @ApiResponse({ status: 409, description: 'Username already exists or user already has an account' })
  create(@Body() createUserAccountDto: CreateUserAccountDto): Promise<UserAccountResponseDto> {
    return this.userAccountsService.create(createUserAccountDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all user accounts' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of all user accounts',
    type: [UserAccountResponseDto] 
  })
  findAll(): Promise<UserAccountResponseDto[]> {
    return this.userAccountsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user account by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'User account found',
    type: UserAccountResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Account not found' })
  findOne(@Param('id') id: string): Promise<UserAccountResponseDto> {
    return this.userAccountsService.findOne(id);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user account by user ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'User account found',
    type: UserAccountResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Account not found' })
  findByUserId(@Param('userId') userId: string): Promise<UserAccountResponseDto | null> {
    return this.userAccountsService.findByUserId(userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user account' })
  @ApiResponse({ 
    status: 200, 
    description: 'User account updated successfully',
    type: UserAccountResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Account not found' })
  update(
    @Param('id') id: string, 
    @Body() updateUserAccountDto: UpdateUserAccountDto
  ): Promise<UserAccountResponseDto> {
    return this.userAccountsService.update(id, updateUserAccountDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user account' })
  @ApiResponse({ 
    status: 200, 
    description: 'User account deleted successfully',
    type: UserAccountResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Account not found' })
  remove(@Param('id') id: string): Promise<UserAccountResponseDto> {
    return this.userAccountsService.remove(id);
  }
}
