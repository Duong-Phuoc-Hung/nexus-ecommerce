// Mock feed đã ngừng cấp dữ liệu trang chủ sau khi Catalog/Auction có API.
// import { getMarketplaceFeed } from '../../modules/home/api/marketplace.api';
import { MarketplaceHome } from '../../modules/home/components/marketplace-home';

export default function HomePage() {
  return <MarketplaceHome />;
}
