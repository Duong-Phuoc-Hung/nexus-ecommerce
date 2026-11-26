import { Suspense } from 'react';
import { BuyerReputationPage } from '@/modules/user/components/buyer-reputation-page';

export default function AccountReputationRoute() {
  return (
    <Suspense fallback={<div className="nexus-container py-10 text-sm text-muted">Đang tải…</div>}>
      <BuyerReputationPage />
    </Suspense>
  );
}
