import assert from 'node:assert/strict';
import net from 'node:net';
import test from 'node:test';
import { CartService, CartValidationError } from './application/cart/CartService';
import { validateValidateCartInput } from './application/cart/dtos/AddToCartDto';
import { PromotionService } from './application/promotion/PromotionService';
import { CheckoutService } from './application/checkout/CheckoutService';
import {
  ICatalogClient,
  IShippingQuote,
  IPaymentGateway,
  QuoteRecord,
} from './application/checkout/ports';
import { PostgresPromotionRepository } from './infrastructure/repositories/PostgresPromotionRepository';
import { PostgresCartRepository } from './infrastructure/repositories/PostgresCartRepository';
import { PostgresCheckoutRepository } from './infrastructure/repositories/PostgresCheckoutRepository';
import { PostgresOrderRepository } from './infrastructure/repositories/PostgresOrderRepository';
import { GetOrderDetailUseCase } from './application/use-cases/GetOrderDetailUseCase';
import { getCommerceDbPool } from './infrastructure/database/pgPool';

async function isPortOpen(port: number, host = '127.0.0.1', timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isResolved = false;

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      isResolved = true;
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve(false);
      }
    });
    socket.once('error', () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve(false);
      }
    });
    socket.connect(port, host);
  });
}

// =============================================================================
// TEST SUITES: 100% TEST VỚI DATABASE THẬT POSTGRESQL (nexus_commerce_db)
// =============================================================================

test('1. DTO Validation: POST /api/v1/cart/validate kiểm tra cấu trúc đầu vào', () => {
  // Hợp lệ với items và promoCode
  const valid = validateValidateCartInput({
    items: [{ productId: '01932f01-0001-7000-8000-000000000001', quantity: 2 }],
    promoCode: 'nexus50k',
  });
  assert.equal(valid.items.length, 1);
  assert.equal(valid.items[0].quantity, 2);
  assert.equal(valid.promoCode, 'NEXUS50K');

  // Lỗi khi items rỗng
  assert.throws(
    () => validateValidateCartInput({ items: [] }),
    (err: any) => {
      assert.ok(err instanceof CartValidationError);
      assert.equal(err.status, 400);
      return true;
    },
  );

  // Lỗi khi quantity < 1
  assert.throws(
    () =>
      validateValidateCartInput({
        items: [{ productId: '01932f01-0001-7000-8000-000000000001', quantity: 0 }],
      }),
    (err: any) => {
      assert.ok(err instanceof CartValidationError);
      assert.ok(err.fieldErrors?.['items[0].quantity']);
      return true;
    },
  );
});

test('2. Live DB: PostgresPromotionRepository truy vấn trực tiếp bảng commerce_promotions thật', async (t) => {
  const isPostgresRunning = await isPortOpen(5434);
  if (!isPostgresRunning) {
    t.skip('Bỏ qua test vì PostgreSQL container cổng 5434 chưa được bật.');
    return;
  }

  const pool = getCommerceDbPool();
  const repo = new PostgresPromotionRepository(pool);

  // Truy vấn mã NEXUS50K thật từ bảng commerce_promotions
  const nexus50k = await repo.findByCode('NEXUS50K');
  assert.ok(nexus50k, 'Bắt buộc phải tìm thấy mã NEXUS50K trong DB PostgreSQL thật');
  assert.equal(nexus50k.code, 'NEXUS50K');
  assert.equal(nexus50k.discountType, 'FIXED');
  assert.equal(nexus50k.discountValue, 50000);
  assert.equal(nexus50k.minOrderAmount, 500000);
  assert.equal(nexus50k.status, 'ACTIVE');

  // Truy vấn danh sách các mã đang ACTIVE
  const activePromos = await repo.findActivePromotions();
  assert.ok(activePromos.length >= 3, 'Phải có tối thiểu 3 mã khuyến mãi thật được nạp trong DB');
  const codes = activePromos.map((p) => p.code);
  assert.ok(codes.includes('NEXUS50K'));
  assert.ok(codes.includes('FREESHIP'));
  assert.ok(codes.includes('WELCOME10'));
});

test('3. Live DB: PromotionService xác thực mã thật qua PostgresPromotionRepository', async (t) => {
  const isPostgresRunning = await isPortOpen(5434);
  if (!isPostgresRunning) {
    t.skip('Bỏ qua test vì PostgreSQL container cổng 5434 chưa được bật.');
    return;
  }

  const pool = getCommerceDbPool();
  const repo = new PostgresPromotionRepository(pool);
  const service = new PromotionService(repo);

  const testUserId = `user_promo_test_${Date.now()}`;

  // 1. Mã không tồn tại trong DB -> PROMO_NOT_FOUND
  const notFound = await service.validatePromotion({
    code: 'MA_KHONG_TON_TAI_TRONG_DB',
    userId: testUserId,
    subtotal: 600000,
  });
  assert.equal(notFound.valid, false);
  assert.equal(notFound.reasonCode, 'PROMO_NOT_FOUND');

  // 2. Mã NEXUS50K thật trong DB: đơn chưa đủ 500.000 ₫ -> PROMO_MIN_ORDER_NOT_MET
  const minNotMet = await service.validatePromotion({
    code: 'NEXUS50K',
    userId: testUserId,
    subtotal: 400000,
  });
  assert.equal(minNotMet.valid, false);
  assert.equal(minNotMet.reasonCode, 'PROMO_MIN_ORDER_NOT_MET');

  // 3. Mã NEXUS50K thật trong DB: đơn 600.000 ₫ -> Hợp lệ, giảm đúng 50.000 ₫
  const validFixed = await service.validatePromotion({
    code: 'NEXUS50K',
    userId: testUserId,
    subtotal: 600000,
  });
  assert.equal(validFixed.valid, true);
  assert.equal(validFixed.discountAmount, 50000);
  assert.equal(validFixed.reasonCode, null);

  // 4. Mã WELCOME10 thật trong DB (10% tối đa 100k):
  // - Đơn 800.000 ₫ -> giảm 80.000 ₫
  const validPercent = await service.validatePromotion({
    code: 'WELCOME10',
    userId: testUserId,
    subtotal: 800000,
  });
  assert.equal(validPercent.valid, true);
  assert.equal(validPercent.discountAmount, 80000);

  // - Đơn 2.000.000 ₫ -> 10% là 200k, áp trần maxDiscountAmount = 100.000 ₫
  const validCapped = await service.validatePromotion({
    code: 'WELCOME10',
    userId: testUserId,
    subtotal: 2000000,
  });
  assert.equal(validCapped.valid, true);
  assert.equal(validCapped.discountAmount, 100000);
});

test('4. Live DB: Ghi nhận lịch sử dùng mã vào commerce_promotion_usages và chống dùng vượt hạn mức', async (t) => {
  const isPostgresRunning = await isPortOpen(5434);
  if (!isPostgresRunning) {
    t.skip('Bỏ qua test vì PostgreSQL container cổng 5434 chưa được bật.');
    return;
  }

  const pool = getCommerceDbPool();
  const repo = new PostgresPromotionRepository(pool);
  const service = new PromotionService(repo);

  const promo = await repo.findByCode('WELCOME10');
  assert.ok(promo);
  // WELCOME10 có perUserLimit = 1

  const limitedUserId = `user_limit_exceeded_${Date.now()}`;

  // Kiểm tra trước khi dùng: số lần dùng trong DB = 0
  const beforeCount = await repo.countUserUsages(promo.id, limitedUserId);
  assert.equal(beforeCount, 0);

  // Lần đầu: hợp lệ
  const firstTry = await service.validatePromotion({
    code: 'WELCOME10',
    userId: limitedUserId,
    subtotal: 500000,
  });
  assert.equal(firstTry.valid, true);

  // Ghi nhận sử dụng mã vào DB thật (bảng commerce_promotion_usages)
  await repo.recordUsageAndIncrement({
    promotionId: promo.id,
    userId: limitedUserId,
    orderId: '2', // Sử dụng ID đơn hàng có thật trong DB để thỏa mãn Foreign Key
    discountAmount: 50000,
  });

  // Kiểm tra DB thật: số lần dùng của user này đã tăng lên 1
  const afterCount = await repo.countUserUsages(promo.id, limitedUserId);
  assert.equal(afterCount, 1);

  // Lần hai: bị chặn ngay lập tức do vượt perUserLimit (1 lần) -> PROMO_USER_LIMIT_REACHED
  const secondTry = await service.validatePromotion({
    code: 'WELCOME10',
    userId: limitedUserId,
    subtotal: 500000,
  });
  assert.equal(secondTry.valid, false);
  assert.equal(secondTry.reasonCode, 'PROMO_USER_LIMIT_REACHED');
});

test('5. Live DB: GET /api/v1/checkout/promotions tính toán eligible trực tiếp từ DB thật', async (t) => {
  const isPostgresRunning = await isPortOpen(5434);
  if (!isPostgresRunning) {
    t.skip('Bỏ qua test vì PostgreSQL container cổng 5434 chưa được bật.');
    return;
  }

  const pool = getCommerceDbPool();
  const repo = new PostgresPromotionRepository(pool);
  const service = new PromotionService(repo);

  // Với đơn 150.000 ₫:
  // - NEXUS50K (min 500k) -> eligible: false
  // - WELCOME10 (min 100k) -> eligible: true, estimatedDiscount = 15.000 ₫
  const list = await service.getEligiblePromotions('any_buyer', 150000);
  assert.ok(list.length >= 3);

  const nexus50k = list.find((p) => p.code === 'NEXUS50K')!;
  assert.equal(nexus50k.eligible, false);
  assert.ok(nexus50k.ineligibleReason?.includes('500.000'));

  const welcome10 = list.find((p) => p.code === 'WELCOME10')!;
  assert.equal(welcome10.eligible, true);
  assert.equal(welcome10.estimatedDiscount, 15000);
});

test('6. Live DB: PostgresCartRepository tạo và truy vấn giỏ hàng thực tế từ bảng commerce_carts', async (t) => {
  const isPostgresRunning = await isPortOpen(5434);
  if (!isPostgresRunning) {
    t.skip('Bỏ qua test vì PostgreSQL container cổng 5434 chưa được bật.');
    return;
  }

  const pool = getCommerceDbPool();
  const cartRepo = new PostgresCartRepository(pool);

  const testUserId = `test_live_cart_user_${Date.now()}`;
  const cartRecord = await cartRepo.getOrCreateCart(testUserId);

  assert.ok(cartRecord.id, 'Phải có cart ID được sinh từ PostgreSQL');
  assert.equal(cartRecord.userId, testUserId);
  assert.ok(cartRecord.expiresAt > new Date());
});

test('7. Live DB: PostgresCheckoutRepository lưu và nạp Quote với nhiều hãng vận chuyển & khuyến mãi', async (t) => {
  const isPostgresRunning = await isPortOpen(5434);
  if (!isPostgresRunning) {
    t.skip('Bỏ qua test vì PostgreSQL container cổng 5434 chưa được bật.');
    return;
  }

  const pool = getCommerceDbPool();
  const checkoutRepo = new PostgresCheckoutRepository(pool);

  const testQuoteId = `01934000-0000-7000-8000-${Date.now().toString().slice(-12).padStart(12, '0')}`;
  const quoteData: QuoteRecord = {
    id: testQuoteId,
    buyerId: 'buyer_live_test_01',
    sellerId: 'seller_live_test_01',
    items: [
      {
        productId: 'prod_live_01',
        title: 'Bàn phím cơ Bluetooth',
        unitPrice: 650000,
        quantity: 1,
        subtotal: 650000,
      },
    ],
    shippingAddress: {
      fullName: 'Trần Thị Thu',
      phone: '0912345678',
      province: 'TP. Hồ Chí Minh',
      addressLine: '456 Hai Bà Trưng',
      country: 'VN',
    },
    subtotal: 650000,
    discountAmount: 50000,
    taxAmount: 0,
    shippingFee: 32000,
    totalAmount: 632000,
    currency: 'VND',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    promoCode: 'NEXUS50K',
    selectedShippingOptionId: 'GHN_STANDARD',
    shippingOptions: [
      {
        optionId: 'GHN_STANDARD',
        carrier: 'GHN',
        carrierName: 'Giao Hàng Nhanh',
        serviceName: 'Tiêu chuẩn',
        fee: 32000,
        etaDaysMin: 2,
        etaDaysMax: 3,
        etaText: 'Dự kiến 2–3 ngày',
        estimatedDeliveryAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        recommended: true,
      },
      {
        optionId: 'GHTK_FAST',
        carrier: 'GHTK',
        carrierName: 'Giao Hàng Tiết Kiệm',
        serviceName: 'Giao nhanh',
        fee: 48000,
        etaDaysMin: 1,
        etaDaysMax: 2,
        etaText: 'Dự kiến 1–2 ngày',
        estimatedDeliveryAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        recommended: false,
      },
    ],
  };

  // Lưu vào PostgreSQL thật: bảng commerce_checkout_quotes
  await checkoutRepo.saveQuote(quoteData);

  // Nạp lại trực tiếp từ PostgreSQL thật
  const loaded = await checkoutRepo.findQuote(testQuoteId);
  assert.ok(loaded, 'Phải tìm thấy Quote vừa lưu trong DB PostgreSQL thật');
  assert.equal(loaded.id, testQuoteId);
  assert.equal(loaded.discountAmount, 50000);
  assert.equal(loaded.promoCode, 'NEXUS50K');
  assert.equal(loaded.selectedShippingOptionId, 'GHN_STANDARD');
  assert.equal(loaded.totalAmount, 632000);
  assert.ok(Array.isArray(loaded.shippingOptions));
  assert.equal(loaded.shippingOptions!.length, 2);
});

test('8. Live DB: PostgresOrderRepository và GetOrderDetailUseCase trả đầy đủ snapshot khuyến mãi & vận chuyển', async (t) => {
  const isPostgresRunning = await isPortOpen(5434);
  if (!isPostgresRunning) {
    t.skip('Bỏ qua test vì PostgreSQL container cổng 5434 chưa được bật.');
    return;
  }

  const pool = getCommerceDbPool();
  const orderRepo = new PostgresOrderRepository(pool);
  const useCase = new GetOrderDetailUseCase(orderRepo);

  // Truy vấn đơn hàng mẫu thật trong DB PostgreSQL: NX-ORD-8009
  const orderDetail = await useCase.execute('NX-ORD-8009');
  assert.ok(orderDetail, 'Phải nạp được chi tiết đơn hàng NX-ORD-8009 từ DB thật');
  assert.equal(orderDetail.id, 'NX-ORD-8009');
  assert.ok(orderDetail.totalAmount > 0);
  assert.ok('promoCode' in orderDetail, 'DTO phải chứa trường promoCode');
  assert.ok('taxAmount' in orderDetail, 'DTO phải chứa trường taxAmount');
  assert.ok('shippingCarrier' in orderDetail, 'DTO phải chứa trường shippingCarrier');
  assert.ok('shippingServiceName' in orderDetail, 'DTO phải chứa trường shippingServiceName');
  assert.ok('estimatedDeliveryAt' in orderDetail, 'DTO phải chứa trường estimatedDeliveryAt');
});

// =============================================================================
// TEST SUITES: KIỂM THỬ CHẶT CHẼ 5 LỖI P1 THEO BÁO CÁO REVIEW
// =============================================================================

test('9. [P1-1] Voucher không đủ điều kiện (min-spend) không bị trừ lượt trong DB khi checkout', async () => {
  const validProdId = '01932f01-0001-7000-8000-000000000001';
  let createdParams: any = null;
  const mockRepo: any = {
    saveQuote: async () => {},
    findQuote: async () => null,
    createOrder: async (params: any) => {
      createdParams = params;
      return {
        order: {
          id: 'ORD-TEST-1',
          orderCode: 'ORD-TEST-1',
          status: 'PROCESSING',
          totalAmount: 232000,
          items: [],
          expiresAt: new Date(),
        },
        payment: {
          id: 'PAY-1',
          orderId: 'ORD-TEST-1',
          paymentMethod: 'COD',
          status: 'SUCCESS',
          amount: 232000,
        },
        replay: false,
        requestHash: 'hash',
      };
    },
  };
  const mockCatalog: any = {
    findProduct: async (id: string) => ({
      id,
      sellerId: 'SELLER-1',
      title: 'Item 1',
      price: 200000,
      stockQuantity: 10,
      status: 'ACTIVE',
    }),
  };
  const mockShipping: any = {
    quote: async () => ({ supported: true, fee: 32000 }),
  };
  const mockGateway: any = { isConfigured: () => false };
  const mockPromoService: any = {
    validatePromotion: async () => ({
      valid: false,
      discountAmount: 0,
      reasonCode: 'MIN_ORDER_AMOUNT_NOT_MET',
    }),
    getPromotionByCode: async () => ({ id: 'promo-50k', code: 'NEXUS50K' }),
  };

  const service = new CheckoutService(
    mockRepo,
    mockCatalog,
    mockShipping,
    mockGateway,
    mockPromoService,
  );

  // Checkout trực tiếp với mã NEXUS50K không đủ min-spend
  await service.checkout(
    'buyer-1',
    {
      items: [{ productId: validProdId, quantity: 1 }],
      shippingAddress: {
        fullName: 'Nguyen Van A',
        phone: '0901234567',
        province: 'Hà Nội',
        district: 'Ba Đình',
        addressLine: '123 Đội Cấn',
      },
      paymentMethod: 'COD',
      promoCode: 'NEXUS50K',
    },
    undefined,
  );

  assert.ok(createdParams, 'createOrder phải được gọi');
  assert.equal(createdParams.discountAmount, 0, 'Tiền giảm phải là 0đ');
  assert.equal(
    createdParams.promotionId,
    undefined,
    'promotionId phải là undefined, không được truyền để tránh trừ lượt',
  );
  assert.equal(
    createdParams.promoCode,
    undefined,
    'promoCode phải là undefined khi không được áp dụng',
  );
});

test('10. [P1-2] Retry checkout cùng Idempotency-Key và cùng input trả về đơn cũ không tính lại voucher', async () => {
  const validProdId = '01932f01-0001-7000-8000-000000000001';
  let promoValidateCount = 0;
  const existingOrderRecord = {
    id: 'ORD-EXISTING-1',
    orderCode: 'ORD-EXISTING-1',
    buyerId: 'buyer-retry',
    sellerId: 'SELLER-1',
    status: 'PROCESSING',
    totalAmount: 212000,
    shippingFee: 32000,
    discountAmount: 20000,
    items: [],
    shippingAddress: {
      fullName: 'Nguyen Van A',
      phone: '0901234567',
      province: 'Hà Nội',
      district: 'Ba Đình',
      addressLine: '123 Đội Cấn',
    },
    expiresAt: new Date(),
  };
  const existingPaymentRecord = {
    id: 'PAY-EXISTING-1',
    orderId: 'ORD-EXISTING-1',
    paymentMethod: 'COD',
    payosOrderCode: 12345,
    status: 'SUCCESS',
    amount: 212000,
    currency: 'VND',
  };

  // Tính trước requestHash chuẩn của payload đầu vào
  const crypto = await import('node:crypto');
  const expectedInputHash = crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        buyerId: 'buyer-retry',
        lines: [{ productId: validProdId, quantity: 1 }],
        address: {
          fullName: 'Nguyen Van A',
          phone: '0901234567',
          province: 'Hà Nội',
          district: 'Ba Đình',
          ward: undefined,
          addressLine: '123 Đội Cấn',
          country: 'VN',
        },
        quoteId: null,
        paymentMethod: 'COD',
        promoCode: 'WELCOME10',
        shippingOptionId: null,
      }),
    )
    .digest('hex');

  const mockRepo: any = {
    findOrderByIdempotency: async (_buyerId: string, key: string) => {
      if (key === 'IDEMP-RETRY-001') {
        return {
          order: existingOrderRecord,
          payment: existingPaymentRecord,
          requestHash: expectedInputHash,
        };
      }
      return null;
    },
    createOrder: async () => {
      throw new Error('createOrder không được gọi khi retry thành công');
    },
  };

  const mockCatalog: any = {
    findProduct: async (id: string) => ({
      id,
      sellerId: 'SELLER-1',
      title: 'Item 1',
      price: 200000,
      stockQuantity: 10,
      status: 'ACTIVE',
    }),
  };
  const mockShipping: any = { quote: async () => ({ supported: true, fee: 32000 }) };
  const mockGateway: any = { isConfigured: () => false };
  const mockPromoService: any = {
    validatePromotion: async () => {
      promoValidateCount++;
      return { valid: true, discountAmount: 20000 };
    },
  };

  const service = new CheckoutService(
    mockRepo,
    mockCatalog,
    mockShipping,
    mockGateway,
    mockPromoService,
  );

  // Lần gọi retry cùng Idempotency-Key và cùng input
  const res = await service.checkout(
    'buyer-retry',
    {
      items: [{ productId: validProdId, quantity: 1 }],
      shippingAddress: {
        fullName: 'Nguyen Van A',
        phone: '0901234567',
        province: 'Hà Nội',
        district: 'Ba Đình',
        addressLine: '123 Đội Cấn',
      },
      paymentMethod: 'COD',
      promoCode: 'WELCOME10',
    },
    'IDEMP-RETRY-001',
  );

  assert.equal(res.replay, true, 'Phải đánh dấu là đơn replay');
  assert.equal(res.data.orderId, 'ORD-EXISTING-1');
  assert.equal(promoValidateCount, 0, 'Không được gọi validatePromotion lại khi replay đơn');

  // Thử retry với Idempotency-Key cũ nhưng đổi địa chỉ khác -> phải văng 409 IDEMPOTENCY_KEY_REUSED
  await assert.rejects(
    async () => {
      await service.checkout(
        'buyer-retry',
        {
          items: [{ productId: validProdId, quantity: 1 }],
          shippingAddress: {
            fullName: 'Nguyen Van A',
            phone: '0901234567',
            province: 'Hà Nội',
            district: 'Cầu Giấy', // Đổi quận làm đổi hash
            addressLine: '99 Cầu Giấy',
          },
          paymentMethod: 'COD',
          promoCode: 'WELCOME10',
        },
        'IDEMP-RETRY-001',
      );
    },
    (err: any) => {
      assert.equal(err.status, 409);
      assert.equal(err.code, 'IDEMPOTENCY_KEY_REUSED');
      return true;
    },
  );
});

test('11. [P1-3] Ràng buộc quoteId: đổi địa chỉ làm đổi cước hoặc đổi giỏ hàng phải báo lỗi 409', async () => {
  const validProdId = '01932f01-0001-7000-8000-000000000001';
  const quoteData: QuoteRecord = {
    id: 'QUOTE-TEST-001',
    buyerId: 'buyer-quote',
    sellerId: 'SELLER-1',
    items: [
      { productId: validProdId, title: 'Item 1', unitPrice: 200000, quantity: 1, subtotal: 200000 },
    ],
    shippingAddress: {
      fullName: 'Nguyen Van A',
      phone: '0901234567',
      province: 'Hà Nội',
      district: 'Ba Đình',
      addressLine: '123 Đội Cấn',
      country: 'VN',
    },
    subtotal: 200000,
    shippingFee: 32000,
    totalAmount: 232000,
    currency: 'VND',
    expiresAt: new Date(Date.now() + 600000),
    selectedShippingOptionId: 'GHN_STANDARD',
  };

  const mockRepo: any = {
    findQuote: async (id: string) => (id === 'QUOTE-TEST-001' ? quoteData : null),
  };
  const mockCatalog: any = {
    findProduct: async (id: string) => ({
      id,
      sellerId: 'SELLER-1',
      title: 'Item 1',
      price: 200000,
      stockQuantity: 10,
      status: 'ACTIVE',
    }),
  };
  const mockShipping: any = {
    quote: async (addr: ShippingAddress) => {
      // Nếu ở Hà Nội cước 32.000, nếu Cà Mau cước 65.000
      if (addr.province === 'Cà Mau') return { supported: true, fee: 65000 };
      return { supported: true, fee: 32000 };
    },
  };
  const mockGateway: any = { isConfigured: () => false };

  const service = new CheckoutService(mockRepo, mockCatalog, mockShipping, mockGateway);

  // 1. Đổi địa chỉ sang Cà Mau làm cước nhảy từ 32k lên 65k -> phải từ chối 409 QUOTE_PRICE_CHANGED
  await assert.rejects(
    async () => {
      await service.checkout(
        'buyer-quote',
        {
          items: [{ productId: validProdId, quantity: 1 }],
          shippingAddress: {
            fullName: 'Nguyen Van A',
            phone: '0901234567',
            province: 'Cà Mau',
            district: 'Đầm Dơi',
            addressLine: 'Xã Tân Thuận',
          },
          paymentMethod: 'COD',
          quoteId: 'QUOTE-TEST-001',
        },
        undefined,
      );
    },
    (err: any) => {
      assert.equal(err.status, 409);
      assert.equal(err.code, 'QUOTE_PRICE_CHANGED');
      return true;
    },
  );

  // 2. Đổi số lượng trong giỏ hàng (quantity: 2) -> phải từ chối 409 QUOTE_PRICE_CHANGED
  await assert.rejects(
    async () => {
      await service.checkout(
        'buyer-quote',
        {
          items: [{ productId: validProdId, quantity: 2 }],
          shippingAddress: {
            fullName: 'Nguyen Van A',
            phone: '0901234567',
            province: 'Hà Nội',
            district: 'Ba Đình',
            addressLine: '123 Đội Cấn',
          },
          paymentMethod: 'COD',
          quoteId: 'QUOTE-TEST-001',
        },
        undefined,
      );
    },
    (err: any) => {
      assert.equal(err.status, 409);
      assert.equal(err.code, 'QUOTE_PRICE_CHANGED');
      return true;
    },
  );
});

test('12. [P1-4] Báo giá vận chuyển chỉ mở các phương án backend có thể tạo vận đơn (GHN)', () => {
  const service = new CheckoutService({} as any, {} as any, {} as any, {} as any);
  const options = service.buildShippingOptions(32000);

  assert.equal(options.length, 1, 'Chỉ mở 1 phương án duy nhất là GHN');
  assert.equal(options[0].carrier, 'GHN');
  assert.equal(options[0].optionId, 'GHN_STANDARD');
  assert.equal(
    options.some((o) => o.carrier === 'GHTK'),
    false,
    'Tạm ẩn GHTK vì chưa có client tích hợp',
  );
});

test('13. [P1-5] Hủy đơn và hoàn voucher nguyên tử trong cùng transaction, chống hủy lặp', async () => {
  let txExecuted = false;
  let promoUsageDeleted = false;
  let promoCountDecremented = false;
  let orderStatusUpdated = false;

  const mockTx: any = {
    order: {
      findFirst: async () => ({ id: 'ORD-CANCEL-1', status: 'PROCESSING' }),
      updateMany: async () => {
        orderStatusUpdated = true;
      },
    },
    promotionUsage: {
      findMany: async () => [{ id: 'usage-1', promotionId: 'promo-1' }],
      delete: async () => {
        promoUsageDeleted = true;
        return { id: 'usage-1' };
      },
    },
    promotion: {
      update: async () => {
        promoCountDecremented = true;
      },
    },
  };

  const mockPrisma: any = {
    $transaction: async (cb: any) => {
      txExecuted = true;
      return cb(mockTx);
    },
  };

  const repo = new PostgresOrderRepository({} as any, mockPrisma);
  const orderToCancel: any = {
    id: 'ORD-CANCEL-1',
    status: 'CANCELLED',
    timeline: [],
    updatedAt: new Date(),
  };

  // Lần hủy thứ 1: chuyển từ PROCESSING sang CANCELLED
  await repo.update(orderToCancel);
  assert.equal(txExecuted, true, 'Toàn bộ thao tác phải thực thi trong transaction');
  assert.equal(promoUsageDeleted, true, 'Phải xóa bản ghi lượt dùng');
  assert.equal(promoCountDecremented, true, 'Phải giảm usedCount của voucher');
  assert.equal(orderStatusUpdated, true, 'Phải cập nhật status đơn sang CANCELLED');

  // Lần hủy thứ 2 (idempotent retry): đơn trong DB ĐÃ LÀ CANCELLED
  let secondUsageDeleted = false;
  let secondCountDecremented = false;
  mockTx.order.findFirst = async () => ({ id: 'ORD-CANCEL-1', status: 'CANCELLED' });
  mockTx.promotionUsage.delete = async () => {
    secondUsageDeleted = true;
    return { id: 'usage-1' };
  };
  mockTx.promotion.update = async () => {
    secondCountDecremented = true;
  };

  await repo.update(orderToCancel);
  assert.equal(
    secondUsageDeleted,
    false,
    'Không được xóa promotionUsage lần 2 khi đơn đã là CANCELLED',
  );
  assert.equal(
    secondCountDecremented,
    false,
    'Không được giảm usedCount lần 2 khi đơn đã là CANCELLED',
  );
});
