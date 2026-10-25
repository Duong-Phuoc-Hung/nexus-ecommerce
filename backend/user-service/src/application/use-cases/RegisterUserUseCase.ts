import { User, UserRole, UserStatus } from '../../domain/entities/User';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { hashPassword, generateUuidV7 } from '../../infrastructure/security/auth';

export interface RegisterUserResult {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  reputationScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export class RegisterUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  public async execute(input: {
    email: string;
    fullName: string;
    password: string;
  }): Promise<RegisterUserResult> {
    const email = input.email?.trim().toLowerCase();
    const fullName = input.fullName?.trim();
    const password = input.password;

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      throw new Error('A valid email is required.');
    }
    if (!fullName || fullName.length > 100) {
      throw new Error('Full name is required and must be at most 100 characters.');
    }
    if (typeof password !== 'string' || password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }
    if (await this.userRepository.findByEmail(email)) {
      throw new Error('An account with this email already exists.');
    }

    const now = new Date();
    const user = new User({
      id: generateUuidV7(),
      email,
      fullName,
      passwordHash: hashPassword(password),
      role: UserRole.BUYER,
      status: UserStatus.ACTIVE,
      reputationScore: 100,
      createdAt: now,
      updatedAt: now,
    });
    await this.userRepository.save(user);

    const result: RegisterUserResult = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      reputationScore: user.reputationScore,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
    return result;
  }
}
