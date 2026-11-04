import { AuctionForm } from '@/modules/admin/components/auction-form';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AuctionForm id={id} />;
}
