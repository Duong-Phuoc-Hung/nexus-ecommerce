import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { User, UserRole, UserStatus } from '../../domain/entities/User';

/**
 * Infrastructure Repository: InMemoryUserRepository
 * Triển khai interface IUserRepository để phục vụ khởi động, unit test và chạy thử nghiệm skeleton.
 * Trong phase sau, lớp này sẽ được thay thế hoặc bổ sung bằng PrismaUserRepository.
 */
export class InMemoryUserRepository implements IUserRepository {
  private readonly users: Map<string, User> = new Map();

  constructor() {
    // Dữ liệu khởi tạo mẫu để skeleton có thể test ngay lập tức
    const sampleUser = new User({
      id: 'usr_01hqz789abc',
      email: 'buyer.test@nexus-ecommerce.com',
      fullName: 'Nguyen Van Buyer',
      passwordHash: '$2b$12$eXampleHashedPasswordString...',
      role: UserRole.BUYER,
      status: UserStatus.ACTIVE,
      reputationScore: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this.users.set(sampleUser.id, sampleUser);
  }

  public async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  public async findByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  public async save(user: User): Promise<void> {
    this.users.set(user.id, user);
  }

  public async update(user: User): Promise<void> {
    this.users.set(user.id, user);
  }

  public async delete(id: string): Promise<void> {
    this.users.delete(id);
  }
}
