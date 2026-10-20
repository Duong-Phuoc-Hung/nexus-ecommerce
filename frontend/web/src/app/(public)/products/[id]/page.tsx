import { ProductDetail } from '@/modules/catalog/components/product-detail';
export const metadata = { title: 'Chi tiết sản phẩm | Nexus' };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductDetail productId={id} />;
}
