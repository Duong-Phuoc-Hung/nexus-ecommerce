/**
 * DTO dữ liệu đầu vào khi thực hiện đăng nhập
 */
export interface LoginRequestDto {
  email: string;
  password: string;
}

/**
 * Cấu trúc thông tin người dùng trả về cho Client sau khi đăng nhập thành công
 */
export interface UserAuthView {
  id: string;
  email: string;
  fullName: string;
  role: string;
  roles: string[];
  status: string;
  reputationScore: number;
  privileges?: string[];
}

/**
 * DTO dữ liệu trả về khi đăng nhập thành công
 */
export interface LoginResponseDto {
  accessToken: string;
  token: string; // Tương thích ngược với hợp đồng Frontend Web (auth.factory.ts)
  refreshToken: string;
  expiresIn: number;
  user: UserAuthView;
}
