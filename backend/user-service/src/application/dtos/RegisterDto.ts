import { UserRole } from '../../domain/entities/User';

/**
 * DTO dữ liệu đầu vào khi đăng ký tài khoản mới
 */
export interface RegisterRequestDto {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  identifyNumber?: string;
  role?: UserRole;
}

/**
 * DTO dữ liệu trả về khi đăng ký thành công
 */
export interface RegisterResponseDto {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  reputationScore: number;
  createdAt: Date;
}
