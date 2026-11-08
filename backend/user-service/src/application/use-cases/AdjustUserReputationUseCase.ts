import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { UserNotFoundException } from '../../domain/exceptions/UserNotFoundException';

export interface AdjustUserReputationInput {
  userId: string;
  points: number;
  reason: string;
  operatorId: string;
}

export interface AdjustUserReputationOutput {
  userId: string;
  newReputationScore: number;
  adjustedPoints: number;
  reason: string;
  adjustedBy: string;
  reputationHistory: Array<{
    points: number;
    reason: string;
    adjustedBy: string;
    createdAt: Date;
  }>;
}

export class AdjustUserReputationUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  public async execute(input: AdjustUserReputationInput): Promise<AdjustUserReputationOutput> {
    if (!input.userId || typeof input.userId !== 'string') {
      throw new Error('userId is required.');
    }

    if (typeof input.points !== 'number' || isNaN(input.points)) {
      throw new Error('points must be a valid number.');
    }

    if (!input.reason || typeof input.reason !== 'string' || input.reason.trim() === '') {
      throw new Error('reason is required.');
    }

    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new UserNotFoundException(input.userId);
    }

    user.adjustReputation(input.points, input.reason.trim(), input.operatorId || 'system');
    await this.userRepository.update(user);

    return {
      userId: user.id,
      newReputationScore: user.reputationScore,
      adjustedPoints: input.points,
      reason: input.reason.trim(),
      adjustedBy: input.operatorId || 'system',
      reputationHistory: user.reputationHistory,
    };
  }
}
