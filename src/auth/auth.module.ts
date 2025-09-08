import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserAccountsModule } from '../user-accounts/user-accounts.module';
import { UsersModule } from '../users/users.module';
import { UserAssignmentsModule } from '../user-assignments/user-assignments.module';
import { RolesModule } from '../roles/roles.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [
    UserAccountsModule,
    PassportModule,
    UsersModule,
    UserAssignmentsModule,
    RolesModule,
    PermissionsModule,
    OrganizationsModule,  
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
