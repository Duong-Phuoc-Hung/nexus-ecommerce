import type { Metadata } from 'next';
import { getMarketplaceFeed } from '@/modules/home/api/marketplace.api';
import { ProductDirectory } from '@/modules/catalog/components/product-directory';
export const metadata: Metadata = { title: 'Tất cả sản phẩm | Nexus' };
export default async function ProductsPage() {
  return <ProductDirectory feed={await getMarketplaceFeed()} />;
}
