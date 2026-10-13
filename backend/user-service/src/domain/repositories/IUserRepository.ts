import { User } from '../entities/User';

/**
 * Domain Port / Repository Interface: IUserRepository
 * Định nghĩa hợp đồng truy xuất dữ liệu của User Bounded Context.
 * Thuần túy là Interface, không chứa logic SQL hay Prisma.
 */
export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<void>;
  update(user: User): Promise<void>;
  delete(id: string): Promise<void>;
}
