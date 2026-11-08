import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { UserNotFoundException } from '../../domain/exceptions/UserNotFoundException';

export interface RestrictUserFeaturesInput {
  userId: string;
  restriction: string;
  durationDays: number;
  reason: string;
  operatorId: string;
}

export interface RestrictUserFeaturesOutput {
  userId: string;
  restriction: string;
  durationDays: number;
  reason: string;
  appliedBy: string;
  expiresAt: Date;
  activeRestrictions: Array<{
    restriction: string;
    durationDays: number;
    reason: string;
    appliedBy: string;
    expiresAt: Date;
    createdAt: Date;
  }>;
}

export class RestrictUserFeaturesUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  public async execute(input: RestrictUserFeaturesInput): Promise<RestrictUserFeaturesOutput> {
    if (!input.userId || typeof input.userId !== 'string') {
      throw new Error('userId is required.');
    }

    if (
      !input.restriction ||
      typeof input.restriction !== 'string' ||
      input.restriction.trim() === ''
    ) {
      throw new Error('restriction type is required.');
    }

    if (typeof input.durationDays !== 'number' || input.durationDays <= 0) {
      throw new Error('durationDays must be a positive number.');
    }

    if (!input.reason || typeof input.reason !== 'string' || input.reason.trim() === '') {
      throw new Error('reason is required.');
    }

    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new UserNotFoundException(input.userId);
    }

    const restriction = user.addRestriction(
      input.restriction.trim(),
      input.durationDays,
      input.reason.trim(),
      input.operatorId || 'system',
    );
    await this.userRepository.update(user);

    return {
      userId: user.id,
      restriction: restriction.restriction,
      durationDays: restriction.durationDays,
      reason: restriction.reason,
      appliedBy: restriction.appliedBy,
      expiresAt: restriction.expiresAt,
      activeRestrictions: user.getActiveRestrictions(),
    };
  }
}
