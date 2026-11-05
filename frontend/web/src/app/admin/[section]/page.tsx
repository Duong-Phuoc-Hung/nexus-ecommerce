import { notFound } from 'next/navigation';
import { resources } from '@/modules/admin/config/resources';
import { AdminResourceScreen } from '@/modules/admin/components/admin-resource-screen';
import {
  AdminProfile,
  AdminSettings,
  AdminHealth,
} from '@/modules/admin/components/admin-system-screens';
export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (section === 'profile') return <AdminProfile />;
  if (section === 'settings') return <AdminSettings />;
  if (section === 'health') return <AdminHealth />;
  if (!Object.hasOwn(resources, section)) notFound();
  return <AdminResourceScreen key={section} section={section} />;
}
