// src/attendance/user-shift-session.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  UserShiftSession,
  UserShiftSessionSchema,
} from './schemas/user-shift-session.schema';
import { UserShiftSessionService } from './user-shift-session.service';
import { UserShiftSessionController } from './user-shift-session.controller';
import { UserAssignmentSchema } from 'src/user-assignments/schemas/user-assignment.schema';
import { UserAssignmentsModule } from 'src/user-assignments/user-assignments.module';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserShiftSession.name, schema: UserShiftSessionSchema },
       { name: 'UserAssignment', schema: UserAssignmentSchema },
    ]),
    UserAssignmentsModule,
  ],
  controllers: [UserShiftSessionController],
  providers: [UserShiftSessionService],
  exports: [UserShiftSessionService],
})
export class UserShiftSessionModule {}
