import crypto from 'node:crypto';
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

    // 1. Chuẩn BCrypt ($2a$, $2b$)
    if (hash.startsWith('$2a$') || hash.startsWith('$2b$')) {
      try {
        return await bcrypt.compare(plainText, hash);
      } catch {
        return false;
      }
    }

    // 2. Hỗ trợ chuẩn PBKDF2 (salt:hash) tương thích ngược với dữ liệu hạt giống cũ
    if (hash.includes(':')) {
      const [salt, storedHash] = hash.split(':');
      if (!salt || !storedHash) return false;
      try {
        const candidate = crypto.pbkdf2Sync(plainText, salt, 100000, 64, 'sha512').toString('hex');
        return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(storedHash));
      } catch {
        return false;
      }
    }

    return bcrypt.compare(plainText, hash);
  }
}
