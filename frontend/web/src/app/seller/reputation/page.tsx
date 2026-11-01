import type { Metadata } from 'next';
import { SellerReputationView } from '@/modules/seller/screens/seller-reputation-view';

export const metadata: Metadata = {
  title: 'Điểm uy tín người bán | Nexus Marketplace',
  description: 'Theo dõi chỉ số tín nhiệm, lịch sử giao dịch và quyền lợi bán hàng trên Nexus.',
};

export default function SellerReputationPage() {
  return <SellerReputationView />;
}
