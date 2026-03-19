export interface AccessUser {
  role?: string | null;
  username?: string | null;
  allowed_modules?: number[] | null;
}

export const MODULES = {
  MANUALS: 1,
  CHECKLIST: 2,
  SERVICE_ORDERS: 3,
  SERVICE_ORDER_HISTORY: 4,
  USER_MANAGEMENT: 5,
  CHECKLIST_HISTORY: 6,
  AUDIT: 7,
  CONTROL_PANEL: 8,
} as const;

export function isAdminUser(user: AccessUser | null | undefined): boolean {
  const normalizedRole = String(user?.role || '').trim().toLowerCase();
  const normalizedUsername = String(user?.username || '').trim().toLowerCase();

  return (
    normalizedRole === 'admin' ||
    normalizedRole === 'administrador' ||
    normalizedUsername === 'admin'
  );
}

export function hasModuleAccess(
  user: AccessUser | null | undefined,
  moduleId: number
): boolean {
  if (!user) return false;
  if (isAdminUser(user)) return true;

  const allowedModules = Array.isArray(user.allowed_modules) ? user.allowed_modules : [];
  return allowedModules.includes(moduleId);
}

export function hasAnyModuleAccess(
  user: AccessUser | null | undefined,
  moduleIds: number[]
): boolean {
  if (!user) return false;
  if (isAdminUser(user)) return true;

  return moduleIds.some((moduleId) => hasModuleAccess(user, moduleId));
}

export function canAccessServiceOrderNotifications(user: AccessUser | null | undefined): boolean {
  return hasAnyModuleAccess(user, [MODULES.SERVICE_ORDERS, MODULES.SERVICE_ORDER_HISTORY]);
}

export function canAccessChecklistNotifications(user: AccessUser | null | undefined): boolean {
  return hasAnyModuleAccess(user, [MODULES.CHECKLIST, MODULES.CHECKLIST_HISTORY]);
}