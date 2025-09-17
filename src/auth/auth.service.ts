import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserAccountsService } from '../user-accounts/user-accounts.service';
import { UsersService } from '../users/users.service';
import { UserAssignmentsService } from '../user-assignments/user-assignments.service';
import { RolesService } from '../roles/roles.service';
import { PermissionsService } from '../permissions/permissions.service';
import { OrganizationsService } from '../organizations/organizations.service';
import * as bcrypt from 'bcrypt';
import { UserAssignment } from '../user-assignments/schemas/user-assignment.schema';
import { Permission } from '../permissions/schemas/permission.schema';

export interface JwtPayload {
  sub: string;
  email: string;
  fullName: string;
  roles?: OrganizationPermissions[];
}

export interface OrganizationPermissions {
  organizationId: string;
  permissions: string[];
  groupedPermissions: Record<string, string[]>;
}

@Injectable()
export class AuthService {
  constructor(
    private userAccountsService: UserAccountsService,
    private jwtService: JwtService,
    private usersService: UsersService,
    private userAssignmentsService: UserAssignmentsService,
    private rolesService: RolesService,
    private permissionsService: PermissionsService,
  ) { }

  async validateUser(username: string, password: string): Promise<any> {
    const account = await this.userAccountsService.findByUsername(username);
    if (!account) {
      throw new UnauthorizedException('Account not found');
    }
    if (account.status !== 'active' || !(await bcrypt.compare(password, account.password))) {
      await this.userAccountsService.incrementLoginAttempts(account._id.toString());
      throw new UnauthorizedException('Invalid credentials or account is not active');
    }

    // Cập nhật thời gian đăng nhập lần cuối và reset số lần đăng nhập sai
    await this.userAccountsService.updateLastLogin(account._id.toString());

    // Lấy thông tin user (đã được populate)
    const user = account.userId;

    return {
      accountId: account._id,
      userId: user._id,
      username: account.username,
      user: user,
    };
  }

  async login(username: string, password: string) {
    const validatedData = await this.validateUser(username, password);
    if (!validatedData) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const userId = validatedData.userId.toString();

    // 1. Lấy thông tin người dùng chi tiết
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new UnauthorizedException('User profile not found');
    }
    // 2. Lấy các assignments của người dùng
    const userAssignments = await this.userAssignmentsService.findByUserId(userId);
    // 3. Xử lý quyền hạn theo tổ chức
    const scopedPermissions: OrganizationPermissions[] = [];
    if (userAssignments && userAssignments.length > 0) {
      for (const assignment of userAssignments) {
        const roleIds = assignment.roleIds.map((roleId: any) => roleId._id.toString());

        // 4. Lấy tất cả các roles và permissions
        const roles = await this.rolesService.findManyByIds(roleIds);
        const allPermissionIds = roles.flatMap(role => role.permissionIds.map(pId => pId.toString()));
        const uniquePermissionIds = [...new Set(allPermissionIds)];
        const permissions = await this.permissionsService.findManyByIds(uniquePermissionIds);
        const permissionCodes = permissions.map(p => p.code);
        const groupedPermissions = permissions.reduce((acc, permission) => {
          if (!acc[permission.module]) {
            acc[permission.module] = [];
          }
          acc[permission.module].push(permission.action);
          return acc;
        }, {} as Record<string, string[]>);

        scopedPermissions.push({
          organizationId: assignment.organizationId.toString(),
          permissions: permissionCodes,
          groupedPermissions: groupedPermissions,
        });
      }
    }

    // Tạo JWT payload
    const payload: JwtPayload = {
      sub: userId,
      email: user.email,
      fullName: user.fullName,
      roles: scopedPermissions,
    };

    const refresh_tokenPayLoad: JwtPayload = {
      sub: userId,
      email: user.email,
      fullName: user.fullName,     
    };

    // Trả về access token, refresh token và các thông tin đã tổng hợp
    return {
      access_token: this.jwtService.sign(payload, { expiresIn: process.env.JWT_EXPIRATION_TIME || '4h' }), // Tạo access token
      refresh_token: this.jwtService.sign(refresh_tokenPayLoad, { expiresIn: process.env.JWT_REFRESH_EXPIRATION_TIME || '2d' }), // Tạo refresh token
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        employeeStatus: user.employeeStatus,
      },
      scopedPermissions,
    };
  }

  async refreshToken(userId: string) {
    // Find account by userId to get user info
    // Lưu ý: Ở đây bạn cần xác thực refresh token từ cookie, không phải chỉ dựa vào userId
    // Logic này cần được điều chỉnh để đọc và xác thực refresh token từ request
    const account = await this.userAccountsService.findByUserId(userId);
    if (!account) {
      throw new UnauthorizedException('Account not found');
    }

    const user = account.userId as any;

    const userAssignments = await this.userAssignmentsService.findByUserId(userId);
    const scopedPermissions: OrganizationPermissions[] = [];
    if (userAssignments && userAssignments.length > 0) {
      for (const assignment of userAssignments) {
        const roleIds = assignment.roleIds.map((roleId: any) => roleId._id.toString());
        const roles = await this.rolesService.findManyByIds(roleIds);
        const allPermissionIds = roles.flatMap(r => r.permissionIds.map((pId: any) => pId.toString()));
        const uniquePermissionIds = [...new Set(allPermissionIds)];
        const permissions = await this.permissionsService.findManyByIds(uniquePermissionIds);
        const permissionCodes = permissions.map((p: any) => p.code);
        const groupedPermissions = permissions.reduce((acc: Record<string, string[]>, p: any) => {
          if (!acc[p.module]) acc[p.module] = [];
          acc[p.module].push(p.action);
          return acc;
        }, {});
        scopedPermissions.push({
          organizationId: assignment.organizationId.toString(),
          permissions: permissionCodes,
          groupedPermissions,
        });
      }
    }

    // 3) Payload đồng nhất với login (có roles/scopedPermissions nếu bạn đang dùng)
    const payload: JwtPayload = {
      sub: userId,
      email: user.email,
      fullName: user.fullName,
      roles: scopedPermissions, 
    };

     const refresh_tokenPayLoad: JwtPayload = {
      sub: userId,
      email: user.email,
      fullName: user.fullName,      
    };

    // 4) Ký lại access & refresh
    const access_token = this.jwtService.sign(payload, { expiresIn: process.env.JWT_EXPIRATION_TIME || '4h' });
    const refresh_token = this.jwtService.sign(refresh_tokenPayLoad, { expiresIn: process.env.JWT_REFRESH_EXPIRATION_TIME || '7d' });

    return {
      access_token,
      refresh_token,           
      scopedPermissions,      
    };
  }

  // Hàm để xác thực refresh token (cần bổ sung)
  async validateRefreshToken(token: string): Promise<JwtPayload | null> {
    try {
      const payload = this.jwtService.verify(token);
      // Bạn có thể thêm logic kiểm tra blacklist token ở đây
      return payload;
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
