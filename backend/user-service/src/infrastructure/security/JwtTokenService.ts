import jwt, { SignOptions } from 'jsonwebtoken';
import { ITokenService, TokenPair, TokenPayload } from '../../application/ports/ITokenService';

/**
 * Infrastructure Security Adapter: JwtTokenService
 * Triển khai ITokenService sử dụng thư viện jsonwebtoken (SRS 5.4).
 */
export class JwtTokenService implements ITokenService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiresIn: string;
  private readonly refreshExpiresIn: string;

  constructor(
    accessSecret: string = process.env.JWT_ACCESS_SECRET ||
      'nexus_super_secret_jwt_access_key_min_32_chars_local_dev',
    refreshSecret: string = process.env.JWT_REFRESH_SECRET ||
      'nexus_super_secret_jwt_refresh_key_min_32_chars_local_dev',
    accessExpiresIn: string = process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: string = process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  ) {
    this.accessSecret = accessSecret;
    this.refreshSecret = refreshSecret;
    this.accessExpiresIn = accessExpiresIn;
    this.refreshExpiresIn = refreshExpiresIn;
  }

  public generateTokens(payload: TokenPayload): TokenPair {
    const claims = {
      sub: payload.userId,
      email: payload.email,
      roles: payload.roles,
      privileges: payload.privileges || [],
    };

    const accessSignOptions: SignOptions = {
      expiresIn: this.accessExpiresIn as unknown as SignOptions['expiresIn'],
    };

    const refreshSignOptions: SignOptions = {
      expiresIn: this.refreshExpiresIn as unknown as SignOptions['expiresIn'],
    };

    const accessToken = jwt.sign(claims, this.accessSecret, accessSignOptions);
    const refreshToken = jwt.sign(
      { sub: payload.userId, type: 'refresh' },
      this.refreshSecret,
      refreshSignOptions,
    );

    // Tính thời gian hết hạn tính bằng giây (15 phút = 900s)
    const expiresInSeconds = this.parseExpiresInToSeconds(this.accessExpiresIn);

    return {
      accessToken,
      refreshToken,
      expiresIn: expiresInSeconds,
    };
  }

  public verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.accessSecret) as jwt.JwtPayload;
      return {
        userId: (decoded.sub as string) || decoded.userId,
        email: decoded.email,
        roles: decoded.roles || [],
        privileges: decoded.privileges || [],
      };
    } catch (error) {
      throw new Error('Access Token không hợp lệ hoặc đã hết hạn');
    }
  }

  public verifyRefreshToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.refreshSecret) as jwt.JwtPayload;
      return {
        userId: (decoded.sub as string) || decoded.userId,
        email: decoded.email || '',
        roles: decoded.roles || [],
        privileges: decoded.privileges || [],
      };
    } catch (error) {
      throw new Error('Refresh Token không hợp lệ hoặc đã hết hạn');
    }
  }

  private parseExpiresInToSeconds(duration: string): number {
    const unit = duration.slice(-1);
    const value = parseInt(duration.slice(0, -1), 10);
    if (isNaN(value)) return 900;

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 900;
    }
  }
}
