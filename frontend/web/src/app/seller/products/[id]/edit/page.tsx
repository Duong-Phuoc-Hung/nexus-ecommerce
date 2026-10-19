import { SellerProductForm } from '@/modules/seller/screens/seller-product-form';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SellerProductForm productId={id} />;
}
