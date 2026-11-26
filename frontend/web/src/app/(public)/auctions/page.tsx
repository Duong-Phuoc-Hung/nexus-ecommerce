import { Suspense } from 'react';
import { AuctionList } from '@/modules/auction/components/auction-list';

export const metadata = { title: 'Đấu giá | Nexus' };

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="nexus-container py-10 text-sm text-muted">Đang tải phiên đấu giá…</div>
      }
    >
      <AuctionList />
    </Suspense>
  );
}
