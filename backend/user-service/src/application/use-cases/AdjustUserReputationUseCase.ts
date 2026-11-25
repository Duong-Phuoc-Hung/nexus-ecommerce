import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { UserNotFoundException } from '../../domain/exceptions/UserNotFoundException';
import {
  classifyReputationTier,
  reputationLedgerStore,
  ReputationLedgerEntry,
  ReputationRuleCode,
} from '../../infrastructure/state/ReputationLedgerStore';

export interface AdjustUserReputationInput {
  userId: string;
  points: number;
  reason: string;
  operatorId: string;
  operatorRole?: string;
  internalNote?: string;
  ruleCode?: ReputationRuleCode;
  sourceId?: string;
}

export interface AdjustUserReputationOutput {
  userId: string;
  newReputationScore: number;
  scoreBefore: number;
  requestedDelta: number;
  appliedDelta: number;
  adjustedPoints: number;
  tier: string;
  tierLabel: string;
  reason: string;
  adjustedBy: string;
  entry: ReputationLedgerEntry;
  reputationHistory: Array<{
    id?: string;
    points: number;
    appliedDelta?: number;
    scoreBefore?: number;
    scoreAfter?: number;
    reason: string;
    adjustedBy: string;
    createdAt: Date | string;
  }>;
}

export class AdjustUserReputationUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  public async execute(input: AdjustUserReputationInput): Promise<AdjustUserReputationOutput> {
    if (!input.userId || typeof input.userId !== 'string') {
      throw new Error('userId is required.');
    }

    if (!Number.isSafeInteger(input.points) || Math.abs(input.points) > 2147483647) {
      throw new Error('points must be a valid number.');
    }

    if (!input.reason || typeof input.reason !== 'string' || input.reason.trim() === '') {
      throw new Error('reason is required.');
    }

    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new UserNotFoundException(input.userId);
    }

    const ruleCode: ReputationRuleCode = input.ruleCode || 'ADMIN_MANUAL_ADJUST';
    const sourceId =
      input.sourceId || `manual:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;

    const { entry, newScore } = await reputationLedgerStore.recordEntryAsync({
      userId: user.id,
      currentScore: user.reputationScore,
      ruleCode,
      sourceType: 'ADMIN',
      sourceId,
      requestedDelta: Math.round(input.points),
      reason: input.reason.trim(),
      internalNote: input.internalNote,
      actorId: input.operatorId || 'system',
      actorRole: input.operatorRole || 'ADMIN',
      allowDuplicateSource: ruleCode === 'ADMIN_MANUAL_ADJUST',
    });

    const tier = classifyReputationTier(newScore);
    user.adjustReputation(entry.appliedDelta, input.reason.trim(), input.operatorId || 'system');
    user.setReputationScore(newScore);

    if (!reputationLedgerStore.hasPersistentPool()) {
      if (this.userRepository.updateReputationScore) {
        await this.userRepository.updateReputationScore(user.id, newScore, tier.code);
      } else {
        await this.userRepository.update(user);
      }
    }

    const ledger = reputationLedgerStore.getLedger(user.id);

    return {
      userId: user.id,
      newReputationScore: newScore,
      scoreBefore: entry.scoreBefore,
      requestedDelta: entry.requestedDelta,
      appliedDelta: entry.appliedDelta,
      adjustedPoints: entry.appliedDelta,
      tier: tier.code,
      tierLabel: tier.label,
      reason: input.reason.trim(),
      adjustedBy: input.operatorId || 'system',
      entry,
      reputationHistory: ledger.map((l) => ({
        id: l.id,
        points: l.appliedDelta,
        appliedDelta: l.appliedDelta,
        scoreBefore: l.scoreBefore,
        scoreAfter: l.scoreAfter,
        reason: l.reason,
        adjustedBy: l.actorId,
        createdAt: l.createdAt,
      })),
    };
  }
}
