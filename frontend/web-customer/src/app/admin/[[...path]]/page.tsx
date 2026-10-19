import { notFound } from 'next/navigation';
import { AdminWorkspace } from '@/modules/admin/components/admin-workspace';

export const metadata = { title: 'Quản trị | Nexus', robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ path?: string[] }> }) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const { path = [] } = await params;
  if (!(
    path.length === 0 ||
    (path[0] === 'products' &&
      (path.length === 1 ||
        (path.length === 2 && path[1] === 'new') ||
        (path.length === 3 && path[2] === 'edit')))
  ))
    notFound();
  return (
    <div className="nexus-admin">
      <AdminWorkspace path={path} basePath="/admin" />
    </div>
  );
}
