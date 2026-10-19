# Shared Packages Architecture & Specification (SHARED)

> **Tài liệu tham chiếu:** SRS Project Nexus v1.0 (Section 2.7 - Privileges List, Section 2.8 - Event Message Table, Section 4.2 - API & Contract Management, Section 5.3 & 5.5)  
> **Mục đích:** Đóng gói toàn bộ các định nghĩa kiểu dữ liệu (Types), Hợp đồng sự kiện (Event Contracts), Hằng số phân quyền (Privileges/Roles) và Tiện ích dùng chung để chia sẻ an toàn kiểu dữ liệu (Type-safety) giữa Frontend và Backend.

---

## 1. Cây Thư Mục Chi Tiết Của `shared/`

```text
shared/
├── contracts/                               # HỢP ĐỒNG DỮ LIỆU & SỰ KIỆN (SRS 2.7 & 2.8)
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── events/                          # Toàn bộ danh sách 45+ sự kiện từ bảng SRS 2.8
│       │   ├── user.events.ts               # UserRegistered, UserUpdated, UserDeleted, UserPasswordChanged...
│       │   ├── catalog.events.ts            # ProductCreated, ProductUpdated, ProductStatusChanged, CategoryCreated...
│       │   ├── cart.events.ts               # CartCreated, CartItemAdded, CartItemUpdated, CartExpired...
│       │   ├── order.events.ts              # OrderCreated, OrderCancelled, OrderPaid, OrderRefunded...
│       │   ├── auction.events.ts            # AuctionCreated, AuctionStarted, BidPlaced, Outbid, AuctionWon...
│       │   ├── inventory.events.ts          # InventoryReserved, InventoryReleased, InventoryCommitted...
│       │   ├── shipping.events.ts           # ShippingQuoteRequested, ShipmentCreated, ShipmentInTransit...
│       │   ├── reputation.events.ts         # UserRated, ReputationScoreUpdated, ReputationPenaltyApplied...
│       │   ├── notification.events.ts       # NotificationCreated, NotificationSent, NotificationFailed...
│       │   └── system.events.ts             # SystemConfigUpdated, MessageBrokerUnavailable, MessageBrokerRecovered...
│       ├── enums/                           # Toàn bộ hằng số trạng thái từ SRS
│       │   ├── roles.enum.ts                # ADMIN, SELLER, BUYER, SUPPORT_STAFF (SRS 2.3)
│       │   ├── privileges.enum.ts           # 65 quyền hạn theo bảng SRS 2.7 (AUTH.LOGIN, PRODUCT.CREATE...)
│       │   ├── product-status.enum.ts       # DRAFT, ACTIVE, INACTIVE (SRS 2.6)
│       │   ├── order-status.enum.ts         # PENDING, PAID, CANCELLED, REFUNDED, COMPLETED (SRS 3.4.3)
│       │   ├── auction-status.enum.ts       # DRAFT, SCHEDULED, ACTIVE, ENDED, SETTLED, CANCELLED (SRS 3.5.1)
│       │   ├── shipment-status.enum.ts      # CREATED, PICKED_UP, IN_TRANSIT, DELIVERED, FAILED, RETURNED (SRS 3.6.2)
│       │   └── trust-level.enum.ts          # NEWBORN, STANDARD, TRUSTED, VIP, SUSPENDED (SRS 3.1.2)
│       └── index.ts
│
└── utils/                                   # CÁC TIỆN ÍCH DÙNG CHUNG TOÀN HỆ THỐNG
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── logger/
        │   └── winston-logger.ts            # Logger chuẩn JSON: timestamp, traceId, che thông tin mật PII (SRS 5.5)
        ├── errors/
        │   ├── app-error.ts                 # Lớp cha của toàn bộ lỗi
        │   ├── not-found-error.ts           # Lỗi 404
        │   ├── validation-error.ts          # Lỗi 422
        │   ├── unauthorized-error.ts        # Lỗi 401
        │   ├── forbidden-error.ts           # Lỗi 403
        │   └── conflict-error.ts            # Lỗi 409
        ├── response/
        │   └── api-response.ts              # Format chuẩn: { success: boolean, data?: any, error?: any }
        ├── security/
        │   ├── jwt-token.ts                 # Hàm ký và giải mã Token JWT
        │   └── password-hasher.ts           # Mã hóa mật khẩu bằng BCrypt
        ├── queue/
        │   ├── rabbitmq-client.ts           # Quản lý kết nối tới RabbitMQ Cluster
        │   └── base-publisher.ts            # Lớp cơ sở gửi sự kiện chuẩn hóa
        └── index.ts
```

---

## 2. Chi Tiết Danh Sách Sự Kiện (SRS 2.8 Event Message Table)

> 📖 **Xem tài liệu chi tiết đầy đủ:**
>
> - [**Báo cáo so sánh & đề xuất cơ chế event (SCRUM-33)**](../docs/architecture/event-mechanism-comparison-phase-0.md)
> - [**ADR-001: Lựa chọn cơ chế giao tiếp sự kiện cho Phase 0 (SCRUM-34)**](../docs/adr/ADR-001-event-mechanism-phase-0.md)
> - [**Danh mục đặc tả chi tiết SRS 2.8 Event Catalog (SCRUM-37)**](../docs/standards/event-catalog-srs-2.8.md)

Toàn bộ các sự kiện đều kế thừa lớp cơ sở bất biến [`DomainEvent<T>`](src/events/domain-event.base.ts) và phát tán qua cổng [`IEventPublisher`](src/events/event-publisher.interface.ts):

1. **User Events (`user.events.ts`)**:
   - `UserRegistered`: Tài khoản mới được tạo thành công.
   - `UserUpdated`: Thông tin người dùng được cập nhật.
   - `UserDeleted`: Tài khoản bị xóa (Soft delete).
   - `UserPasswordChanged` & `UserPasswordReset`: Đổi hoặc đặt lại mật khẩu.
   - `UserLoggedIn` & `UserLoggedOut`: Đăng nhập / đăng xuất.
   - `UserRoleAssigned`: Thay đổi vai trò của người dùng.
2. **Catalog Events (`catalog.events.ts`)**:
   - `ProductCreated`, `ProductUpdated`, `ProductDeleted`, `ProductStatusChanged`.
   - `CategoryCreated`, `CategoryUpdated`, `CategoryDeleted`.
3. **Cart & Commerce Events (`cart.events.ts` & `order.events.ts`)**:
   - `CartCreated`, `CartItemAdded`, `CartItemUpdated`, `CartItemRemoved`, `CartExpired`, `CheckoutStarted`.
   - `OrderCreated`, `OrderCancelled`, `OrderPaid`, `OrderPaymentFailed`, `OrderCompleted`, `OrderRefundRequested`, `OrderRefundCompleted`.
4. **Auction Events (`auction.events.ts`)**:
   - `AuctionCreated`, `AuctionScheduled`, `AuctionStarted`, `BidPlaced`, `Outbid`, `AuctionCancelled`, `AuctionEnded`, `AuctionWon`, `AuctionFailed`, `AuctionPaymentTimeout`, `AuctionSettled`.
5. **Inventory & Shipping Events (`inventory.events.ts` & `shipping.events.ts`)**:
   - `InventoryChecked`, `InventoryReserved`, `InventoryReleased`, `InventoryCommitted`, `InventoryAdjusted`, `InventoryReservationExpired`.
   - `ShippingQuoteRequested`, `ShipmentCreated`, `ShipmentPickedUp`, `ShipmentInTransit`, `ShipmentDelivered`, `ShipmentFailed`, `ShipmentReturned`.
6. **Reputation & System Events (`reputation.events.ts` & `system.events.ts`)**:
   - `UserRated`, `ReputationScoreUpdated`, `ReputationPenaltyApplied`, `TrustLevelChanged`.
   - `SystemConfigUpdated`, `SystemHealthCheckFailed`, `SystemHealthCheckRecovered`, `MessageBrokerUnavailable`, `MessageBrokerRecovered`.

---

## 3. Chi Tiết Danh Sách Quyền Hạn (SRS 2.7 Privileges List)

File `shared/contracts/src/enums/privileges.enum.ts` định nghĩa toàn bộ 65 quyền được quy định trong tài liệu SRS:

```typescript
export enum Privilege {
  // Authentication & Profile
  AUTH_LOGIN = 'AUTH.LOGIN',
  AUTH_LOGOUT = 'AUTH.LOGOUT',
  PROFILE_VIEW = 'PROFILE.VIEW',
  PROFILE_UPDATE = 'PROFILE.UPDATE',
  PROFILE_CHANGE_PASSWORD = 'PROFILE.CHANGE_PASSWORD',
  PROFILE_RESET_PASSWORD = 'PROFILE.RESET_PASSWORD',

  // User Management
  USER_CREATE = 'USER.CREATE',
  USER_UPDATE = 'USER.UPDATE',
  USER_DELETE = 'USER.DELETE',
  USER_VIEW = 'USER.VIEW',
  USER_LIST = 'USER.LIST',
  USER_CHANGE_PASSWORD = 'USER.CHANGE_PASSWORD',
  USER_REPUTATION_VIEW = 'USER.REPUTATION.VIEW',
  USER_REPUTATION_ADJUST = 'USER.REPUTATION.ADJUST',

  // Role Management
  ROLE_CREATE = 'ROLE.CREATE',
  ROLE_UPDATE = 'ROLE.UPDATE',
  ROLE_DELETE = 'ROLE.DELETE',
  ROLE_VIEW = 'ROLE.VIEW',
  ROLE_LIST = 'ROLE.LIST',

  // Product & Category Management
  PRODUCT_CREATE = 'PRODUCT.CREATE',
  PRODUCT_UPDATE = 'PRODUCT.UPDATE',
  PRODUCT_DELETE = 'PRODUCT.DELETE',
  PRODUCT_VIEW = 'PRODUCT.VIEW',
  PRODUCT_LIST = 'PRODUCT.LIST',
  PRODUCT_SEARCH = 'PRODUCT.SEARCH',
  CATEGORY_CREATE = 'CATEGORY.CREATE',
  CATEGORY_UPDATE = 'CATEGORY.UPDATE',
  CATEGORY_DELETE = 'CATEGORY.DELETE',
  CATEGORY_VIEW = 'CATEGORY.VIEW',
  CATEGORY_LIST = 'CATEGORY.LIST',

  // Cart & Order
  CART_CREATE = 'CART.CREATE',
  CART_UPDATE = 'CART.UPDATE',
  CART_REMOVE_ITEM = 'CART.REMOVE_ITEM',
  CART_VIEW = 'CART.VIEW',
  CHECKOUT_START = 'CHECKOUT.START',
  ORDER_CREATE = 'ORDER.CREATE',
  ORDER_CANCEL = 'ORDER.CANCEL',
  ORDER_VIEW = 'ORDER.VIEW',
  ORDER_LIST = 'ORDER.LIST',
  ORDER_REFUND = 'ORDER.REFUND',

  // Auction
  AUCTION_CREATE = 'AUCTION.CREATE',
  AUCTION_UPDATE = 'AUCTION.UPDATE',
  AUCTION_CANCEL = 'AUCTION.CANCEL',
  AUCTION_ADMIN_CANCEL = 'AUCTION.ADMIN_CANCEL',
  AUCTION_VIEW = 'AUCTION.VIEW',
  AUCTION_LIST = 'AUCTION.LIST',
  AUCTION_BID = 'AUCTION.BID',
  AUCTION_VIEW_BID_HISTORY = 'AUCTION.VIEW_BID_HISTORY',

  // Shipping
  SHIPPING_QUOTE = 'SHIPPING.QUOTE',
  SHIPPING_CREATE_SHIPMENT = 'SHIPPING.CREATE_SHIPMENT',
  SHIPPING_VIEW_SHIPMENT = 'SHIPPING.VIEW_SHIPMENT',
  SHIPPING_UPDATE_STATUS = 'SHIPPING.UPDATE_STATUS',
  SHIPPING_MANUAL_OVERRIDE = 'SHIPPING.MANUAL_OVERRIDE',

  // Reputation & Notification
  REPUTATION_VIEW = 'REPUTATION.VIEW',
  REPUTATION_RATE = 'REPUTATION.RATE',
  REPUTATION_PENALTY_VIEW = 'REPUTATION.PENALTY.VIEW',
  REPUTATION_PENALTY_APPLY = 'REPUTATION.PENALTY.APPLY',
  NOTIFICATION_VIEW = 'NOTIFICATION.VIEW',
  NOTIFICATION_MANAGE_PREFERENCE = 'NOTIFICATION.MANAGE_PREFERENCE',

  // System & Audit
  EVENT_LOG_VIEW = 'EVENT_LOG.VIEW',
  EVENT_LOG_VIEW_DETAIL = 'EVENT_LOG.VIEW_DETAIL',
  AUDIT_LOG_VIEW = 'AUDIT_LOG.VIEW',
  SYSTEM_CONFIG_VIEW = 'SYSTEM.CONFIG.VIEW',
  SYSTEM_CONFIG_UPDATE = 'SYSTEM.CONFIG.UPDATE',
  SYSTEM_HEALTH_VIEW = 'SYSTEM.HEALTH.VIEW',
}
```

---

## 4. Hướng Dẫn Sử Dụng Cơ Chế Sự Kiện (Event Mechanism Guide - SCRUM-46)

### 4.1. Cấu Trúc Lớp Cơ Sở & Cổng Phát Sự Kiện

Toàn bộ sự kiện trong hệ thống kế thừa từ `DomainEvent<T>` (bất biến, tự sinh `eventId` UUID v4 và `occurredAt` ISO-8601).
Tầng Application chỉ tương tác qua cổng `IEventPublisher` (Ports & Adapters pattern).

### 4.2. Cách Thêm Một Event Contract Mới

1. Tạo file hoặc mở file tương ứng trong `shared/contracts/src/events/` (VD: `auction.events.ts`).
2. Khai báo interface Payload:
   ```typescript
   export interface MyNewEventPayload {
     itemId: string;
     amount: number;
   }
   ```
3. Tạo class kế thừa `DomainEvent<MyNewEventPayload>`:
   ```typescript
   export class MyNewDomainEvent extends DomainEvent<MyNewEventPayload> {
     public static readonly EVENT_TYPE = 'domain.entity.action';

     constructor(payload: MyNewEventPayload) {
       super({
         type: MyNewDomainEvent.EVENT_TYPE,
         sourceService: 'my-service',
         payload,
       });
     }
   }
   ```
4. Xuất class trong `shared/contracts/src/events/index.ts`.

### 4.3. Cách Phát Tán Sự Kiện (Publish Event)

```typescript
import { IEventPublisher, UserRegisteredDomainEvent } from '@nexus/contracts';

export class RegisterUserUseCase {
  constructor(private readonly eventPublisher: IEventPublisher) {}

  async execute(input) {
    // Logic nghiệp vụ...
    const event = new UserRegisteredDomainEvent({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      registeredAt: new Date().toISOString(),
    });

    await this.eventPublisher.publish(event);
  }
}
```

### 4.4. Cách Lắng Nghe Sự Kiện (Subscribe / Handle Event)

```typescript
import { IEventPublisher } from '@nexus/contracts';

// Trong module nhận (ví dụ: Notification Service)
eventPublisher.subscribe('user.registered', async (event) => {
  const { email, fullName } = event.payload;
  console.log(`Gửi email kích hoạt tới: ${email}`);
});

// Lắng nghe toàn bộ sự kiện (Wildcard)
eventPublisher.subscribe('*', async (event) => {
  console.log(`[Audit Log] ${event.type} phát sinh từ ${event.sourceService}`);
});
```

### 4.5. Mức Độ Đảm Bảo Độ Bền (Durability) & Retry Trong Phase 0

- **Trong môi trường Unit Test & Local Fast CI:** Sử dụng `InMemoryEventPublisher`. Dữ liệu lưu trong RAM tiến trình, thời gian phản hồi tức thì (<1ms). **Không có tính bền vững khi crash**; chỉ phù hợp cho kiểm thử tự động độc lập.
- **Trong môi trường Docker Compose phân tán:** Sử dụng `RabbitMqEventPublisher` kết nối tới container `nexus-rabbitmq:5672` (Topic Exchange `nexus.events`), tin nhắn cấu hình `deliveryMode = 2` (Persistent) và sẵn sàng tích hợp Dead Letter Exchange (`nexus.events.dlx`) ở Phase 1.

### 4.6. Lệnh Chạy Kiểm Thử Sự Kiện

```bash
# Kiểm tra bộ test hợp đồng sự kiện & Publisher
pnpm test:events

# Kiểm tra luồng liên module mẫu end-to-end (SCRUM-45)
node --test scripts/test-inter-module-event-flow.test.js
```
