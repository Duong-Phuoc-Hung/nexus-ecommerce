import { notFound } from 'next/navigation';
import { AdminWorkspace } from '@/modules/admin/components/admin-workspace';
import { AdminRouteGuard } from '@/modules/admin/components/admin-route-guard';

export const metadata = { title: 'Quản trị | Nexus', robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ path?: string[] }> }) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const { path = [] } = await params;
  const isProductRoute =
    path[0] === 'products' &&
    (path.length === 1 ||
      (path.length === 2 && path[1] === 'new') ||
      (path.length === 3 && path[2] === 'edit'));
  const isAuctionRoute = path[0] === 'auctions' && path.length === 1;
  if (!(path.length === 0 || isProductRoute || isAuctionRoute)) notFound();
  return (
    <div className="nexus-admin">
      <AdminRouteGuard>
        <AdminWorkspace path={path} basePath="/admin" />
      </AdminRouteGuard>
    </div>
  );
}
