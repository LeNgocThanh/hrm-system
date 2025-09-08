import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { MeetingRoomsService } from './meeting-rooms.service';
//import { Permissions } from '@/common/guards/permissions.decorator';
import { CreateMeetingRoomDto } from './dto/create-meeting-room.dto';
import { UpdateMeetingRoomDto } from './dto/update-meeting-room.dto';
import { ListMeetingRoomsQueryDto } from './dto/list-meeting-rooms.dto';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MeetingRoom } from './schemas/meeting-room.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Meeting Rooms')
@ApiBearerAuth()
@Controller('meeting-rooms')
//@UseGuards(JwtAuthGuard)
export class MeetingRoomsController {
  constructor(private readonly rooms: MeetingRoomsService) {}

  @Post()
//  @Permissions({ modules: { anyOf: ['MeetingRooms'] }, actions: { anyOf: ['create'] } })
  @ApiOperation({ summary: 'Tạo phòng họp' })
  @ApiOkResponse({ type: MeetingRoom })
  create(@Body() body: CreateMeetingRoomDto) {
    return this.rooms.create(body);
  }

  @Patch(':id')
//  @Permissions({ modules: { anyOf: ['MeetingRooms'] }, actions: { anyOf: ['update'] } })
  @ApiOperation({ summary: 'Cập nhật phòng họp' })
  @ApiOkResponse({ type: MeetingRoom })
  update(@Param('id') id: string, @Body() patch: UpdateMeetingRoomDto) {
    return this.rooms.update(id, patch);
  }

  @Get(':id')
//  @Permissions({ modules: { anyOf: ['MeetingRooms'] }, actions: { anyOf: ['read'] } })
  @ApiOperation({ summary: 'Xem chi tiết phòng họp' })
  @ApiOkResponse({ type: MeetingRoom })
  getOne(@Param('id') id: string) {
    return this.rooms.getOne(id);
  }

  @Get()
//  @Permissions({ modules: { anyOf: ['MeetingRooms'] }, actions: { anyOf: ['read'] } })
  @ApiOperation({ summary: 'Danh sách phòng họp' })
  @ApiOkResponse({ type: [MeetingRoom] })
  list(@Query() q: ListMeetingRoomsQueryDto) {
    return this.rooms.list(q.organizationId);
  }
}
