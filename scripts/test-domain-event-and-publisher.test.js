'use strict';

/**
 * =============================================================================
 * PROJECT NEXUS - DOMAIN EVENT & EVENT PUBLISHER TEST SUITE (SCRUM-35, 36, 37)
 * =============================================================================
 * Xác minh tính hợp lệ, bất biến và hoạt động của DomainEvent Base Class,
 * IEventPublisher interface, InMemoryEventPublisher và SRS 2.8 Event Contracts.
 * =============================================================================
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// Đường dẫn tới dist của shared/contracts
const contractsDistDir = path.join(__dirname, '..', 'shared', 'contracts', 'dist');

const {
  DomainEvent,
  EventPublishingError,
  InMemoryEventPublisher,
  UserRegisteredDomainEvent,
  UserLockedDomainEvent,
  ProductCreatedDomainEvent,
  ProductStatusChangedDomainEvent,
  OrderCreatedDomainEvent,
  OrderPaidDomainEvent,
  BidPlacedDomainEvent,
  AuctionWonDomainEvent,
  ShipmentCreatedDomainEvent,
  NotificationDispatchedDomainEvent,
} = require(path.join(contractsDistDir, 'index'));

describe('🎯 [SCRUM-35] DomainEvent Base Type & Immutability Suite', () => {
  it('tự động sinh eventId dạng UUID v4 và occurredAt định dạng ISO-8601 khi không truyền vào', () => {
    class TestEvent extends DomainEvent {
      constructor(payload) {
        super({
          type: 'test.message.created',
          sourceService: 'test-service',
          payload,
        });
      }
    }

    const event = new TestEvent({ message: 'Hello Nexus' });

    assert.ok(event.eventId, 'eventId phải tồn tại');
    assert.match(
      event.eventId,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      'eventId phải là chuỗi UUID v4 chuẩn',
    );
    assert.strictEqual(event.type, 'test.message.created');
    assert.strictEqual(event.sourceService, 'test-service');
    assert.strictEqual(event.version, 1);
    assert.ok(Date.parse(event.occurredAt), 'occurredAt phải là chuỗi ISO-8601 hợp lệ');
    assert.deepStrictEqual(event.payload, { message: 'Hello Nexus' });
  });

  it('bảo toàn tính bất biến (Immutability): ném lỗi khi cố ý thay đổi thuộc tính của Event', () => {
    const event = new UserRegisteredDomainEvent({
      userId: 'usr_001',
      email: 'test@nexus.local',
      fullName: 'Test User',
      role: 'BUYER',
      registeredAt: new Date().toISOString(),
    });

    assert.throws(
      () => {
        // @ts-ignore
        event.type = 'hacked.type';
      },
      TypeError,
      'Không được phép sửa thuộc tính của Event sau khi khởi tạo',
    );

    assert.throws(
      () => {
        // @ts-ignore
        event.payload.email = 'hacked@nexus.local';
      },
      TypeError,
      'Không được phép sửa dữ liệu bên trong payload',
    );
  });

  it('ném lỗi rõ ràng khi khởi tạo event thiếu type hoặc sourceService', () => {
    assert.throws(() => {
      // @ts-ignore
      new DomainEvent({ type: '', sourceService: 'user-service', payload: {} });
    }, /type.*bắt buộc/);

    assert.throws(() => {
      // @ts-ignore
      new DomainEvent({ type: 'user.test', sourceService: '', payload: {} });
    }, /sourceService.*bắt buộc/);
  });

  it('phương thức toJSON() và toString() định dạng dữ liệu chính xác', () => {
    const event = new ProductCreatedDomainEvent({
      productId: 'prod_123',
      sellerId: 'sel_999',
      title: 'Sony Alpha A7 IV',
      price: 2500,
      stockQuantity: 10,
      createdAt: '2026-10-19T00:00:00.000Z',
    });

    const json = event.toJSON();
    assert.strictEqual(json.type, 'catalog.product.created');
    assert.strictEqual(json.sourceService, 'catalog-service');
    assert.strictEqual(json.payload.title, 'Sony Alpha A7 IV');

    const str = event.toString();
    assert.match(str, /catalog\.product\.created/);
    assert.match(str, /catalog-service/);
  });
});

describe('🎯 [SCRUM-36] EventPublisher Port & InMemory Adapter Suite', () => {
  let publisher;

  beforeEach(() => {
    publisher = new InMemoryEventPublisher();
  });

  it('phát tán sự kiện thành công và lưu vào danh sách getPublishedEvents()', async () => {
    const event = new OrderCreatedDomainEvent({
      orderId: 'ord_888',
      buyerId: 'usr_777',
      totalAmount: 1500,
      items: [{ productId: 'prod_123', quantity: 1, unitPrice: 1500 }],
      createdAt: new Date().toISOString(),
    });

    await publisher.publish(event);

    const published = publisher.getPublishedEvents();
    assert.strictEqual(published.length, 1);
    assert.strictEqual(published[0].eventId, event.eventId);
    assert.strictEqual(publisher.getLastEvent().eventId, event.eventId);
  });

  it('phát tán hàng loạt (publishAll) nhiều sự kiện chính xác thứ tự', async () => {
    const event1 = new BidPlacedDomainEvent({
      auctionId: 'auc_101',
      bidderId: 'usr_1',
      bidAmount: 100,
      placedAt: new Date().toISOString(),
    });
    const event2 = new BidPlacedDomainEvent({
      auctionId: 'auc_101',
      bidderId: 'usr_2',
      bidAmount: 120,
      placedAt: new Date().toISOString(),
    });

    await publisher.publishAll([event1, event2]);

    assert.strictEqual(publisher.getPublishedEvents().length, 2);
    assert.strictEqual(publisher.getEventsByType('auction.bid.placed').length, 2);
  });

  it('kích hoạt subscriber đã đăng ký chính xác theo event type và hỗ trợ unsubscribe', async () => {
    const received = [];
    const unsubscribe = publisher.subscribe('user.locked', (event) => {
      received.push(event);
    });

    const lockedEvent = new UserLockedDomainEvent({
      userId: 'usr_bad',
      email: 'bad@nexus.local',
      reason: 'Too many failed password attempts',
      failedAttempts: 5,
      lockedAt: new Date().toISOString(),
    });

    await publisher.publish(lockedEvent);
    assert.strictEqual(received.length, 1);
    assert.strictEqual(received[0].payload.userId, 'usr_bad');

    // Hủy đăng ký và phát lại
    unsubscribe();
    await publisher.publish(lockedEvent);
    assert.strictEqual(received.length, 1, 'Sau khi unsubscribe không được nhận thêm sự kiện');
  });

  it('kích hoạt wildcard subscriber (*) cho mọi loại sự kiện', async () => {
    const allEvents = [];
    publisher.subscribe('*', (event) => {
      allEvents.push(event.type);
    });

    await publisher.publish(
      new ShipmentCreatedDomainEvent({
        shipmentId: 'ship_01',
        orderId: 'ord_01',
        carrier: 'VNPost',
        trackingNumber: 'VN123456789',
        shippingAddress: '123 Le Loi, Q1, HCM',
        createdAt: new Date().toISOString(),
      }),
    );

    await publisher.publish(
      new NotificationDispatchedDomainEvent({
        notificationId: 'notif_01',
        recipientId: 'usr_01',
        channel: 'EMAIL',
        template: 'SHIPMENT_UPDATE',
        dispatchedAt: new Date().toISOString(),
      }),
    );

    assert.deepStrictEqual(allEvents, ['shipment.created', 'notification.dispatched']);
  });

  it('bọc lỗi bằng EventPublishingError khi subscriber ném lỗi', async () => {
    publisher.subscribe('auction.won', () => {
      throw new Error('Database connection failed in consumer');
    });

    const event = new AuctionWonDomainEvent({
      auctionId: 'auc_55',
      winnerId: 'usr_winner',
      sellerId: 'usr_seller',
      finalPrice: 5000,
      wonAt: new Date().toISOString(),
    });

    await assert.rejects(
      async () => {
        await publisher.publish(event);
      },
      (err) => {
        assert.ok(err instanceof EventPublishingError);
        assert.strictEqual(err.eventType, 'auction.won');
        assert.strictEqual(err.eventId, event.eventId);
        assert.match(err.message, /Database connection failed/);
        return true;
      },
    );
  });

  it('hàm clear() dọn dẹp sạch toàn bộ sự kiện và subscriber', async () => {
    publisher.subscribe('order.paid', () => {});
    await publisher.publish(
      new OrderPaidDomainEvent({
        orderId: 'ord_99',
        buyerId: 'usr_1',
        paymentId: 'pay_1',
        amountPaid: 100,
        paymentMethod: 'STRIPE',
        paidAt: new Date().toISOString(),
      }),
    );

    assert.strictEqual(publisher.getPublishedEvents().length, 1);
    publisher.clear();
    assert.strictEqual(publisher.getPublishedEvents().length, 0);
  });
});

describe('🎯 [SCRUM-37] SRS 2.8 Event Catalog Compliance Suite', () => {
  it('xác nhận các Domain Event chuẩn thuộc SRS 2.8 có routing key và sourceService chính xác', () => {
    const testCases = [
      {
        instance: new UserRegisteredDomainEvent({
          userId: 'u1',
          email: 'u1@nexus.local',
          fullName: 'User 1',
          role: 'BUYER',
          registeredAt: '2026-10-19T00:00:00.000Z',
        }),
        expectedType: 'user.registered',
        expectedService: 'user-service',
      },
      {
        instance: new ProductStatusChangedDomainEvent({
          productId: 'p1',
          oldStatus: 'DRAFT',
          newStatus: 'ACTIVE',
          changedBy: 'admin',
          changedAt: '2026-10-19T00:00:00.000Z',
        }),
        expectedType: 'catalog.product.status_changed',
        expectedService: 'catalog-service',
      },
      {
        instance: new OrderPaidDomainEvent({
          orderId: 'o1',
          buyerId: 'b1',
          paymentId: 'pay1',
          amountPaid: 500,
          paymentMethod: 'VNPAY',
          paidAt: '2026-10-19T00:00:00.000Z',
        }),
        expectedType: 'order.paid',
        expectedService: 'commerce-service',
      },
      {
        instance: new BidPlacedDomainEvent({
          auctionId: 'a1',
          bidderId: 'b1',
          bidAmount: 1000,
          placedAt: '2026-10-19T00:00:00.000Z',
        }),
        expectedType: 'auction.bid.placed',
        expectedService: 'auction-service',
      },
      {
        instance: new ShipmentCreatedDomainEvent({
          shipmentId: 's1',
          orderId: 'o1',
          carrier: 'GHTK',
          trackingNumber: 'GHTK999',
          shippingAddress: 'HCM',
          createdAt: '2026-10-19T00:00:00.000Z',
        }),
        expectedType: 'shipment.created',
        expectedService: 'fulfillment-service',
      },
      {
        instance: new NotificationDispatchedDomainEvent({
          notificationId: 'n1',
          recipientId: 'u1',
          channel: 'EMAIL',
          template: 'WELCOME',
          dispatchedAt: '2026-10-19T00:00:00.000Z',
        }),
        expectedType: 'notification.dispatched',
        expectedService: 'notification-service',
      },
    ];

    for (const tc of testCases) {
      assert.strictEqual(
        tc.instance.type,
        tc.expectedType,
        `Event ${tc.instance.constructor.name} phải có type là ${tc.expectedType}`,
      );
      assert.strictEqual(
        tc.instance.sourceService,
        tc.expectedService,
        `Event ${tc.instance.constructor.name} phải có sourceService là ${tc.expectedService}`,
      );
    }
  });
});
