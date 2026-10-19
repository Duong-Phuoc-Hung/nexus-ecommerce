import { SupportOrderDetailPage } from '@/modules/support/components/support-pages';

export default async function SupportOrderDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SupportOrderDetailPage orderId={id} />;
}
