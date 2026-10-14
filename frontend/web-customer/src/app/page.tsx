import { getMarketplaceFeed } from '../modules/home/api/marketplace.api';
import { MarketplaceHome } from '../modules/home/components/marketplace-home';

export default async function HomePage() {
  return <MarketplaceHome feed={await getMarketplaceFeed()} />;
}
