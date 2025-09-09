import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req } from '@nestjs/common'
import { NoticesService } from './notices.service'
import { CreateNoticeDto } from './dto/create-notice.dto'
import { UpdateNoticeDto } from './dto/update-notice.dto'
import { QueryNoticesDto } from './dto/query-notices.dto'

@Controller('notices')
export class NoticesController {
  constructor(private readonly service: NoticesService) {}

  @Post()
  create(@Body() dto: CreateNoticeDto, @Req() req: any) {
    return this.service.create(dto, req.user?._id)
  }

  @Get()
  findAll(@Query() query: QueryNoticesDto, @Req() req: any) {
    return this.service.findAll(query, req.user?.permissions || [])
  }

  @Get(':idOrSlug')
  findOne(@Param('idOrSlug') idOrSlug: string, @Req() req: any) {
    return this.service.findOne(idOrSlug, req.user?.permissions || [])
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateNoticeDto, @Req() req: any) {
    return this.service.update(id, dto, req.user?._id)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id)
  }
}