import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { UserPolicyBindingService } from './user-policies.service';
import { CreateUserPolicyBindingDto } from './dto/create-user-policy-binding.dto';
import { UpdateUserPolicyBindingDto } from './dto/update-policy-binding.dto';
import { ListUserPolicyQueryDto } from './dto/list-user-policy-query.dto';
import { ResolveUserPolicyQueryDto } from './dto/resolve-user-policy-query.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery } from '@nestjs/swagger';

@ApiTags('user-policy-bindings')
@Controller('user-policy-bindings')
export class UserPolicyBindingController {
  constructor(private readonly userPolicyBindingService: UserPolicyBindingService) {}
  
  @Post()
  @ApiOperation({ summary: 'Tạo một ràng buộc chính sách người dùng mới' })
  @ApiBody({ type: CreateUserPolicyBindingDto })
  @ApiResponse({ status: 201, description: 'Ràng buộc đã được tạo thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ.' })
  create(@Body() createPolicyBindingDto: CreateUserPolicyBindingDto) {
    return this.userPolicyBindingService.create(createPolicyBindingDto);
  }
  
  @Get()
  @ApiOperation({ summary: 'Lấy danh sách ràng buộc chính sách (có lọc)' })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'policyType', required: false, enum: ListUserPolicyQueryDto.prototype.policyType })
  @ApiQuery({ name: 'onDate', required: false, type: String, description: 'Lọc các binding đang hiệu lực tại ngày này (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Trả về danh sách các ràng buộc.' })
  findAll(@Query() query: ListUserPolicyQueryDto) {
    return this.userPolicyBindingService.findAll(query);
  }
  
  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết của một ràng buộc theo ID' })
  @ApiResponse({ status: 200, description: 'Thông tin ràng buộc.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy ràng buộc.' })
  findOne(@Param('id') id: string) {
    return this.userPolicyBindingService.findOne(id);
  }
  
  /**
   * [R] Truy vấn chính sách có hiệu lực tại một ngày (Resolve)
   */
  @Get('resolve-policy/query')
  @ApiOperation({ summary: 'Truy vấn chính sách cụ thể đang có hiệu lực cho một người dùng tại một ngày' })
  @ApiResponse({ status: 200, description: 'Trả về chính sách có hiệu lực (hoặc null).' })
  resolvePolicy(@Query() query: ResolveUserPolicyQueryDto) {
    return this.userPolicyBindingService.resolvePolicy(query);
  }


  /**
   * [U] Cập nhật ràng buộc theo ID
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật một phần thông tin của ràng buộc theo ID' })
  @ApiBody({ type: UpdateUserPolicyBindingDto })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy ràng buộc.' })
  update(@Param('id') id: string, @Body() updatePolicyBindingDto: UpdateUserPolicyBindingDto) {
    return this.userPolicyBindingService.update(id, updatePolicyBindingDto);
  }

  /**
   * [D] Xóa ràng buộc theo ID
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa một ràng buộc chính sách theo ID' })
  @ApiResponse({ status: 204, description: 'Xóa thành công.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy ràng buộc.' })
  remove(@Param('id') id: string) {
    return this.userPolicyBindingService.remove(id);
  }
}