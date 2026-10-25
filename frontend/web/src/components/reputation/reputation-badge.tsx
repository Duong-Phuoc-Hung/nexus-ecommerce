import type { FC } from 'react';

export interface ReputationBadgeProps {
  score: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ReputationBadge: FC<ReputationBadgeProps> = ({
  score,
  showLabel = true,
  size = 'md',
}) => {
  const getTier = (val: number) => {
    if (val >= 90) return { label: 'Uy tín cao', tier: 'tier-diamond', color: '#10b981' };
    if (val >= 75) return { label: 'Tốt', tier: 'tier-gold', color: '#3b82f6' };
    if (val >= 50) return { label: 'Tiêu chuẩn', tier: 'tier-silver', color: '#f59e0b' };
    return { label: 'Cần cải thiện', tier: 'tier-warning', color: '#ef4444' };
  };

  const { label, tier } = getTier(score);

  return (
    <span
      className={`reputation-badge reputation-badge-${size} ${tier}`}
      title={`Điểm uy tín: ${score}/100 - Đánh giá: ${label}`}
      role="status"
      aria-label={`Điểm uy tín ${score} trên 100`}
    >
      <span className="reputation-icon" aria-hidden="true">
        ✦
      </span>
      <strong className="reputation-score">{score}</strong>
      {showLabel && <span className="reputation-tier-label">{label}</span>}
    </span>
  );
};
