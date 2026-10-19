import { ProductForm } from '@/modules/admin/components/product-form';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductForm productId={id} />;
}
