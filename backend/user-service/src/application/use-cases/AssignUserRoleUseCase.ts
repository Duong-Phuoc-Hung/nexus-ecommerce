import { UserRole } from '../../domain/entities/User';
import { IUserRepository } from '../../domain/repositories/IUserRepository';

export interface AssignUserRoleOptions {
  source?: string;
}

export class AssignUserRoleUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly onRoleChanged: (userId: string) => void = () => undefined,
  ) {}

  public async execute(
    userId: string,
    role: string,
    options?: AssignUserRoleOptions,
  ): Promise<{ id: string; role: UserRole }> {
    if (!Object.values(UserRole).includes(role as UserRole)) {
      throw new Error('Role must be BUYER, SELLER, SUPPORT_STAFF, or ADMIN.');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found.');
    }

    if (user.role === UserRole.SELLER && role === UserRole.BUYER) {
      throw new Error(
        'Policy violation: Không hỗ trợ chuyển ngược từ SELLER về BUYER trong phạm vi MVP.',
      );
    }

    if (
      user.role === UserRole.BUYER &&
      role === UserRole.SELLER &&
      options?.source === 'ADMIN_USER_DROPDOWN'
    ) {
      throw new Error(
        'Policy violation: Không được chuyển trực tiếp BUYER sang SELLER qua dropdown chung. Vui lòng thực hiện qua quy trình Xét duyệt hồ sơ bán hàng và Kiểm tra điều kiện kích hoạt.',
      );
    }

    user.setRole(role as UserRole);
    await this.userRepository.update(user);
    this.onRoleChanged(user.id);

    return { id: user.id, role: user.role };
  }
}
