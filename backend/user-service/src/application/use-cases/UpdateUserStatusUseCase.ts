import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { UserStatus } from '../../domain/entities/User';
import { UserNotFoundException } from '../../domain/exceptions/UserNotFoundException';
import { authTokenStore } from '../../infrastructure/security/AuthTokenStore';

export interface UpdateUserStatusRequest {
  userId: string;
  status: string;
  reason: string;
  operatorId?: string;
}

export interface UpdateUserStatusResponse {
  id: string;
  email: string;
  fullName: string;
  status: UserStatus;
  reason: string;
  updatedAt: Date;
}

/**
 * UseCase: UpdateUserStatusUseCase
 * Cập nhật trạng thái người dùng (ACTIVE / SUSPENDED) theo yêu cầu của Support Staff / Admin (SRS 2.3, 2.7, 3.1.2)
 * Khi tài khoản bị khóa (SUSPENDED), toàn bộ phiên đăng nhập của người dùng sẽ bị thu hồi ngay lập tức.
 */
export class UpdateUserStatusUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  public async execute(request: UpdateUserStatusRequest): Promise<UpdateUserStatusResponse> {
    const { userId, status, reason } = request;

    if (!userId || !userId.trim()) {
      throw new Error('Mã người dùng (userId) không được để trống.');
    }

    if (!status || !status.trim()) {
      throw new Error('Trạng thái (status) không được để trống.');
    }

    const normalizedStatus = status.trim().toUpperCase();
    if (normalizedStatus !== UserStatus.ACTIVE && normalizedStatus !== UserStatus.SUSPENDED) {
      throw new Error(
        `Trạng thái '${status}' không hợp lệ. Chỉ chấp nhận '${UserStatus.ACTIVE}' hoặc '${UserStatus.SUSPENDED}'.`,
      );
    }

    if (!reason || !reason.trim()) {
      throw new Error(
        'Lý do thay đổi trạng thái tài khoản (reason) là bắt buộc để phục vụ kiểm toán audit.',
      );
    }

    const user = await this.userRepository.findById(userId.trim());
    if (!user) {
      throw new UserNotFoundException(`Không tìm thấy người dùng với mã ID '${userId}'.`);
    }

    const targetStatus = normalizedStatus as UserStatus;
    user.setStatus(targetStatus);

    // Lưu vào database / repository
    await this.userRepository.update(user);

    // Nếu tài khoản bị SUSPENDED, thu hồi ngay lập tức toàn bộ access token đang hoạt động
    if (targetStatus === UserStatus.SUSPENDED) {
      authTokenStore.revokeUserTokens(user.id);
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      status: user.status,
      reason: reason.trim(),
      updatedAt: user.updatedAt,
    };
  }
}
