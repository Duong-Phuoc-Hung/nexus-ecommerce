import { CartLineInput, IShippingQuote, ShippingAddress } from '../../application/checkout/ports';
import { FlatRateShippingQuote } from './FlatRateShippingQuote';

export interface GhnQuoteConfig {
  apiUrl?: string;
  apiToken?: string;
  shopId?: string | number;
  originDistrictId?: number;
  originWardCode?: string;
  timeoutMs?: number;
}

/**
 * Mapping các quận huyện trọng điểm tại Việt Nam sang ID của GHN (Giao Hàng Nhanh).
 * Cho phép tra cứu nhanh mà không cần tốn thêm round-trip API master-data.
 */
const DISTRICT_NAME_TO_GHN_ID: Record<string, number> = {
  // TP. Hồ Chí Minh (Province ID ~ 202)
  'quan 1': 1442,
  'quận 1': 1442,
  'quan 3': 1443,
  'quận 3': 1443,
  'quan 4': 1461,
  'quận 4': 1461,
  'quan 5': 1444,
  'quận 5': 1444,
  'quan 6': 1462,
  'quận 6': 1462,
  'quan 7': 1446,
  'quận 7': 1446,
  'quan 8': 1463,
  'quận 8': 1463,
  'quan 10': 1448,
  'quận 10': 1448,
  'quan 11': 1464,
  'quận 11': 1464,
  'quan 12': 1453,
  'quận 12': 1453,
  'tan binh': 1451,
  'tân bình': 1451,
  'binh thanh': 1450,
  'bình thạnh': 1450,
  'go vap': 1449,
  'gò vấp': 1449,
  'phu nhuan': 1452,
  'phú nhuận': 1452,
  'thu duc': 1447,
  'thủ đức': 1447,
  'binh tan': 1454,
  'bình tân': 1454,
  'tan phu': 1465,
  'tân phú': 1465,
  'nha be': 1455,
  'nhà bè': 1455,
  'hoc mon': 1457,
  'hóc môn': 1457,
  'cu chi': 1456,
  'củ chi': 1456,
  'binh chanh': 1458,
  'bình chánh': 1458,

  // Hà Nội (Province ID ~ 201)
  'ba dinh': 1482,
  'ba đình': 1482,
  'hoan kiem': 1483,
  'hoàn kiếm': 1483,
  'tay ho': 1484,
  'tây hồ': 1484,
  'long bien': 1485,
  'long biên': 1485,
  'cau giay': 1486,
  'cầu giấy': 1486,
  'dong da': 1487,
  'đống đa': 1487,
  'hai ba trung': 1488,
  'hai bà trưng': 1488,
  'hoang mai': 1489,
  'hoàng mai': 1489,
  'thanh xuan': 1490,
  'thanh xuân': 1490,
  'nam tu liem': 1491,
  'nam từ liêm': 1491,
  'bac tu liem': 1492,
  'bắc từ liêm': 1492,
  'ha dong': 1493,
  'hà đông': 1493,

  // Đà Nẵng (Province ID ~ 203)
  'hai chau': 1534,
  'hải châu': 1534,
  'thanh khe': 1535,
  'thanh khê': 1535,
  'son tra': 1536,
  'sơn trà': 1536,
  'ngu hanh son': 1537,
  'ngũ hành sơn': 1537,
  'lien chieu': 1538,
  'liên chiểu': 1538,
  'cam le': 1539,
  'cẩm lệ': 1539,
};

/**
 * GHN (Giao Hàng Nhanh) Shipping Fee Calculator Client.
 * Tích hợp trực tiếp với API Sandbox/Production của GHN:
 * POST https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/fee
 *
 * Thiết kế Anti-fragile: Tự động fallback về FlatRateShippingQuote khi chưa cấu hình Token
 * hoặc khi kết nối mạng/môi trường Sandbox gặp sự cố, đảm bảo luồng thanh toán không bị gián đoạn.
 */
export class GhnShippingQuoteClient implements IShippingQuote {
  private readonly apiUrl: string;
  private readonly apiToken: string;
  private readonly shopId: string;
  private readonly originDistrictId: number;
  private readonly originWardCode: string;
  private readonly timeoutMs: number;
  private readonly fallbackQuote: IShippingQuote;

  constructor(config?: GhnQuoteConfig, fallback?: IShippingQuote) {
    this.apiUrl = (
      config?.apiUrl ||
      process.env.GHN_API_URL ||
      'https://dev-online-gateway.ghn.vn/shiip/public-api/v2'
    ).replace(/\/$/, '');

    this.apiToken = (
      config?.apiToken ||
      process.env.GHN_API_TOKEN ||
      process.env.GHN_TOKEN ||
      ''
    ).trim();
    this.shopId = String(config?.shopId || process.env.GHN_SHOP_ID || '').trim();
    this.originDistrictId =
      Number(config?.originDistrictId || process.env.GHN_ORIGIN_DISTRICT_ID) || 1442; // Mặc định Kho TP.HCM: Quận 1 (1442)
    this.originWardCode = config?.originWardCode || process.env.GHN_ORIGIN_WARD_CODE || '20308'; // Mặc định Phường Bến Nghé
    this.timeoutMs = config?.timeoutMs || Number(process.env.GHN_TIMEOUT_MS) || 4000;
    this.fallbackQuote = fallback || new FlatRateShippingQuote();
  }

  /**
   * Tính phí vận chuyển thực tế từ GHN API.
   * @param address Địa chỉ nhận hàng
   * @param items Danh sách sản phẩm trong giỏ hàng (tính trọng lượng & kích thước đóng gói)
   */
  public async quote(
    address: ShippingAddress,
    items: CartLineInput[],
  ): Promise<{ supported: boolean; fee: number }> {
    // 1. Kiểm tra quốc gia và danh sách tỉnh bị chặn (Blacklist check)
    if (address.country && address.country !== 'VN') {
      return { supported: false, fee: 0 };
    }

    const blockedProvinces = (process.env.SHIPPING_UNSUPPORTED_PROVINCES || '')
      .split(',')
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean);

    if (blockedProvinces.includes(address.province.trim().toLowerCase())) {
      return { supported: false, fee: 0 };
    }

    // 2. Nếu chưa có API Token hoặc Shop ID (local dev / offline test), fallback ngay
    if (!this.apiToken || !this.shopId) {
      return this.fallbackQuote.quote(address, items);
    }

    // 3. Tính toán trọng lượng kiện hàng (ước tính 400g cho món đầu tiên + 250g cho mỗi món tiếp theo)
    const totalQuantity = items.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);
    const estimatedWeightGrams = Math.min(
      50000,
      Math.max(200, 400 + Math.max(0, totalQuantity - 1) * 250),
    );

    // 4. Giải quyết mã Quận/Huyện đích (to_district_id) & Phường/Xã (to_ward_code)
    const { districtId, wardCode } = this.resolveDestination(address);

    try {
      const endpoint = `${this.apiUrl}/shipping-order/fee`;
      const payload = {
        from_district_id: this.originDistrictId,
        from_ward_code: this.originWardCode,
        service_type_id: 2, // 2: Chuẩn / Tiêu chuẩn (Standard Delivery)
        to_district_id: districtId,
        to_ward_code: wardCode,
        height: 10,
        length: 20,
        width: 15,
        weight: estimatedWeightGrams,
        insurance_value: 0,
      };

      const controller = new AbortController();
      const timeoutTimer = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Token: this.apiToken,
          ShopId: this.shopId,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutTimer);

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(
          `[GhnShippingQuoteClient] GHN API returned HTTP ${response.status}: ${errorText}. Falling back to flat rate quote.`,
        );
        return this.fallbackQuote.quote(address, items);
      }

      const result = (await response.json()) as any;
      if (result && result.code === 200 && result.data && typeof result.data.total === 'number') {
        return {
          supported: true,
          fee: Math.round(result.data.total),
        };
      }

      console.warn(
        `[GhnShippingQuoteClient] GHN API returned unexpected response: ${JSON.stringify(result)}. Falling back.`,
      );
      return this.fallbackQuote.quote(address, items);
    } catch (error: any) {
      console.warn(
        `[GhnShippingQuoteClient] Exception during GHN quote fetch: ${error.message}. Using resilient fallback.`,
      );
      return this.fallbackQuote.quote(address, items);
    }
  }

  /**
   * Phân giải tên quận/huyện và tỉnh thành từ địa chỉ sang District ID của GHN.
   */
  private resolveDestination(address: ShippingAddress): { districtId: number; wardCode: string } {
    const rawDistrict = (address.district || '').trim().toLowerCase();
    const rawProvince = (address.province || '').trim().toLowerCase();
    const rawWard = (address.ward || '').trim();

    // 1. Nếu district đã là số (ví dụ: "1442")
    if (/^\d+$/.test(rawDistrict)) {
      return {
        districtId: parseInt(rawDistrict, 10),
        wardCode: rawWard || '20308',
      };
    }

    // 2. Tra cứu theo từ khóa quận/huyện
    if (rawDistrict && DISTRICT_NAME_TO_GHN_ID[rawDistrict]) {
      return {
        districtId: DISTRICT_NAME_TO_GHN_ID[rawDistrict],
        wardCode: rawWard || '20308',
      };
    }

    // Tra cứu từng phần chuỗi
    for (const [name, id] of Object.entries(DISTRICT_NAME_TO_GHN_ID)) {
      if (rawDistrict.includes(name) || name.includes(rawDistrict)) {
        return { districtId: id, wardCode: rawWard || '20308' };
      }
    }

    // 3. Fallback theo Tỉnh/Thành phổ biến
    if (
      rawProvince.includes('hồ chí minh') ||
      rawProvince.includes('hcm') ||
      rawProvince.includes('sài gòn')
    ) {
      return { districtId: 1442, wardCode: rawWard || '20308' }; // Quận 1, TP.HCM
    }
    if (rawProvince.includes('hà nội') || rawProvince.includes('hn')) {
      return { districtId: 1482, wardCode: rawWard || '1A0101' }; // Ba Đình, Hà Nội
    }
    if (rawProvince.includes('đà nẵng') || rawProvince.includes('da nang')) {
      return { districtId: 1534, wardCode: rawWard || '300101' }; // Hải Châu, Đà Nẵng
    }
    if (rawProvince.includes('bình dương')) {
      return { districtId: 1500, wardCode: rawWard || '20101' }; // Thủ Dầu Một
    }
    if (rawProvince.includes('đồng nai')) {
      return { districtId: 1515, wardCode: rawWard || '20201' }; // Biên Hòa
    }

    // Mặc định an toàn
    return { districtId: 1442, wardCode: rawWard || '20308' };
  }
}
