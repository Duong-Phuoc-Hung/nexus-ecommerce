'use strict';

/**
 * =============================================================================
 * PROJECT NEXUS - INTER-MODULE EVENT FLOW DEMO & TEST (SCRUM-45)
 * =============================================================================
 * Chứng minh luồng phát tán và đón nhận sự kiện liên Bounded Context
 * (End-to-End Inter-Service Event-Driven Architecture) theo SRS 2.8.
 * =============================================================================
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const contractsDistDir = path.join(__dirname, '..', 'shared', 'contracts', 'dist');

const {
  InMemoryEventPublisher,
  UserRegisteredDomainEvent,
  AuctionWonDomainEvent,
  ShipmentStatusUpdatedDomainEvent,
} = require(path.join(contractsDistDir, 'index'));

describe('🎯 [SCRUM-45] Inter-Module Event Flow Verification Suite', () => {
  let eventPublisher;

  beforeEach(() => {
    eventPublisher = new InMemoryEventPublisher();
  });

  // ---------------------------------------------------------------------------
  // KỊCH BẢN 1: USER-SERVICE -> NOTIFICATION-SERVICE (User Registration Flow)
  // ---------------------------------------------------------------------------
  it('Kịch bản 1: User Service phát "user.registered" -> Notification Service nhận và chuẩn bị gửi email kích hoạt', async () => {
    const notificationInbox = [];

    // Giả lập Consumer phía Notification Service đăng ký lắng nghe sự kiện
    eventPublisher.subscribe('user.registered', async (event) => {
      // Notification Service xử lý sự kiện hoàn toàn dựa vào contract payload
      const { userId, email, fullName, role } = event.payload;

      notificationInbox.push({
        receivedEventId: event.eventId,
        recipient: email,
        template: 'ACCOUNT_ACTIVATION_EMAIL',
        body: `Xin chào ${fullName}, chào mừng bạn đến với Nexus (${role})!`,
        sourceService: event.sourceService,
        timestamp: event.occurredAt,
      });
    });

    // Giả lập Producer phía User Service phát tán Domain Event
    const userEvent = new UserRegisteredDomainEvent({
      userId: 'usr_01hqz_demo',
      email: 'buyer.nexus@fpt.edu.vn',
      fullName: 'Nguyen Kieu Khanh Nguyen',
      role: 'BUYER',
      registeredAt: new Date().toISOString(),
    });

    await eventPublisher.publish(userEvent);

    // Xác minh kết quả truyền tin
    assert.strictEqual(notificationInbox.length, 1);
    const received = notificationInbox[0];
    assert.strictEqual(received.receivedEventId, userEvent.eventId);
    assert.strictEqual(received.recipient, 'buyer.nexus@fpt.edu.vn');
    assert.strictEqual(received.sourceService, 'user-service');
    assert.match(received.body, /Nguyen Kieu Khanh Nguyen/);
  });

  // ---------------------------------------------------------------------------
  // KỊCH BẢN 2: AUCTION-SERVICE -> COMMERCE-SERVICE (Auction Won to Order Flow)
  // ---------------------------------------------------------------------------
  it('Kịch bản 2: Auction Service phát "auction.won" -> Commerce Service nhận và tự động tạo đơn hàng trúng đấu giá', async () => {
    const generatedOrders = [];

    // Giả lập Consumer phía Commerce Service lắng nghe khi có người thắng đấu giá
    eventPublisher.subscribe('auction.won', async (event) => {
      const { auctionId, winnerId, sellerId, finalPrice } = event.payload;

      generatedOrders.push({
        orderId: `ord_auc_${auctionId}`,
        buyerId: winnerId,
        sellerId: sellerId,
        totalAmount: finalPrice,
        status: 'PENDING_PAYMENT',
        originAuctionId: auctionId,
        originEventId: event.eventId,
      });
    });

    // Giả lập Auction Engine chốt phiên đấu giá
    const auctionWonEvent = new AuctionWonDomainEvent({
      auctionId: 'auc_camera_vintage_99',
      winnerId: 'usr_winner_777',
      sellerId: 'usr_seller_888',
      finalPrice: 15000000, // 15 triệu VND
      wonAt: new Date().toISOString(),
    });

    await eventPublisher.publish(auctionWonEvent);

    assert.strictEqual(generatedOrders.length, 1);
    const order = generatedOrders[0];
    assert.strictEqual(order.orderId, 'ord_auc_auc_camera_vintage_99');
    assert.strictEqual(order.totalAmount, 15000000);
    assert.strictEqual(order.buyerId, 'usr_winner_777');
    assert.strictEqual(order.originEventId, auctionWonEvent.eventId);
  });

  // ---------------------------------------------------------------------------
  // KỊCH BẢN 3: FULFILLMENT-SERVICE -> NOTIFICATION & COMMERCE (Fan-out Delivery Update)
  // ---------------------------------------------------------------------------
  it('Kịch bản 3: Fulfillment phát "shipment.status_updated" -> nhiều consumer nhận đồng thời (Fan-out)', async () => {
    let commerceUpdated = false;
    let customerNotified = false;

    // Consumer 1: Commerce Service cập nhật trạng thái giao hàng của đơn
    eventPublisher.subscribe('shipment.status_updated', async (event) => {
      if (event.payload.newStatus === 'DELIVERED') {
        commerceUpdated = true;
      }
    });

    // Consumer 2: Notification Service gửi thông báo SMS/Push cho khách hàng
    eventPublisher.subscribe('shipment.status_updated', async (event) => {
      if (event.payload.newStatus === 'DELIVERED') {
        customerNotified = true;
      }
    });

    const shipmentEvent = new ShipmentStatusUpdatedDomainEvent({
      shipmentId: 'shp_vnpost_4455',
      orderId: 'ord_998877',
      oldStatus: 'IN_TRANSIT',
      newStatus: 'DELIVERED',
      currentLocation: 'Kho FPT Quận 9, TP.HCM',
      updatedAt: new Date().toISOString(),
    });

    await eventPublisher.publish(shipmentEvent);

    assert.ok(commerceUpdated, 'Commerce Service phải nhận được sự kiện giao hàng thành công');
    assert.ok(customerNotified, 'Notification Service phải gửi tin nhắn báo giao hàng');
  });
});
