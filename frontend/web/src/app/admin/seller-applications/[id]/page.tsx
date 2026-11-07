import { AdminSellerApplicationDetail } from '../../../../modules/admin/components/seller-application-detail';

export default async function AdminSellerApplicationDetailRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminSellerApplicationDetail applicationId={id} />;
}
