import { notFound } from 'next/navigation';
import { AdminDetailScreen } from '@/modules/admin/components/admin-system-screens';
export default async function Page({
  params,
}: {
  params: Promise<{ section: string; id: string }>;
}) {
  const { section, id } = await params;
  if (!['users', 'orders', 'shipments', 'reputation'].includes(section)) notFound();
  return <AdminDetailScreen key={section + id} section={section} id={id} />;
}
