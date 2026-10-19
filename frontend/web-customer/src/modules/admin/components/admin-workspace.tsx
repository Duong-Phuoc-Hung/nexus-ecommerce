'use client';

import Link from 'next/link';
import { AdminAuctions } from './admin-auctions';
import { AdminCatalogProvider } from './admin-catalog-context';
import { AdminProducts } from './admin-products';
import { ProductForm } from './product-form';
import { AdminFrame } from './admin-frame';
import { AdminOverview } from './admin-overview';

export function AdminWorkspace({
  path,
  basePath = '/admin',
}: {
  path: string[];
  basePath?: string;
}) {
  if (process.env.NODE_ENV !== 'development') return null;
  const content =
    path[0] === 'auctions' ? (
      <AdminAuctions key={path.join('/')} />
    ) : !path.length ? (
      <AdminOverview productsPath={basePath + '/products'} />
    ) : path.length === 1 ? (
      <AdminProducts />
    ) : path[1] === 'new' ? (
      <ProductForm />
    ) : (
      <ProductForm productId={path[1]} />
    );
  return (
    <AdminCatalogProvider productsPath={basePath + '/products'}>
      <AdminFrame
        name="Không gian quản trị"
        homePath={basePath}
        productsPath={basePath + '/products'}
        actions={
          <Link className="admin-edit-link" href={basePath === '/admin' ? '/' : '/login'}>
            {basePath === '/admin' ? 'Về cửa hàng' : 'Đăng nhập'}
          </Link>
        }
      >
        {content}
      </AdminFrame>
    </AdminCatalogProvider>
  );
}
