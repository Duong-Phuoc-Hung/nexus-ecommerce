import { UserRole } from '../../domain/entities/User';
import { IUserRepository } from '../../domain/repositories/IUserRepository';

export class AssignUserRoleUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly onRoleChanged: (userId: string) => void = () => undefined,
  ) {}

  public async execute(userId: string, role: string): Promise<{ id: string; role: UserRole }> {
    if (!Object.values(UserRole).includes(role as UserRole)) {
      throw new Error('Role must be BUYER, SELLER, or ADMIN.');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found.');
    }

    user.setRole(role as UserRole);
    await this.userRepository.update(user);
    this.onRoleChanged(user.id);

    return { id: user.id, role: user.role };
  }
}
