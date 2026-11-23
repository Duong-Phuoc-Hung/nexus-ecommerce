import { AdminUserReputationDetail } from '@/modules/admin/components/admin-user-reputation-detail';

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminUserReputationDetail id={id} mode="users" />;
}
