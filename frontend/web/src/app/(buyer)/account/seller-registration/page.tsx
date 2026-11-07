import { StoreHeader } from '../../../../components/layout/store-header';
import { SellerRegistrationPage } from '../../../../modules/user/components/seller-registration-page';

export default function BuyerSellerRegistrationRoutePage() {
  return (
    <>
      <StoreHeader />
      <main className="nexus-container py-6">
        <SellerRegistrationPage />
      </main>
    </>
  );
}
