/**
 * Application Port: IPasswordHasher
 * Giao diện mã hóa và so khớp mật khẩu trong Application Layer (SRS 5.4).
 * Tuân thủ Clean Architecture: Application chỉ phụ thuộc vào Port này.
 */
export interface IPasswordHasher {
  /**
   * Băm mật khẩu dạng văn bản thuần sang chuỗi mã hóa an toàn (bcrypt/argon2)
   */
  hash(plainText: string): Promise<string>;

  /**
   * So khớp mật khẩu dạng văn bản thuần với chuỗi mã băm trong DB
   */
  compare(plainText: string, hash: string): Promise<boolean>;
}
