// src/leave/leave.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeaveController } from './leave.controller';
import { LeaveService } from './leave.service';
import { LeaveRequest, LeaveRequestSchema } from './schemas/leave-request.schema';
import { UserAssignmentsModule } from 'src/user-assignments/user-assignments.module';
import { OrganizationsModule } from 'src/organizations/organizations.module';
import { UserTimeEntriesModule } from 'src/user-time-entries/user-time-entries.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LeaveRequest.name, schema: LeaveRequestSchema },
    ]),
    UserAssignmentsModule,
    OrganizationsModule,
    UserTimeEntriesModule,
  ],
  controllers: [LeaveController],
  providers: [LeaveService],
  exports: [LeaveService],
})
export class LeaveModule {}
