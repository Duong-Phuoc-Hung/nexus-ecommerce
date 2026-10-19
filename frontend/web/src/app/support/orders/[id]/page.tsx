import { SupportOrderDetailPage } from '@/modules/support/screens/support-order-detail-page';

export default async function SupportOrderDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SupportOrderDetailPage orderId={id} />;
}
