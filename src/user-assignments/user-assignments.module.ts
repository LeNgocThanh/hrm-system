import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserAssignmentsController } from './user-assignments.controller';
import { UserAssignmentsService } from './user-assignments.service';
import { UserAssignment, UserAssignmentSchema } from './schemas/user-assignment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserAssignment.name, schema: UserAssignmentSchema },
    ]),
  ],
  controllers: [UserAssignmentsController],
  providers: [UserAssignmentsService],
  exports: [UserAssignmentsService],
})
export class UserAssignmentsModule {}
