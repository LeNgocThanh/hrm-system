import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MeetingRoomsService } from './meeting-rooms.service';
import { MeetingRoomsController } from './meeting-rooms.controller';
import { MeetingRoom, MeetingRoomSchema } from './schemas/meeting-room.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MeetingRoom.name, schema: MeetingRoomSchema },
    ]),
  ],
  providers: [MeetingRoomsService],
  controllers: [MeetingRoomsController],
  exports: [MongooseModule, MeetingRoomsService],
})
export class MeetingRoomsModule {}
