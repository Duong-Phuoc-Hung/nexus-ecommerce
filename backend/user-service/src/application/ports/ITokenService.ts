/**
 * Cấu trúc dữ liệu chứa trong mã JWT Token (Payload)
 */
export interface TokenPayload {
  userId: string;
  email: string;
  roles: string[];
  privileges?: string[];
}

/**
 * Cặp Token cấp phát khi đăng nhập thành công
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // Thời gian hiệu lực tính bằng giây (ví dụ: 900 cho 15m)
}

/**
 * Application Port: ITokenService
 * Giao diện sinh và giải mã JWT token trong Application Layer (SRS 5.4).
 */
export interface ITokenService {
  /**
   * Sinh cặp Access Token (ngắn hạn) và Refresh Token (dài hạn)
   */
  generateTokens(payload: TokenPayload): TokenPair;

  /**
   * Xác thực và giải mã Access Token
   */
  verifyAccessToken(token: string): TokenPayload;

  /**
   * Xác thực và giải mã Refresh Token
   */
  verifyRefreshToken(token: string): TokenPayload;
}
