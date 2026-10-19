import type { Metadata } from 'next';
import { getMarketplaceFeed } from '@/modules/home/api/marketplace.api';
import { AuctionDirectory } from '@/modules/auction/components/auction-directory';
export const metadata: Metadata = { title: 'Các phiên đấu giá | Nexus' };
export default async function AuctionsPage() {
  return <AuctionDirectory feed={await getMarketplaceFeed()} />;
}
