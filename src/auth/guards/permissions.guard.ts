// permissions.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSIONS_KEY,
  PermissionRequirement,
} from '../decorators/permissions.decorator';

// Mỗi scope trong roles[] của accessToken
type RoleScope = {
  organizationId: string;
  permissions?: string[]; // ví dụ: ['User:manage', 'All:manage']
  groupedPermissions?: Record<string, string[]>; // { User: ['manage'], All: ['manage'] }
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Lấy yêu cầu permission từ @RequirePermissions(...)
    const requirement = this.reflector.getAllAndOverride<PermissionRequirement>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Nếu endpoint không gắn decorator => chỉ cần JwtAuthGuard là đủ
    if (!requirement) return true;

    const req = context.switchToHttp().getRequest();
    
    const user = req.user as { roles?: RoleScope[] };
   
    if (!user?.roles || user.roles.length === 0) return false;

    // Chỉ cần 1 scope thỏa điều kiện là pass
    return user.roles.some((scope) => this.scopeSatisfies(scope, requirement));
  }

  private scopeSatisfies(
    scope: RoleScope,
    requirement: PermissionRequirement,
  ): boolean {
    const grouped = scope.groupedPermissions ?? {};
    const scopeModules = Object.keys(grouped);

    const { modules, actions } = requirement;

    // ===== 1) Kiểm tra module (anyOf / allOf) =====
    let moduleOk = true;

    if (modules?.anyOf && modules.anyOf.length > 0) {
      moduleOk = modules.anyOf.some((m) => scopeModules.includes(m));
      if (!moduleOk) return false; // fail sớm
    }

    if (modules?.allOf && modules.allOf.length > 0) {
      const allOk = modules.allOf.every((m) => scopeModules.includes(m));
      moduleOk = moduleOk && allOk;
      if (!moduleOk) return false; // fail sớm
    }

    // ===== 2) Gom action của các module liên quan để kiểm tra actions =====
    // Nếu có modules.* => chỉ gom từ các module đó.
    // Nếu không khai báo modules => gom toàn bộ groupedPermissions.
    let candidateModules: string[] = [];

    if (modules?.anyOf && modules.anyOf.length > 0) {
      candidateModules.push(...modules.anyOf.filter((m) => scopeModules.includes(m)));
    }
    if (modules?.allOf && modules.allOf.length > 0) {
      candidateModules.push(...modules.allOf.filter((m) => scopeModules.includes(m)));
    }

    if (!modules) {
      candidateModules = scopeModules.slice(); // clone toàn bộ
    }

    // Loại trùng module (nếu có)
    candidateModules = Array.from(new Set(candidateModules));

    // Thu thập tất cả action của các module được chọn
    const actionsFromModules = candidateModules.flatMap((m) => grouped[m] ?? []);

    // Nếu không yêu cầu actions cụ thể, chỉ cần moduleOk là đủ
    if (!actions || (!actions.anyOf && !actions.allOf)) {
      return moduleOk;
    }

    // ===== 3) Kiểm tra action (anyOf / allOf) =====
    let actionOk = true;

    if (actions.anyOf && actions.anyOf.length > 0) {
      actionOk = actions.anyOf.some((a) => actionsFromModules.includes(a));
      if (!actionOk) return false;
    }

    if (actions.allOf && actions.allOf.length > 0) {
      const allOk = actions.allOf.every((a) => actionsFromModules.includes(a));
      actionOk = actionOk && allOk;
      if (!actionOk) return false;
    }

    return moduleOk && actionOk;
  }
}
