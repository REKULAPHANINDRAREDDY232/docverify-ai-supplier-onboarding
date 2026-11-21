import type { UserRole } from '../types/domain';

export function defaultPathForRole(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
      return '/admin';
    case 'REVIEWER':
      return '/reviewer';
    case 'SUPPLIER_CONTACT':
    default:
      return '/supplier';
  }
}
