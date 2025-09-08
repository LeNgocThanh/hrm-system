import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { Organization, OrganizationSchema } from './schemas/organizations.schema';
import { UserAssignmentsModule } from 'src/user-assignments/user-assignments.module';
import { UserAssignment, UserAssignmentSchema } from 'src/user-assignments/schemas/user-assignment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
      { name: UserAssignment.name, schema: UserAssignmentSchema }, 
    ]),
    UserAssignmentsModule,
  ],
  providers: [OrganizationsService],
  controllers: [OrganizationsController]
})
export class OrganizationsModule {}
