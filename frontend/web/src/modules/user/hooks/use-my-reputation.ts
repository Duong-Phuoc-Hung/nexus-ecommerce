'use client';

import { useCallback, useEffect, useState } from 'react';
import { requestApi } from '@/lib/axios/api-client';
import { unwrap, userMessage } from '@/lib/axios/http';
import {
  fetchDeduplicated,
  getCachedResource,
  invalidateResource,
} from '@/lib/axios/resource-cache';
import { useSession } from '@/modules/auth/hooks/use-session';

export type ReputationTierCode =
  'NEEDS_RECOVERY' | 'AUCTION_ELIGIBLE' | 'STANDARD' | 'GOOD' | 'HIGH_TRUST';

export type ReputationMissionItem = {
  code: string;
  title: string;
  points: number;
  frequencyLabel: string;
  status: 'AVAILABLE' | 'COMPLETED' | 'LOCKED';
  progressText: string;
  actionLabel?: string;
  actionHref?: string;
  interactiveType?: 'RECOVERY_QUIZ';
};

export type ReputationLedgerItem = {
  id: string;
  ruleCode: string;
  sourceType: string;
  sourceId: string;
  requestedDelta: number;
  appliedDelta: number;
  scoreBefore: number;
  scoreAfter: number;
  reason: string;
  actorId: string;
  actorRole: string;
  reversalOfId?: string;
  reversed?: boolean;
  createdAt: string;
};

export type ReputationAppealItem = {
  id: string;
  ledgerEntryId: string;
  reason: string;
  evidenceNote?: string;
  status: 'PENDING' | 'APPROVED_REVERSED' | 'REJECTED';
  resolutionNote?: string;
  createdAt: string;
  resolvedAt?: string;
};

export type MyReputationData = {
  userId: string;
  score: number;
  tier: ReputationTierCode;
  tierLabel: string;
  nextTierLabel: string | null;
  nextTierScore: number | null;
  pointsToNextTier: number;
  canBid: boolean;
  pointsToBid: number;
  canCreateSellerAuction: boolean;
  isBidRestricted: boolean;
  restrictionReason: string | null;
  completedTransactions: number;
  hasNoCompletedTransactions: boolean;
  version: number;
  missions: ReputationMissionItem[];
  history: ReputationLedgerItem[];
  appeals: ReputationAppealItem[];
};

const REPUTATION_EVENT = 'nexus:reputation-changed';
const REPUTATION_CACHE_KEY = 'user:me:reputation';
const REPUTATION_TTL_MS = 15_000;

export function notifyReputationChanged() {
  invalidateResource(REPUTATION_CACHE_KEY);
  invalidateResource('user:me:reputation:raw');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(REPUTATION_EVENT));
  }
}

export function classifyTierClient(score: number): {
  code: ReputationTierCode;
  label: string;
  nextTierLabel: string | null;
  nextTierScore: number | null;
} {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  if (s <= 39)
    return {
      code: 'NEEDS_RECOVERY',
      label: 'Cần khôi phục',
      nextTierLabel: 'Đang phục hồi',
      nextTierScore: 40,
    };
  if (s <= 49)
    return {
      code: 'AUCTION_ELIGIBLE',
      label: 'Đang phục hồi',
      nextTierLabel: 'Tiêu chuẩn',
      nextTierScore: 50,
    };
  if (s <= 74)
    return {
      code: 'STANDARD',
      label: 'Tiêu chuẩn',
      nextTierLabel: 'Tốt',
      nextTierScore: 75,
    };
  if (s <= 89)
    return {
      code: 'GOOD',
      label: 'Tốt',
      nextTierLabel: 'Uy tín cao',
      nextTierScore: 90,
    };
  return {
    code: 'HIGH_TRUST',
    label: 'Uy tín cao',
    nextTierLabel: null,
    nextTierScore: null,
  };
}

export function useMyReputation(enabled = true) {
  const { user, phase } = useSession();
  const userId = user?.id ?? '';
  const [data, setData] = useState<MyReputationData | null>(() =>
    enabled && userId ? getCachedResource<MyReputationData>(REPUTATION_CACHE_KEY) : null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchReputation = useCallback(
    async (options?: { force?: boolean; cancelledRef?: { current: boolean } }) => {
      if (!enabled || phase !== 'ready' || !userId) {
        setData(null);
        setError('');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const mapped = await fetchDeduplicated<MyReputationData>(
          REPUTATION_CACHE_KEY,
          async () => {
            const raw = await fetchDeduplicated(
              'user:me:reputation:raw',
              () => requestApi('/users/me/reputation'),
              { ttlMs: REPUTATION_TTL_MS, force: options?.force },
            );
            const d = unwrap<Record<string, unknown>>(raw);
            if (!d || typeof d !== 'object') {
              throw new Error('Không đọc được dữ liệu uy tín.');
            }
            const score =
              typeof d.score === 'number'
                ? d.score
                : typeof d.reputationScore === 'number'
                  ? d.reputationScore
                  : 50;
            const tierInfo = classifyTierClient(score);
            const completedTransactions =
              typeof d.completedTransactions === 'number' ? d.completedTransactions : 0;

            return {
              userId: String(d.userId || userId),
              score,
              tier: (typeof d.tier === 'string' ? d.tier : tierInfo.code) as ReputationTierCode,
              tierLabel: String(d.tierLabel || d.trustTierLabel || tierInfo.label),
              nextTierLabel:
                typeof d.nextTierLabel === 'string' ? d.nextTierLabel : tierInfo.nextTierLabel,
              nextTierScore:
                typeof d.nextTierScore === 'number' ? d.nextTierScore : tierInfo.nextTierScore,
              pointsToNextTier:
                typeof d.pointsToNextTier === 'number'
                  ? d.pointsToNextTier
                  : tierInfo.nextTierScore
                    ? Math.max(0, tierInfo.nextTierScore - score)
                    : 0,
              canBid: typeof d.canBid === 'boolean' ? d.canBid : score >= 50,
              pointsToBid:
                typeof d.pointsToBid === 'number' ? d.pointsToBid : Math.max(0, 50 - score),
              canCreateSellerAuction:
                typeof d.canCreateSellerAuction === 'boolean'
                  ? d.canCreateSellerAuction
                  : score >= 50,
              isBidRestricted: Boolean(d.isBidRestricted),
              restrictionReason:
                typeof d.restrictionReason === 'string' ? d.restrictionReason : null,
              completedTransactions,
              hasNoCompletedTransactions:
                typeof d.hasNoCompletedTransactions === 'boolean'
                  ? d.hasNoCompletedTransactions
                  : completedTransactions === 0,
              version: typeof d.version === 'number' ? d.version : 1,
              missions: Array.isArray(d.missions) ? (d.missions as ReputationMissionItem[]) : [],
              history: Array.isArray(d.history) ? (d.history as ReputationLedgerItem[]) : [],
              appeals: Array.isArray(d.appeals) ? (d.appeals as ReputationAppealItem[]) : [],
            };
          },
          { ttlMs: REPUTATION_TTL_MS, force: options?.force },
        );
        if (options?.cancelledRef?.current) return;
        setData(mapped);
      } catch (err) {
        if (!options?.cancelledRef?.current) {
          setError(userMessage(err));
        }
      } finally {
        if (!options?.cancelledRef?.current) {
          setLoading(false);
        }
      }
    },
    [enabled, phase, userId],
  );

  // Xóa dữ liệu cũ ngay khi đổi tài khoản (Mục 14) và chia sẻ 1 request duy nhất giữa các component
  useEffect(() => {
    setError('');
    if (!enabled || phase !== 'ready' || !userId) {
      setData(null);
      return;
    }
    const cancelledRef = { current: false };
    const cached = getCachedResource<MyReputationData>(REPUTATION_CACHE_KEY);
    if (cached && cached.userId === userId) {
      setData(cached);
    } else {
      setData(null);
    }
    void fetchReputation({ cancelledRef });

    const onChanged = () => void fetchReputation({ force: true, cancelledRef });
    window.addEventListener(REPUTATION_EVENT, onChanged);
    return () => {
      cancelledRef.current = true;
      window.removeEventListener(REPUTATION_EVENT, onChanged);
    };
  }, [enabled, fetchReputation, phase, userId]);

  const completeRecovery = useCallback(async () => {
    const raw = await requestApi('/users/me/reputation/recovery-complete', {
      method: 'POST',
      body: {},
    });
    notifyReputationChanged();
    return unwrap<Record<string, unknown>>(raw);
  }, []);

  const submitAppeal = useCallback(
    async (ledgerEntryId: string, reason: string, evidenceNote?: string) => {
      const raw = await requestApi('/users/me/reputation/appeals', {
        method: 'POST',
        body: { ledgerEntryId, reason, evidenceNote },
      });
      notifyReputationChanged();
      return unwrap<ReputationAppealItem>(raw);
    },
    [],
  );

  const refresh = useCallback(() => {
    invalidateResource(REPUTATION_CACHE_KEY);
    void fetchReputation({ force: true });
  }, [fetchReputation]);

  return {
    data,
    loading,
    error,
    refresh,
    completeRecovery,
    submitAppeal,
  };
}
