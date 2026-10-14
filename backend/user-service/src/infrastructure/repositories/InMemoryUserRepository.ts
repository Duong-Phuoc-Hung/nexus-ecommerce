import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { User, UserRole, UserStatus } from '../../domain/entities/User';
import { hashPassword } from '../security/auth';

export class InMemoryUserRepository implements IUserRepository {
  private readonly users: Map<string, User> = new Map();

  constructor() {
    const now = new Date();
    const buyer = new User({
      id: 'usr_01hqz789abc',
      email: 'buyer.test@nexus-ecommerce.com',
      fullName: 'Nguyen Van Buyer',
      passwordHash: hashPassword('Password123!'),
      role: UserRole.BUYER,
      status: UserStatus.ACTIVE,
      reputationScore: 100,
      createdAt: now,
      updatedAt: now,
    });
    this.users.set(buyer.id, buyer);

    const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
    if (adminEmail && adminPassword) {
      if (adminPassword.length < 12) {
        throw new Error('BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters.');
      }
      if (adminEmail === buyer.email) {
        throw new Error('Bootstrap admin email must differ from the sample buyer email.');
      }

      const admin = new User({
        id: 'usr_bootstrap_admin',
        email: adminEmail,
        fullName: 'Nexus Administrator',
        passwordHash: hashPassword(adminPassword),
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        reputationScore: 100,
        createdAt: now,
        updatedAt: now,
      });
      this.users.set(admin.id, admin);
    }
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
