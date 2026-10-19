'use strict';

/**
 * =============================================================================
 * PROJECT NEXUS - EVENT LOG INTEGRATION TEST SUITE (SCRUM-60 & SRS 3.2.1)
 * =============================================================================
 * Xác minh luồng tự động:
 * EventPublisher.publish() -> GlobalEventAuditSubscriber -> EventLogService -> notification_event_log
 * =============================================================================
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// Nạp các contracts và publisher từ @nexus/contracts
const contractsDistDir = path.join(__dirname, '..', 'shared', 'contracts', 'dist');
const {
  InMemoryEventPublisher,
  UserRegisteredDomainEvent,
  AuctionWonDomainEvent,
  OrderCreatedDomainEvent,
} = require(path.join(contractsDistDir, 'index'));

// Nạp Notification Service components
const notificationDistDir = path.join(__dirname, '..', 'backend', 'notification-service', 'dist');
const { EventLog } = require(path.join(notificationDistDir, 'domain', 'entities', 'EventLog'));
const { InMemoryEventLogRepository } = require(
  path.join(notificationDistDir, 'infrastructure', 'repositories', 'InMemoryEventLogRepository'),
);
const { EventLogService } = require(
  path.join(notificationDistDir, 'application', 'services', 'EventLogService'),
);
const { GlobalEventAuditSubscriber } = require(
  path.join(notificationDistDir, 'application', 'listeners', 'GlobalEventAuditSubscriber'),
);

describe('🎯 [SCRUM-60] EventLog Automated Audit & Persistence Suite', () => {
  let eventPublisher;
  let eventLogRepository;
  let eventLogService;
  let auditSubscriber;
  let diagnosticLogs;

  beforeEach(() => {
    diagnosticLogs = [];
    eventPublisher = new InMemoryEventPublisher();
    eventLogRepository = new InMemoryEventLogRepository();
    eventLogService = new EventLogService(eventLogRepository, (msg) => {
      diagnosticLogs.push(msg);
    });
    auditSubscriber = new GlobalEventAuditSubscriber(eventLogService, (msg) => {
      diagnosticLogs.push(msg);
    });

    // Kích hoạt Listener chung tự động bắt mọi event (*)
    auditSubscriber.register(eventPublisher);
  });

  // ---------------------------------------------------------------------------
  // 1. Tự động ghi log khi có event phát sinh (Zero-boilerplate from business module)
  // ---------------------------------------------------------------------------
  it('1. Tự động ghi nhận bản ghi kiểm toán khi bất kỳ DomainEvent nào được publish', async () => {
    // Module nghiệp vụ chỉ cần phát sự kiện bình thường
    const userEvent = new UserRegisteredDomainEvent({
      userId: 'usr_audit_001',
      email: 'user.audit@fpt.edu.vn',
      fullName: 'Le Van Audit',
      role: 'BUYER',
      registeredAt: new Date().toISOString(),
    });

    await eventPublisher.publish(userEvent);

    // Kiểm tra bản ghi trong bảng event_log
    const savedLog = await eventLogRepository.findByEventId(userEvent.eventId);
    assert.ok(savedLog, 'Bản ghi event_log phải được tạo tự động');
    assert.strictEqual(savedLog.eventId, userEvent.eventId);
    assert.strictEqual(savedLog.type, 'user.registered');
    assert.strictEqual(savedLog.sourceService, 'user-service');
    assert.strictEqual(savedLog.status, 'SUCCESS');
    assert.strictEqual(savedLog.payload.email, 'user.audit@fpt.edu.vn');
    assert.strictEqual(savedLog.payload.fullName, 'Le Van Audit');
    assert.ok(savedLog.createdAt instanceof Date);
  });

  // ---------------------------------------------------------------------------
  // 2. Toàn vẹn dữ liệu JSONB và nhiều loại sự kiện liên tiếp
  // ---------------------------------------------------------------------------
  it('2. Lưu trữ chính xác cấu trúc payload JSON của các sự kiện khác nhau', async () => {
    const orderEvent = new OrderCreatedDomainEvent({
      orderId: 'ord_9999',
      buyerId: 'usr_buyer_1',
      totalAmount: 2500000,
      items: [{ productId: 'prod_cam_1', quantity: 1, unitPrice: 2500000 }],
      createdAt: new Date().toISOString(),
    });

    const auctionEvent = new AuctionWonDomainEvent({
      auctionId: 'auc_8888',
      winnerId: 'usr_winner_1',
      sellerId: 'usr_seller_1',
      finalPrice: 8000000,
      wonAt: new Date().toISOString(),
    });

    await eventPublisher.publish(orderEvent);
    await eventPublisher.publish(auctionEvent);

    assert.strictEqual(eventLogRepository.count(), 2);

    const orderLog = await eventLogRepository.findByEventId(orderEvent.eventId);
    assert.strictEqual(orderLog.type, 'order.created');
    assert.strictEqual(orderLog.sourceService, 'commerce-service');
    assert.strictEqual(orderLog.payload.totalAmount, 2500000);

    const auctionLog = await eventLogRepository.findByEventId(auctionEvent.eventId);
    assert.strictEqual(auctionLog.type, 'auction.won');
    assert.strictEqual(auctionLog.sourceService, 'auction-service');
    assert.strictEqual(auctionLog.payload.finalPrice, 8000000);
  });

  // ---------------------------------------------------------------------------
  // 3. Tính Idempotency (Chống ghi trùng khi nhận lại cùng 1 eventId)
  // ---------------------------------------------------------------------------
  it('3. [SCRUM-58 Idempotency] Không tạo bản ghi trùng lặp khi nhận cùng một eventId nhiều lần', async () => {
    const duplicateEvent = new UserRegisteredDomainEvent({
      userId: 'usr_idempotent_test',
      email: 'idem@nexus.local',
      fullName: 'Idempotent User',
      role: 'BUYER',
      registeredAt: new Date().toISOString(),
    });

    // Phát lần 1
    await eventPublisher.publish(duplicateEvent);
    assert.strictEqual(eventLogRepository.count(), 1);

    // Giả lập hệ thống nhắn tin phát lại sự kiện trùng lặp lần 2
    await eventPublisher.publish(duplicateEvent);

    // Số lượng bản ghi vẫn giữ nguyên là 1
    assert.strictEqual(
      eventLogRepository.count(),
      1,
      'Số lượng bản ghi không được tăng khi trùng eventId',
    );
    assert.ok(
      diagnosticLogs.some((l) => l.includes('[Idempotent Ignore]')),
      'Hệ thống phải ghi nhận thông báo bỏ qua trùng lặp',
    );
  });

  // ---------------------------------------------------------------------------
  // 4. Xử lý lỗi theo ADR-002 & SCRUM-59 (Không nuốt lỗi im lặng, cô lập luồng)
  // ---------------------------------------------------------------------------
  it('4. [SCRUM-59 Error Handling] Không nuốt lỗi im lặng và không làm sập luồng publisher khi DB lỗi', async () => {
    // Giả lập Repository bị lỗi kết nối cơ sở dữ liệu
    const faultyRepository = {
      save: async () => {
        throw new Error('PostgreSQL connection timeout: connection terminated unexpectedly');
      },
      findByEventId: async () => null,
      findRecent: async () => [],
      findByType: async () => [],
    };

    const faultyService = new EventLogService(faultyRepository, (msg) => {
      diagnosticLogs.push(msg);
    });

    const faultySubscriber = new GlobalEventAuditSubscriber(faultyService, (msg) => {
      diagnosticLogs.push(msg);
    });

    const isolatedPublisher = new InMemoryEventPublisher();
    faultySubscriber.register(isolatedPublisher);

    const testEvent = new UserRegisteredDomainEvent({
      userId: 'usr_err_test',
      email: 'err@nexus.local',
      fullName: 'Error Test',
      role: 'BUYER',
      registeredAt: new Date().toISOString(),
    });

    // Phát sự kiện không bị crash tiến trình
    await isolatedPublisher.publish(testEvent);

    // Xác nhận lỗi được ghi nhận đầy đủ vào diagnostic logs (No silent error)
    assert.ok(
      diagnosticLogs.some(
        (l) =>
          l.includes('[Lỗi ghi Audit Log tự động]') && l.includes('PostgreSQL connection timeout'),
      ),
      'Lỗi lưu log bắt buộc phải được xuất ra log chẩn đoán theo ADR-002',
    );
  });

  // ---------------------------------------------------------------------------
  // 5. Tính độc lập của test (Self-contained & cleanup)
  // ---------------------------------------------------------------------------
  it('5. Hỗ trợ dọn dẹp sạch sẽ sau test và hủy đăng ký (unsubscribe)', async () => {
    auditSubscriber.unregister();

    const ignoredEvent = new UserRegisteredDomainEvent({
      userId: 'usr_unregistered',
      email: 'unreg@nexus.local',
      fullName: 'Unregistered Test',
      role: 'BUYER',
      registeredAt: new Date().toISOString(),
    });

    await eventPublisher.publish(ignoredEvent);

    // Không được ghi nhận vì listener đã unregister
    const notFound = await eventLogRepository.findByEventId(ignoredEvent.eventId);
    assert.strictEqual(notFound, null, 'Sự kiện không được ghi sau khi đã unregister');

    eventLogRepository.clear();
    assert.strictEqual(eventLogRepository.count(), 0);
  });
});
