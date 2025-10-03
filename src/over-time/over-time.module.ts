import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OvertimeController } from './over-time.controller';
import { OvertimeService } from './over-time.service';
import { OvertimeRequest, OvertimeRequestSchema } from './schemas/overtime-request.schema';
import { UserAssignmentsModule } from 'src/user-assignments/user-assignments.module';
import { OrganizationsModule } from 'src/organizations/organizations.module';
import { UserTimeEntriesModule } from 'src/user-time-entries/user-time-entries.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OvertimeRequest.name, schema: OvertimeRequestSchema },
    ]),
    UserAssignmentsModule,
    OrganizationsModule,
    UserTimeEntriesModule,
  ],
  controllers: [OvertimeController],
  providers: [OvertimeService],
  exports: [OvertimeService],
})
export class OverTimeModule {}
