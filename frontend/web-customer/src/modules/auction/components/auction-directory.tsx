import { MarketplaceDirectory } from '@/shared/components/marketplace-directory';
import type { MarketplaceFeed } from '@/modules/home/types/marketplace.types';
export function AuctionDirectory({ feed }: { feed: MarketplaceFeed }) {
  return <MarketplaceDirectory feed={feed} variant="auctions" />;
}
