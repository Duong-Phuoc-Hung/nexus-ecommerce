import { AuctionDetail } from '@/modules/auction/components/auction-detail';
export const metadata = { title: 'Chi tiết phiên đấu | Nexus' };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AuctionDetail key={id} id={id} />;
}
