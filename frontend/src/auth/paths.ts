import type { UserRole } from '../types/domain';

export function defaultPathForRole(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
      return '/admin/dashboard';
    case 'REVIEWER':
      return '/reviewer/dashboard';
    case 'SUPPLIER_CONTACT':
    default:
      return '/supplier/dashboard';
  }
}
