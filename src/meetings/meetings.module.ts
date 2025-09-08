import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';
import { AvailabilityService } from './availability.service';
import { Meeting, MeetingSchema } from './schemas/meeting.schema';
import { MeetingRoom, MeetingRoomSchema } from '../meeting-rooms/schemas/meeting-room.schema';
import { MeetingsCronService } from './meetings.cron.service';  
import { Notification, NotificationSchema } from '../notifications/schemas/notification.schema';
import { NotificationsService } from '../notifications/notifications.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Meeting.name, schema: MeetingSchema },
      { name: MeetingRoom.name, schema: MeetingRoomSchema },
      { name: Notification.name, schema: NotificationSchema },
    ]),
  ],
  controllers: [MeetingsController],
  providers: [MeetingsService, AvailabilityService, MeetingsCronService, NotificationsService],
  exports: [MongooseModule, MeetingsService],
})
export class MeetingsModule {}
