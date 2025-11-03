import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserAssignmentsController } from './user-assignments.controller';
import { UserAssignmentsService } from './user-assignments.service';
import { UserAssignment, UserAssignmentSchema } from './schemas/user-assignment.schema';
import { RolesModule } from 'src/roles/roles.module';
import { RoleDocument, RoleSchema } from 'src/roles/schemas/role.schema';
import { RolesService } from 'src/roles/roles.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserAssignment.name, schema: UserAssignmentSchema },
      { name: RolesModule.name, schema: RoleSchema },
    ]),
  ],
  controllers: [UserAssignmentsController],
  providers: [UserAssignmentsService, RolesService],
  exports: [UserAssignmentsService],
})
export class UserAssignmentsModule {}
