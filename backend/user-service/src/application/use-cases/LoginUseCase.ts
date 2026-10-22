import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { AccountLockedException } from '../../domain/exceptions/AccountLockedException';
import { AccountSuspendedException } from '../../domain/exceptions/AccountSuspendedException';
import { InvalidCredentialsException } from '../../domain/exceptions/InvalidCredentialsException';
import { UserInactiveException } from '../../domain/exceptions/UserInactiveException';
import { UserNotFoundException } from '../../domain/exceptions/UserNotFoundException';
import { createJwtToken, verifyPassword } from '../../infrastructure/security/auth';
import { getRolePermissions } from '../../infrastructure/security/authorization';
import { authTokenStore } from '../../infrastructure/security/AuthTokenStore';
import { IPasswordHasher } from '../ports/IPasswordHasher';
import { ITokenService } from '../ports/ITokenService';
import { IEventPublisher } from '../ports/IEventPublisher';
import { LoginRequestDto, LoginResponseDto } from '../dtos/LoginDto';

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
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher?: IPasswordHasher,
    private readonly tokenService?: ITokenService,
    private readonly eventPublisher?: IEventPublisher,
  ) {}

  public async execute(dto: LoginRequestDto): Promise<LoginResponseDto>;
  public async execute(email: string, password: string): Promise<LoginResult>;
  public async execute(
    inputOrEmail: string | LoginRequestDto,
    maybePassword?: string,
  ): Promise<LoginResult | LoginResponseDto> {
    if (typeof inputOrEmail === 'object') {
      const dto = inputOrEmail;
      if (!dto.email || !dto.email.trim()) {
        throw new InvalidCredentialsException('Email không được để trống');
      }
      if (!dto.password) {
        throw new InvalidCredentialsException('Mật khẩu không được để trống');
      }

      const normalizedEmail = dto.email.trim().toLowerCase();
      const user = await this.userRepository.findByEmail(normalizedEmail);
      if (!user) {
        throw new InvalidCredentialsException('Email hoặc mật khẩu không chính xác');
      }

      if (!user.isActive()) {
        throw new AccountSuspendedException('Tài khoản của bạn đã bị khóa hoặc tạm dừng hoạt động');
      }

      let isMatch = false;
      if (this.passwordHasher) {
        isMatch = await this.passwordHasher.compare(dto.password, user.passwordHash);
      } else {
        isMatch = verifyPassword(dto.password, user.passwordHash);
      }

      if (!isMatch) {
        throw new InvalidCredentialsException('Email hoặc mật khẩu không chính xác');
      }

      if (this.tokenService) {
        const tokenPair = this.tokenService.generateTokens({
          userId: user.id,
          email: user.email,
          roles: user.roles,
        });

        return {
          accessToken: tokenPair.accessToken,
          token: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken,
          expiresIn: tokenPair.expiresIn,
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            roles: user.roles,
            status: user.status,
            reputationScore: user.reputationScore,
          },
        };
      }

      const permissions = getRolePermissions(user.role);
      const token = createJwtToken({
        sub: user.id,
        email: user.email,
        role: user.role,
        permissions,
      });
      authTokenStore.track(token, user.id);

      return {
        accessToken: token,
        token,
        refreshToken: token,
        expiresIn: 900,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          roles: user.roles,
          status: user.status,
          reputationScore: user.reputationScore,
          privileges: permissions,
        },
      };
    }

    const email = inputOrEmail;
    const password = maybePassword!;
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

    let isPasswordValid = false;
    if (this.passwordHasher) {
      isPasswordValid = await this.passwordHasher.compare(password, user.passwordHash);
    } else {
      isPasswordValid = verifyPassword(password, user.passwordHash);
    }

    if (!isPasswordValid) {
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
