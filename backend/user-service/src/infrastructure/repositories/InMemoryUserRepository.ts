import {
  IUserRepository,
  UserSearchCriteria,
  UserSearchPage,
} from '../../domain/repositories/IUserRepository';
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
      phone: '0901234567',
      passwordHash: hashPassword('Password123!'),
      role: UserRole.BUYER,
      status: UserStatus.ACTIVE,
      reputationScore: 98,
      createdAt: new Date(now.getTime() - 86400000 * 3),
      updatedAt: new Date(now.getTime() - 86400000 * 3),
    });
    this.users.set(buyer.id, buyer);

    const seller = new User({
      id: 'usr_seller_001',
      email: 'seller.test@nexus-ecommerce.com',
      fullName: 'Retro Lab Store',
      phone: '0909888999',
      passwordHash: hashPassword('Password123!'),
      role: UserRole.SELLER,
      status: UserStatus.ACTIVE,
      reputationScore: 92,
      createdAt: new Date(now.getTime() - 86400000 * 2),
      updatedAt: new Date(now.getTime() - 86400000 * 2),
    });
    this.users.set(seller.id, seller);

    const staff = new User({
      id: 'usr_staff_001',
      email: 'staff.test@nexus-ecommerce.com',
      fullName: 'Nguyen Support Staff',
      phone: '0912345678',
      passwordHash: hashPassword('Password123!'),
      role: UserRole.SUPPORT_STAFF,
      status: UserStatus.ACTIVE,
      reputationScore: 100,
      createdAt: new Date(now.getTime() - 86400000),
      updatedAt: new Date(now.getTime() - 86400000),
    });
    this.users.set(staff.id, staff);

    const suspended = new User({
      id: 'usr_suspended_001',
      email: 'suspended.test@nexus-ecommerce.com',
      fullName: 'Pham Van Suspended',
      phone: '0933333333',
      passwordHash: hashPassword('Password123!'),
      role: UserRole.BUYER,
      status: UserStatus.SUSPENDED,
      reputationScore: 20,
      createdAt: new Date(now.getTime() - 86400000 * 5),
      updatedAt: new Date(now.getTime() - 86400000 * 5),
    });
    this.users.set(suspended.id, suspended);

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
        phone: '0988888888',
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

  public async findByPhone(phone: string): Promise<User | null> {
    const trimmed = phone.trim();
    for (const user of this.users.values()) {
      if (user.phone && user.phone === trimmed) {
        return user;
      }
    }
    return null;
  }

  public async search(criteria: UserSearchCriteria): Promise<UserSearchPage> {
    let list = Array.from(this.users.values());

    // 1. Lọc theo từ khóa q (tìm theo id, fullName, email, role)
    if (criteria.q && criteria.q.trim().length > 0) {
      const qLower = criteria.q.trim().toLowerCase();
      list = list.filter(
        (u) =>
          u.id.toLowerCase().includes(qLower) ||
          u.fullName.toLowerCase().includes(qLower) ||
          u.email.toLowerCase().includes(qLower) ||
          u.role.toLowerCase().includes(qLower),
      );
    }

    // 2. Lọc theo email cụ thể
    if (criteria.email && criteria.email.trim().length > 0) {
      const emailLower = criteria.email.trim().toLowerCase();
      list = list.filter((u) => u.email.toLowerCase() === emailLower);
    }

    // 3. Lọc theo vai trò (Role)
    if (criteria.role && criteria.role.trim().length > 0) {
      const roleUpper = criteria.role.trim().toUpperCase();
      list = list.filter((u) => u.role.toUpperCase() === roleUpper);
    }

    // 4. Lọc theo trạng thái (Status)
    if (criteria.status && criteria.status.trim().length > 0) {
      const statusUpper = criteria.status.trim().toUpperCase();
      list = list.filter((u) => u.status.toUpperCase() === statusUpper);
    }

    // 5. Sắp xếp (Sorting)
    const sortBy = criteria.sortBy || 'createdAt';
    const sortOrder = criteria.sortOrder === 'asc' ? 1 : -1;

    list.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'fullName':
          comparison = a.fullName.localeCompare(b.fullName);
          break;
        case 'email':
          comparison = a.email.localeCompare(b.email);
          break;
        case 'reputationScore':
          comparison = a.reputationScore - b.reputationScore;
          break;
        case 'createdAt':
        default:
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
      }
      return comparison * sortOrder;
    });

    // 6. Phân trang (Pagination)
    const page = Math.max(1, criteria.page || 1);
    const limit = Math.max(1, Math.min(100, criteria.limit || 10));
    const total = list.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedUsers = list.slice(startIndex, startIndex + limit);

    return {
      users: paginatedUsers,
      total,
      page,
      limit,
      totalPages,
    };
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
