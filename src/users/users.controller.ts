import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Req, UseInterceptors, UploadedFile } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UserResponseDto, UserWithOrgResponseDto,ImportUserRow } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import * as XLSX from 'xlsx';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @RequirePermissions({
  modules: { anyOf: ['All', 'User'] },
  actions: { anyOf: ['manage','create'] },})
  @Post()
  create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {    
    return this.usersService.create(createUserDto);
  }


  @RequirePermissions({
  modules: { anyOf: ['All', 'User'] },
  actions: { anyOf: ['manage','read', 'viewOwner'] },})
  @Get()
  findAll(): Promise<UserResponseDto[]> {
    return this.usersService.findAll();
  }

  @RequirePermissions({ modules: { anyOf: ['User', 'All'] }, actions: { anyOf: ['read', 'viewOwner', 'manage'] } })
  @Get('/by-organization')
  findByOrganizations(@Req() req: any): Promise<UserResponseDto[]> {
    const userId = req.user.userId;
    const roles = req.user.roles;
    return this.usersService.findByOrganization(userId, roles);
  }

  @RequirePermissions({ modules: { anyOf: ['User', 'All'] }, actions: { anyOf: ['read', 'viewOwner', 'manage'] } })
  @Get('/withOrganizationName')
  findByOrganizationWithInfo(@Req() req: any): Promise<UserWithOrgResponseDto[]> {
    const userId = req.user.userId;
    const roles = req.user.roles;
    return this.usersService.findByOrganizationWithInfo(userId, roles);
  }
  
  @RequirePermissions({
  modules: { anyOf: ['All', 'User'] },
  actions: { anyOf: ['manage','read'] },})
  @Get(':id')
  findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  @RequirePermissions({
  modules: { anyOf: ['All', 'User'] },
  actions: { anyOf: ['manage','update'] },})
  @Put(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    return this.usersService.update(id, updateUserDto);
  }

  @RequirePermissions({
  modules: { anyOf: ['All', 'User'] },
  actions: { anyOf: ['manage','delete'] },})
  @Delete(':id')
  delete(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.delete(id);
  }

  @RequirePermissions({
  modules: { anyOf: ['All', 'User'] },
  actions: { anyOf: ['manage','read'] },})
  @Post('import')
@UseInterceptors(FileInterceptor('file'))
async importUsers(
  @UploadedFile() file: Express.Multer.File,
  @Req() req: any,
) {
  const workbook = XLSX.read(file.buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet);

  // Bước parse từ any[] -> ImportUserRow[]  

  const parsedRows: ImportUserRow[] = rows.map((r: any) => {
  let birthDay: Date | undefined;

  const rawBirth = r['birthDay'];
  if (typeof rawBirth === 'number') {
    // Trường hợp Excel trả số serial
    birthDay = excelSerialToDate(rawBirth);
  } else if (typeof rawBirth === 'string' && rawBirth.trim()) {
    // Nếu bạn quy ước yyyy-MM-dd thì new Date(rawBirth) khá an toàn
    birthDay = new Date(rawBirth.trim());
  }

  return {
    fullName: r['Họ tên'],
    gender: r['Giới tính'],
    email: r['Email'],
    phone: r['Phone'],
    birthDay: birthDay,
    orgCode: r['orgCode'],
    userCode: r['userCode'],
  };
});
  

 // const currentUserId = req.user?.id; // nếu bạn có auth
   const userId = req.user.userId;
    const roles = req.user.roles;
  // Gọi service xử lý tạo user + user_assignment + findByCode(orgCode)
  return this.usersService.importUsersWithAssignments(parsedRows, userId, roles);
}
}
function excelSerialToDate(value: number): Date | undefined {
  const parsed = XLSX.SSF.parse_date_code(value);
  if (!parsed) return undefined;
  // Dùng UTC để tránh lệch ngày do timezone
  return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
}
