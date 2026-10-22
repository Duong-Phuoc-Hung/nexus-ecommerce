import bcrypt from 'bcryptjs';
import { IPasswordHasher } from '../../application/ports/IPasswordHasher';

/**
 * Infrastructure Security Adapter: BcryptPasswordHasher
 * Triển khai Port IPasswordHasher sử dụng thư viện bcryptjs (SRS 5.4).
 */
export class BcryptPasswordHasher implements IPasswordHasher {
  private readonly saltRounds: number;

  constructor(saltRounds: number = Number(process.env.PASSWORD_BCRYPT_ROUNDS) || 10) {
    this.saltRounds = saltRounds;
  }

  public async hash(plainText: string): Promise<string> {
    if (!plainText) {
      throw new Error('Mật khẩu không được để trống khi băm');
    }
    return bcrypt.hash(plainText, this.saltRounds);
  }

  public async compare(plainText: string, hash: string): Promise<boolean> {
    if (!plainText || !hash) {
      return false;
    }
    return bcrypt.compare(plainText, hash);
  }
}
