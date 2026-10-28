import { CartLineInput, IShippingQuote, ShippingAddress } from '../../application/checkout/ports';

/**
 * Adapter tạm cho tới khi Fulfillment cung cấp API tính phí GHN.
 * Phí cố định (SHIPPING_FLAT_FEE) và chỉ giao trong nước; các tỉnh trong
 * SHIPPING_UNSUPPORTED_PROVINCES (phân tách bằng dấu phẩy) bị từ chối.
 */
export class FlatRateShippingQuote implements IShippingQuote {
  public async quote(
    address: ShippingAddress,
    _items: CartLineInput[],
  ): Promise<{ supported: boolean; fee: number }> {
    const blocked = (process.env.SHIPPING_UNSUPPORTED_PROVINCES || '')
      .split(',')
      .map((province) => province.trim().toLowerCase())
      .filter(Boolean);

    const supported =
      address.country === 'VN' && !blocked.includes(address.province.trim().toLowerCase());
    return { supported, fee: Number(process.env.SHIPPING_FLAT_FEE) || 30000 };
  }
}
