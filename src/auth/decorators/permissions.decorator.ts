import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions_req';

export type PermissionRequirement = {
  // modules cần xét, ví dụ ['User','All']
// Yêu cầu module: có thể anyOf hoặc allOf
  modules?: {
    anyOf?: string[];
    allOf?: string[];
  };
  // Yêu cầu action: cũng có anyOf hoặc allOf
  actions?: {
    anyOf?: string[];
    allOf?: string[];
  };
};

export const RequirePermissions = (req: PermissionRequirement) =>
  SetMetadata(PERMISSIONS_KEY, req);