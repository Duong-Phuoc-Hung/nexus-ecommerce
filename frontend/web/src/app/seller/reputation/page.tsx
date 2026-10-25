import type { Metadata } from 'next';
import { ReputationCard } from '@/components/reputation';
import { PageHeading } from '@/modules/seller/components/seller-shared';

export const metadata: Metadata = {
  title: 'Điểm uy tín người bán | Nexus Marketplace',
  description: 'Theo dõi chỉ số tín nhiệm, lịch sử giao dịch và quyền lợi bán hàng trên Nexus.',
};

export default function SellerReputationPage() {
  return (
    <div className="seller-reputation-page">
      <PageHeading
        eyebrow="SELLER CENTER / TÍN NHIỆM"
        title="Điểm uy tín người bán"
        description="Chỉ số phản ánh mức độ đáng tin cậy của bạn trong hoạt động niêm yết, đấu giá và hoàn tất đơn hàng."
      />
      <div style={{ marginTop: '1.5rem' }}>
        <ReputationCard score={98} sellerName="Nexus Demo Seller" />
      </div>
    </div>
  );
}
