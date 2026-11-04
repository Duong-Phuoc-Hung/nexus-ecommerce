import { AuctionManagementDetail } from '@/modules/admin/components/auction-management-detail';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AuctionManagementDetail id={id} />;
}
