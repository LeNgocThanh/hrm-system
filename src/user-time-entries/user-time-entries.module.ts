import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserTimeEntriesController } from './user-time-entries.controller';
import { UserTimeEntriesService } from './user-time-entries.service';
import { UserTimeEntry, UserTimeEntrySchema } from './schemas/user-time-entries.schema';


@Module({
  imports: [
    MongooseModule.forFeature([{ name: UserTimeEntry.name, schema: UserTimeEntrySchema }]),
  ],
  controllers: [UserTimeEntriesController],
  providers: [UserTimeEntriesService],
  exports: [UserTimeEntriesService],
})
export class UserTimeEntriesModule {}
