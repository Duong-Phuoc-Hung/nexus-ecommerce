import { SellerProductForm } from '@/modules/seller/components/seller-pages';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SellerProductForm productId={id} />;
}
