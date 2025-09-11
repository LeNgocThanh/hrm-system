import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, Patch, UseGuards} from '@nestjs/common'
import { NoticesService } from './notices.service'
import { CreateNoticeDto } from './dto/create-notice.dto'
import { UpdateNoticeDto } from './dto/update-notice.dto'
import { QueryNoticesDto } from './dto/query-notices.dto'
import { AdminQueryNoticesDto } from './dto/admin-query-noties.dto'
import { AdminPatchNoticeDto } from './dto/admin-patch-notice.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notices')
@UseGuards(JwtAuthGuard)
export class NoticesController {
  constructor(private readonly service: NoticesService) {}

  @Post()
  create(@Body() dto: CreateNoticeDto, @Req() req: any) {
    return this.service.create(dto, req.user?.userId)
  }

  @Get('admin')
  async findAllAdmin(@Query() dto: AdminQueryNoticesDto) {
    console.log('AdminQueryNoticesDto', dto)
    return this.service.findAllAdmin(dto)
  }

  @Get()
  findAll(@Query() query: QueryNoticesDto, @Req() req: any) {
    return this.service.findAll(query, req.user?.permissions || [])
  }

  @Get(':idOrSlug')
  findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.service.findOne(idOrSlug)
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateNoticeDto, @Req() req: any) {
    return this.service.update(id, dto, req.user?.userId)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id)
  }   

  @Patch(':id')
  async patchOne(
    @Param('id') id: string,
    @Body() dto: AdminPatchNoticeDto,
    @Req() req: any, // tuỳ hệ thống auth, có thể là request.user
  ) {
    // Nếu hệ thống của anh/chị có req.user.sub hoặc req.user._id:
    const updatedBy = req?.user?.userId || req?.user?._id  
    return this.service.patchAdmin(id, dto, { updatedBy })
  }
}