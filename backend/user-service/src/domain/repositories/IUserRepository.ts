import { User } from '../entities/User';

/**
 * Tiêu chí tìm kiếm và lọc danh sách người dùng cho Support Staff & Admin
 */
export interface UserSearchCriteria {
  q?: string;
  email?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'fullName' | 'email' | 'reputationScore';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Cấu trúc phân trang danh sách người dùng trả về từ Repository
 */
export interface UserSearchPage {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Domain Port / Repository Interface: IUserRepository
 * Định nghĩa hợp đồng truy xuất dữ liệu của User Bounded Context.
 * Thuần túy là Interface, không chứa logic SQL hay Prisma.
 */
export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  search(criteria: UserSearchCriteria): Promise<UserSearchPage>;
  save(user: User): Promise<void>;
  update(user: User): Promise<void>;
  delete(id: string): Promise<void>;
}
