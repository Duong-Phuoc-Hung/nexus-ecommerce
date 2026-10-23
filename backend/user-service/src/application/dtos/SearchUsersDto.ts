/**
 * Data Transfer Objects (DTO) cho luồng Tra cứu Người dùng (User Lookup / Support Staff)
 * Bounded Context: User & IAM (SRS 3.1)
 */

export interface SearchUsersQueryDto {
  q?: string;
  email?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'fullName' | 'email' | 'reputationScore';
  sortOrder?: 'asc' | 'desc';
}

export interface UserSearchItemDto {
  id: string;
  fullName: string;
  name: string; // Alias hỗ trợ màn hình Frontend /support/users (user.name)
  email: string;
  role: string;
  status: string;
  reputationScore: number;
  reputation: number; // Alias hỗ trợ màn hình Frontend /support/users (user.reputation)
  ordersCount: number;
  orders: number; // Alias hỗ trợ màn hình Frontend /support/users (user.orders)
  createdAt: string;
  updatedAt: string;
}

export interface SearchUsersPaginationDto {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SearchUsersResultDto {
  items: UserSearchItemDto[];
  pagination: SearchUsersPaginationDto;
}
