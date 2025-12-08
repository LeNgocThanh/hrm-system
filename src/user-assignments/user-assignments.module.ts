import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserAssignmentsController } from './user-assignments.controller';
import { UserAssignmentsService } from './user-assignments.service';
import { UserAssignment, UserAssignmentSchema } from './schemas/user-assignment.schema';
import { RolesModule } from 'src/roles/roles.module';
import { PermissionsModule } from 'src/permissions/permissions.module';
import { RoleSchema, RoleDocument } from 'src/roles/schemas/role.schema';
import { PermissionSchema, PermissionDocument } from 'src/permissions/schemas/permission.schema';
import { PositionsModule } from 'src/positions/positions.module';
import { PositionSchema, PositionDocument, Position } from 'src/positions/schemas/position.schema';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserAssignment.name, schema: UserAssignmentSchema },
      { name: 'RoleDocument', schema: RoleSchema },
      { name: 'PermissionDocument', schema: PermissionSchema },    
    
    ]),
    RolesModule,
    PermissionsModule,    
  ],
  controllers: [UserAssignmentsController],
  providers: [UserAssignmentsService],
  exports: [UserAssignmentsService],
})
export class UserAssignmentsModule {}
