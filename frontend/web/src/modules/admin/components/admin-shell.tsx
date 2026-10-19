'use client';
import Link from 'next/link';
import { Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminRouteGuard } from './admin-route-guard';
import { AdminCatalogProvider } from './admin-catalog-context';
import { AdminFrame } from './admin-frame';
export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="nexus-admin">
      <AdminRouteGuard>
        <AdminCatalogProvider productsPath="/admin/products">
          <AdminFrame
            name="Không gian quản trị"
            homePath="/admin"
            productsPath="/admin/products"
            actions={
              <Button asChild variant="outline" size="sm" className="admin-store-button">
                <Link href="/">
                  <Store aria-hidden="true" size={16} />
                  <span>Về cửa hàng</span>
                </Link>
              </Button>
            }
          >
            {children}
          </AdminFrame>
        </AdminCatalogProvider>
      </AdminRouteGuard>
    </div>
  );
}
