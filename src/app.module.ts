import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PositionsModule } from './positions/positions.module';
import { PermissionsModule } from './permissions/permissions.module';
import { RolesModule } from './roles/roles.module';
import { UserAssignmentsModule } from './user-assignments/user-assignments.module';
import { UserProfileModule } from './user-profile/user-profile.module';
import { UploadFilesModule } from './upload-files/upload-files.module';
import { UserDocumentsModule } from './user-documents/user-documents.module';
import { FilesModule } from './files/files.module';
import { AuthModule } from './auth/auth.module';
import { UserAccountsModule } from './user-accounts/user-accounts.module';
import { ConfigModule } from '@nestjs/config';
import { AssetsModule } from './assets/assets.module';
import { MeetingRoomsModule } from './meeting-rooms/meeting-rooms.module';
import { MeetingsModule } from './meetings/meetings.module';
import { ScheduleModule} from '@nestjs/schedule';
import { NotificationsModule } from './notifications/notifications.module';
import { NoticesModule } from './notices/notices.module';
import { LeaveModule } from './leave/leave.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Cho phép dùng ở mọi nơi
    }),

    MongooseModule.forRoot(process.env.MongoDB_URI || 'mongodb://localhost:27017/hrm'), 
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    UserAccountsModule,
    OrganizationsModule,
    PositionsModule,
    PermissionsModule,
    RolesModule,
    UserAssignmentsModule,
    UserProfileModule,
    UploadFilesModule,
    UserDocumentsModule,
    FilesModule,
    AssetsModule,
    MeetingRoomsModule,
    MeetingsModule,
    NotificationsModule,
    NoticesModule,
    LeaveModule, 
  ]
})
export class AppModule {}
