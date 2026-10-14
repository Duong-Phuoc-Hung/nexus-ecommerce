import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { AccountLockedException } from '../../domain/exceptions/AccountLockedException';
import { InvalidCredentialsException } from '../../domain/exceptions/InvalidCredentialsException';
import { UserInactiveException } from '../../domain/exceptions/UserInactiveException';
import { UserNotFoundException } from '../../domain/exceptions/UserNotFoundException';
import { createJwtToken, verifyPassword } from '../../infrastructure/security/auth';
import { getRolePermissions } from '../../infrastructure/security/authorization';
import { authTokenStore } from '../../infrastructure/security/AuthTokenStore';

export interface LoginResult {
  token: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    status: string;
    reputationScore: number;
    permissions: string[];
  };
}

export class LoginUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  public async execute(email: string, password: string): Promise<LoginResult> {
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      throw new InvalidCredentialsException();
    }

    const user = await this.userRepository.findByEmail(normalizedEmail);

    if (!user) {
      throw new UserNotFoundException(normalizedEmail);
    }

    if (!user.isActive()) {
      throw new UserInactiveException(user.id);
    }

    if (user.isLocked()) {
      throw new AccountLockedException(user.lockedUntil);
    }

    if (!verifyPassword(password, user.passwordHash)) {
      user.recordFailedLoginAttempt();
      await this.userRepository.update(user);

      if (user.isLocked()) {
        throw new AccountLockedException(user.lockedUntil);
      }

      throw new InvalidCredentialsException();
    }

    user.resetFailedLoginAttempts();
    await this.userRepository.update(user);

    const permissions = getRolePermissions(user.role);

    const token = createJwtToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions,
    });
    authTokenStore.track(token, user.id);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        reputationScore: user.reputationScore,
        permissions,
      },
    };
  }
}
