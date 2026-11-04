import { Suspense } from 'react';
import { CheckoutResultPage } from '@/modules/commerce/components/checkout-result-page';

export const metadata = { title: 'Kết quả thanh toán | Nexus' };

export default function Page() {
  return (
    <Suspense
      fallback={
        <p className="nexus-container py-12" role="status">
          Đang tải kết quả…
        </p>
      }
    >
      <CheckoutResultPage />
    </Suspense>
  );
}
