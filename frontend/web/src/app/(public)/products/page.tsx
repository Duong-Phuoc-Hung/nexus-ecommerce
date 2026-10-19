import { Suspense } from 'react';
import { CatalogListing, CatalogSkeleton } from '@/modules/catalog/components/catalog-listing';
export const metadata = { title: 'Sản phẩm | Nexus' };
export default function ProductsPage() {
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <CatalogListing />
    </Suspense>
  );
}
