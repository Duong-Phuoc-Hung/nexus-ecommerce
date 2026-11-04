import BuyerOrderDetailPage from '@/modules/commerce/components/buyer-order-detail-page';
export default async function Route({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BuyerOrderDetailPage orderId={decodeURIComponent(id)} />;
}
