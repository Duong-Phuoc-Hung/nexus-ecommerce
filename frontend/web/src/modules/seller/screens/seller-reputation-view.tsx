'use client';

import { useSession } from '@/modules/auth/hooks/use-session';
import { ReputationCard } from '@/components/reputation';
import { PageHeading, DemoNote } from '@/modules/seller/components/seller-shared';

export function SellerReputationView() {
  const { user, phase } = useSession();

  const sellerName = user?.fullName || user?.email?.split('@')[0] || 'Gian hàng đối tác';
  const score = (user as any)?.reputationScore ?? 100;

  return (
    <div className="seller-reputation-page">
      <PageHeading
        eyebrow="SELLER CENTER / TÍN NHIỆM"
        title="Điểm uy tín người bán"
        description="Chỉ số phản ánh mức độ đáng tin cậy của bạn trong hoạt động niêm yết, đấu giá và hoàn tất đơn hàng."
      />
      <DemoNote message="Điểm tín nhiệm được đồng bộ trực tiếp từ hồ sơ người dùng (User Service & IAM theo SRS 3.1.2)." />

      <div style={{ marginTop: '1.5rem' }}>
        {phase === 'loading' ? (
          <p className="seller-readonly-note">Đang đồng bộ hồ sơ tín nhiệm…</p>
        ) : (
          <ReputationCard
            score={score}
            sellerName={sellerName}
            totalOrders={(user as any)?.ordersCount ?? 0}
            completionRate="100%"
            disputeRate="0.0%"
          />
        )}
      </div>
    </div>
  );
}
