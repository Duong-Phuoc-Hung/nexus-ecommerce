export type AssignableRole = 'BUYER' | 'SELLER' | 'ADMIN';
export interface RolePermission {
  role: string;
  permissions: string[];
}
