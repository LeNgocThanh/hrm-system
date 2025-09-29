import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, UserSchema } from './schemas/user.schema';
import { UserAssignmentsModule } from 'src/user-assignments/user-assignments.module';
import { OrganizationsModule } from 'src/organizations/organizations.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    UserAssignmentsModule,
    OrganizationsModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // Exporting UsersService for use in other modules
})
export class UsersModule {}
