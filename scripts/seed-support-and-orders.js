/**
 * Project Nexus - Seed Support Cases, Shipments & Commerce Orders into PostgreSQL
 * Đảm bảo dữ liệu thật tồn tại trong cả 2 database:
 * - nexus_commerce_db (Port 5434)
 * - nexus_fulfillment_db (Port 5436)
 */

const { Pool } = require('pg');

const commercePool = new Pool({
  host: process.env.COMMERCE_DB_HOST || 'localhost',
  port: Number(process.env.COMMERCE_DB_PORT) || 5434,
  user: process.env.COMMERCE_DB_USER || 'nexus_commerce',
  password: process.env.COMMERCE_DB_PASSWORD || 'nexus_password',
  database: process.env.COMMERCE_DB_NAME || 'nexus_commerce_db',
});

const fulfillmentPool = new Pool({
  host: process.env.FULFILLMENT_DB_HOST || 'localhost',
  port: Number(process.env.FULFILLMENT_DB_PORT) || 5436,
  user: process.env.FULFILLMENT_DB_USER || 'nexus_fulfillment',
  password: process.env.FULFILLMENT_DB_PASSWORD || 'nexus_password',
  database: process.env.FULFILLMENT_DB_NAME || 'nexus_fulfillment_db',
});

async function seedCommerce() {
  console.log('🔄 [Commerce DB] Đang kiểm tra và nạp đơn hàng mẫu vào nexus_commerce_db...');
  const now = new Date();

  const orders = [
    {
      orderCode: 'NX-ORD-8021',
      buyerId: 'usr_01hqz789abc',
      buyerName: 'Minh Anh',
      buyerEmail: 'minhanh@example.com',
      sellerId: 'usr_seller_001',
      sellerName: 'Nexus Audio',
      totalAmount: 1290000,
      status: 'PROCESSING',
      trackingCode: 'GHN8829103VN',
      createdAt: new Date(now.getTime() - 86400000 * 5),
      updatedAt: new Date(now.getTime() - 86400000 * 5),
      items: [
        {
          productId: 'prod_nexus_air',
          productTitle: 'Tai nghe không dây Nexus Air',
          quantity: 1,
          unitPrice: 1290000,
          subtotal: 1290000,
        },
      ],
      timeline: [
        {
          status: 'CREATED',
          title: 'Đơn hàng được tạo',
          timestamp: new Date(now.getTime() - 86400000 * 5),
        },
        {
          status: 'PAID',
          title: 'Đã xác nhận thanh toán',
          timestamp: new Date(now.getTime() - 86400000 * 5 + 120000),
        },
        {
          status: 'PROCESSING',
          title: 'Chờ người bán xử lý',
          timestamp: new Date(now.getTime() - 86400000 * 4),
        },
      ],
    },
    {
      orderCode: 'NX-ORD-8017',
      buyerId: 'usr_01hqz789def',
      buyerName: 'Quốc Bảo',
      buyerEmail: 'quocbao@example.com',
      sellerId: 'usr_seller_002',
      sellerName: 'Retro Lab',
      totalAmount: 2450000,
      status: 'SHIPPED',
      trackingCode: 'GHTK5908112',
      createdAt: new Date(now.getTime() - 86400000 * 6),
      updatedAt: new Date(now.getTime() - 86400000 * 5),
      items: [
        {
          productId: 'prod_retro_35',
          productTitle: 'Máy ảnh film Retro 35',
          quantity: 1,
          unitPrice: 2450000,
          subtotal: 2450000,
        },
      ],
      timeline: [
        {
          status: 'CREATED',
          title: 'Đơn hàng được tạo',
          timestamp: new Date(now.getTime() - 86400000 * 6),
        },
        {
          status: 'PAID',
          title: 'Đã xác nhận thanh toán',
          timestamp: new Date(now.getTime() - 86400000 * 6 + 180000),
        },
        {
          status: 'SHIPPED',
          title: 'Đã bàn giao vận chuyển cho GHTK',
          timestamp: new Date(now.getTime() - 86400000 * 5),
        },
      ],
    },
    {
      orderCode: 'NX-ORD-8009',
      buyerId: 'usr_01hqz789ghi',
      buyerName: 'Thu Hà',
      buyerEmail: 'thuha@example.com',
      sellerId: 'usr_seller_003',
      sellerName: 'Nexus Sport',
      totalAmount: 890000,
      status: 'DELIVERED',
      trackingCode: 'VTP22100831',
      createdAt: new Date(now.getTime() - 86400000 * 7),
      updatedAt: new Date(now.getTime() - 86400000 * 6),
      items: [
        {
          productId: 'prod_sport_s2',
          productTitle: 'Đồng hồ thể thao S2',
          quantity: 1,
          unitPrice: 890000,
          subtotal: 890000,
        },
      ],
      timeline: [
        {
          status: 'CREATED',
          title: 'Đơn hàng được tạo',
          timestamp: new Date(now.getTime() - 86400000 * 7),
        },
        {
          status: 'PAID',
          title: 'Đã xác nhận thanh toán',
          timestamp: new Date(now.getTime() - 86400000 * 7 + 60000),
        },
        {
          status: 'DELIVERED',
          title: 'Giao hàng hoàn tất thành công',
          timestamp: new Date(now.getTime() - 86400000 * 6),
        },
      ],
    },
    {
      orderCode: 'NX-ORD-7998',
      buyerId: 'usr_01hqz789jkl',
      buyerName: 'Gia Huy',
      buyerEmail: 'giahuy@example.com',
      sellerId: 'usr_seller_004',
      sellerName: 'Home & Co.',
      totalAmount: 480000,
      status: 'CANCELLED',
      trackingCode: '—',
      createdAt: new Date(now.getTime() - 86400000 * 8),
      updatedAt: new Date(now.getTime() - 86400000 * 7),
      items: [
        {
          productId: 'prod_lamp_nordic',
          productTitle: 'Đèn bàn tối giản',
          quantity: 1,
          unitPrice: 480000,
          subtotal: 480000,
        },
      ],
      timeline: [
        {
          status: 'CREATED',
          title: 'Đơn hàng được tạo',
          timestamp: new Date(now.getTime() - 86400000 * 8),
        },
        {
          status: 'CANCELLED',
          title: 'Đã hủy đơn hàng theo yêu cầu khách hàng',
          timestamp: new Date(now.getTime() - 86400000 * 7),
        },
      ],
    },
    {
      orderCode: 'ord_01hqz555abc',
      buyerId: 'usr_01hqz789abc',
      buyerName: 'Nguyen Van Buyer',
      buyerEmail: 'buyer.test@nexus-ecommerce.com',
      sellerId: 'usr_01hqz333sel',
      sellerName: 'Nexus Official Store',
      totalAmount: 399.99,
      status: 'PAID',
      trackingCode: 'GHN112233VN',
      createdAt: now,
      updatedAt: now,
      items: [
        {
          productId: 'prod_01hqz999xyz',
          productTitle: 'Nexus Pro Audio Wireless',
          quantity: 1,
          unitPrice: 399.99,
          subtotal: 399.99,
        },
      ],
      timeline: [
        { status: 'CREATED', title: 'Đơn hàng được tạo', timestamp: now },
        { status: 'PAID', title: 'Đã xác nhận thanh toán PayOS', timestamp: now },
      ],
    },
  ];

  for (const o of orders) {
    const upsertSql = `
      INSERT INTO commerce_orders (
        order_code, buyer_id, buyer_name, buyer_email, seller_id, seller_name,
        total_amount, shipping_fee, status, shipping_address, tracking_code,
        timeline, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      ON CONFLICT (order_code) DO UPDATE SET
        buyer_name = EXCLUDED.buyer_name,
        buyer_email = EXCLUDED.buyer_email,
        seller_name = EXCLUDED.seller_name,
        total_amount = EXCLUDED.total_amount,
        status = EXCLUDED.status,
        tracking_code = EXCLUDED.tracking_code,
        timeline = EXCLUDED.timeline,
        updated_at = EXCLUDED.updated_at
      RETURNING id
    `;

    const res = await commercePool.query(upsertSql, [
      o.orderCode,
      o.buyerId,
      o.buyerName,
      o.buyerEmail,
      o.sellerId,
      o.sellerName,
      o.totalAmount,
      0,
      o.status,
      JSON.stringify({ name: o.buyerName, email: o.buyerEmail }),
      o.trackingCode,
      JSON.stringify(o.timeline),
      o.createdAt,
      o.updatedAt,
    ]);

    const orderId = res.rows[0].id;
    await commercePool.query('DELETE FROM commerce_order_items WHERE order_id = $1', [orderId]);

    for (const item of o.items) {
      await commercePool.query(
        `INSERT INTO commerce_order_items (order_id, product_id, product_title, unit_price, quantity, subtotal)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [orderId, item.productId, item.productTitle, item.unitPrice, item.quantity, item.subtotal],
      );
    }
  }

  const countRes = await commercePool.query('SELECT COUNT(*) FROM commerce_orders');
  console.log(
    `✅ [Commerce DB] Hoàn tất nạp đơn hàng. Tổng số đơn trong DB: ${countRes.rows[0].count}`,
  );
}

async function seedFulfillment() {
  console.log(
    '🔄 [Fulfillment DB] Đang kiểm tra và nạp Support Cases & Shipments vào nexus_fulfillment_db...',
  );
  const now = Date.now();

  // 1. Support cases
  const cases = [
    {
      id: 'CS-4021',
      type: 'Yêu cầu hoàn tiền',
      orderId: 'ord_01hqz555abc',
      orderCode: 'NX-ORD-8021',
      userId: 'usr_01hqz789abc',
      customer: 'Minh Anh',
      reason: 'Sản phẩm chưa đúng mô tả',
      priority: 'Cao',
      status: 'PENDING',
      createdAt: new Date(now - 12 * 60 * 1000),
      updatedAt: new Date(now - 12 * 60 * 1000),
    },
    {
      id: 'CS-4018',
      type: 'Khiếu nại giao hàng',
      orderId: 'ord_01hqz888def',
      orderCode: 'NX-ORD-8017',
      userId: 'usr_buyer_02',
      customer: 'Quốc Bảo',
      reason: 'Đơn hàng giao chậm',
      priority: 'Trung bình',
      status: 'PENDING',
      createdAt: new Date(now - 46 * 60 * 1000),
      updatedAt: new Date(now - 46 * 60 * 1000),
    },
    {
      id: 'CS-4012',
      type: 'Tranh chấp giao dịch',
      orderId: 'ord_01hqz999ghi',
      orderCode: 'NX-ORD-8009',
      userId: 'usr_buyer_03',
      customer: 'Thu Hà',
      reason: 'Cần xác nhận trạng thái đơn',
      priority: 'Thấp',
      status: 'PENDING',
      createdAt: new Date(now - 2 * 60 * 60 * 1000),
      updatedAt: new Date(now - 2 * 60 * 60 * 1000),
    },
  ];

  for (const c of cases) {
    await fulfillmentPool.query(
      `INSERT INTO fulfillment_support_cases (
        id, type, order_id, order_code, user_id, customer, reason,
        priority, status, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (id) DO UPDATE SET
        customer = EXCLUDED.customer,
        reason = EXCLUDED.reason,
        priority = EXCLUDED.priority,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at`,
      [
        c.id,
        c.type,
        c.orderId,
        c.orderCode,
        c.userId,
        c.customer,
        c.reason,
        c.priority,
        c.status,
        c.createdAt,
        c.updatedAt,
      ],
    );
  }

  // 2. Shipments
  const shipments = [
    {
      id: 'shp_01hqz222trk',
      orderId: 'NX-ORD-8021',
      carrier: 'GHN',
      trackingCode: 'GHN8829103VN',
      status: 'PICKED',
      shippingAddress: '12 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
      recipientName: 'Minh Anh',
      recipientPhone: '0901234567',
      city: 'TP. Hồ Chí Minh',
      currentLocation: 'TP. Hồ Chí Minh · Trung tâm phân loại Tân Bình',
      createdAt: new Date('2026-10-18T09:12:00.000Z'),
      updatedAt: new Date('2026-10-18T14:30:00.000Z'),
    },
    {
      id: 'shp_02ghtk5908112',
      orderId: 'NX-ORD-8017',
      carrier: 'GHTK',
      trackingCode: 'GHTK5908112',
      status: 'IN_TRANSIT',
      shippingAddress: '45 Tràng Tiền, Hoàn Kiếm, Hà Nội',
      recipientName: 'Quốc Bảo',
      recipientPhone: '0912345678',
      city: 'Hà Nội',
      currentLocation: 'Hà Nội · Bưu cục Cầu Giấy',
      createdAt: new Date('2026-10-17T10:00:00.000Z'),
      updatedAt: new Date('2026-10-18T11:05:00.000Z'),
    },
    {
      id: 'shp_03vtp22100831',
      orderId: 'NX-ORD-8009',
      carrier: 'VIETTEL_POST',
      trackingCode: 'VTP22100831',
      status: 'DELIVERED',
      shippingAddress: '78 Bạch Đằng, Hải Châu, Đà Nẵng',
      recipientName: 'Thu Hà',
      recipientPhone: '0923456789',
      city: 'Đà Nẵng',
      currentLocation: 'Đà Nẵng · Đã giao thành công cho khách hàng',
      createdAt: new Date('2026-10-16T08:30:00.000Z'),
      updatedAt: new Date('2026-10-17T16:40:00.000Z'),
    },
  ];

  for (const s of shipments) {
    await fulfillmentPool.query(
      `INSERT INTO fulfillment_shipments (
        id, order_id, warehouse_id, carrier_code, tracking_code, shipping_fee,
        status, receiver_name, receiver_phone, shipping_address, city,
        current_location, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      ON CONFLICT (id) DO UPDATE SET
        carrier_code = EXCLUDED.carrier_code,
        tracking_code = EXCLUDED.tracking_code,
        status = EXCLUDED.status,
        city = EXCLUDED.city,
        current_location = EXCLUDED.current_location,
        updated_at = EXCLUDED.updated_at`,
      [
        s.id,
        s.orderId,
        1,
        s.carrier,
        s.trackingCode,
        0,
        s.status,
        s.recipientName,
        s.recipientPhone,
        s.shippingAddress,
        s.city,
        s.currentLocation,
        s.createdAt,
        s.updatedAt,
      ],
    );
  }

  const caseCount = await fulfillmentPool.query('SELECT COUNT(*) FROM fulfillment_support_cases');
  const shipCount = await fulfillmentPool.query('SELECT COUNT(*) FROM fulfillment_shipments');
  console.log(
    `✅ [Fulfillment DB] Hoàn tất nạp dữ liệu. Support cases: ${caseCount.rows[0].count}, Shipments: ${shipCount.rows[0].count}`,
  );
}

async function main() {
  try {
    await seedCommerce();
    await seedFulfillment();
    console.log('\n🎉 ĐÃ NẠP TOÀN BỘ DỮ LIỆU THẬT VÀO POSTGRES THÀNH CÔNG!');
  } catch (err) {
    console.error('❌ Lỗi nạp dữ liệu:', err);
  } finally {
    await commercePool.end();
    await fulfillmentPool.end();
  }
}

main();
