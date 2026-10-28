import { Suspense } from 'react';
import { BuyerAddressesPage } from '@/modules/user/components/buyer-addresses-page';

export const metadata = { title: 'Địa chỉ nhận hàng | Nexus' };

export default function Page() {
  return (
    <Suspense
      fallback={
        <p className="nexus-container py-10" role="status">
          Đang tải địa chỉ…
        </p>
      }
    >
      <BuyerAddressesPage />
    </Suspense>
  );
}
