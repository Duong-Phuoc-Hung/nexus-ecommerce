# 📋 DANH MỤC SỰ KIỆN HỆ THỐNG (SRS 2.8 EVENT MESSAGE TABLE & CATALOG) (SCRUM-37)

> **Tài liệu tham chiếu:** SRS Project Nexus v1.0 (Section 2.8 - Event Message Table, Section 3.2 - Notification & Audit, Section 4.2 - Contracts)  
> **Gói mã nguồn hợp đồng:** `@nexus/contracts` (`shared/contracts/src/events/`)  
> **Kiến trúc áp dụng:** Domain-Driven Design (DDD) & Hexagonal Architecture (`IEventPublisher`, `DomainEvent<T>`)

---

## 1. Tổng Quan Kiến Trúc Sự Kiện (Event-Driven Architecture Overview)

Trong Project Nexus, các microservices/bounded contexts không được gọi trực tiếp database hay use case nội bộ của nhau. Mọi thay đổi trạng thái mang tính liên module bắt buộc phải phát hành dưới dạng **Domain Event** ra Topic Exchange `nexus.events` của RabbitMQ theo định dạng chuẩn:

```
Routing Key Format: <domain>.<entity>.<action>
Ví dụ:
  - user.registered
  - catalog.product.created
  - cart.checkout_started
  - order.created
  - auction.bid.placed
  - auction.won
  - shipment.status_updated
```

---

## 2. Bảng Đối Chiếu Danh Mục Sự Kiện (SRS 2.8 Event Message Table)

### 2.1. Bounded Context: User & IAM (`user-service`)

| Tên Sự Kiện                    | Routing Key / Type              | Producer       | Consumer(s)                                  | Điều Kiện Kích Hoạt                                       | Cấu Trúc Payload Chi Tiết                                    | Phạm Vi     |
| :----------------------------- | :------------------------------ | :------------- | :------------------------------------------- | :-------------------------------------------------------- | :----------------------------------------------------------- | :---------- |
| **UserRegistered**             | `user.registered`               | `user-service` | `notification-service`, `reputation-service` | Người dùng hoàn tất đăng ký tài khoản mới thành công      | `userId`, `email`, `fullName`, `role`, `registeredAt`        | **Phase 0** |
| **UserUpdated**                | `user.updated`                  | `user-service` | `reputation-service`, `notification-service` | Cập nhật hồ sơ cá nhân (tên, số điện thoại, avatar)       | `userId`, `email?`, `fullName?`, `phoneNumber?`, `updatedAt` | **Phase 0** |
| **UserPasswordResetRequested** | `user.password_reset_requested` | `user-service` | `notification-service`                       | Người dùng yêu cầu quên mật khẩu, sinh OTP/Reset Token    | `userId`, `email`, `resetToken`, `expiresAt`                 | **Phase 0** |
| **UserRoleAssigned**           | `user.role_assigned`            | `user-service` | `audit-service`, `notification-service`      | Quản trị viên thay đổi vai trò (BUYER -> SELLER -> ADMIN) | `userId`, `oldRole`, `newRole`, `assignedBy`, `assignedAt`   | **Phase 0** |
| **UserLocked**                 | `user.locked`                   | `user-service` | `notification-service`, `security-audit`     | Tài khoản bị khóa tự động do nhập sai mật khẩu 5 lần      | `userId`, `email`, `reason`, `failedAttempts`, `lockedAt`    | **Phase 0** |
| **UserDeleted**                | `user.deleted`                  | `user-service` | `catalog-service`, `commerce-service`        | Yêu cầu xóa tài khoản (GDPR / Right to be forgotten)      | `userId`, `deletedAt`, `anonymizedEmail`                     | Phase 1     |

---

### 2.2. Bounded Context: Product Catalog (`catalog-service`)

| Tên Sự Kiện              | Routing Key / Type               | Producer          | Consumer(s)                                   | Điều Kiện Kích Hoạt                                                | Cấu Trúc Payload Chi Tiết                                                  | Phạm Vi     |
| :----------------------- | :------------------------------- | :---------------- | :-------------------------------------------- | :----------------------------------------------------------------- | :------------------------------------------------------------------------- | :---------- |
| **ProductCreated**       | `catalog.product.created`        | `catalog-service` | `fulfillment-service`, `notification-service` | Người bán tạo mới một mặt hàng trên hệ thống                       | `productId`, `sellerId`, `title`, `price`, `stockQuantity`, `createdAt`    | **Phase 0** |
| **ProductUpdated**       | `catalog.product.updated`        | `catalog-service` | `commerce-service`                            | Người bán chỉnh sửa giá, số lượng tồn kho hoặc thông tin sản phẩm  | `productId`, `sellerId`, `title?`, `price?`, `stockQuantity?`, `updatedAt` | **Phase 0** |
| **ProductStatusChanged** | `catalog.product.status_changed` | `catalog-service` | `commerce-service`, `auction-service`         | Mặt hàng chuyển trạng thái (DRAFT -> ACTIVE -> INACTIVE -> BANNED) | `productId`, `oldStatus`, `newStatus`, `changedBy`, `changedAt`            | **Phase 0** |
| **CategoryCreated**      | `catalog.category.created`       | `catalog-service` | `catalog-service`                             | Quản trị viên tạo danh mục sản phẩm mới                            | `categoryId`, `name`, `slug`, `parentId?`, `createdAt`                     | **Phase 0** |

---

### 2.3. Bounded Context: Cart, Commerce & Orders (`commerce-service`)

| Tên Sự Kiện         | Routing Key / Type      | Producer           | Consumer(s)                                   | Điều Kiện Kích Hoạt                                    | Cấu Trúc Payload Chi Tiết                                                                     | Phạm Vi     |
| :------------------ | :---------------------- | :----------------- | :-------------------------------------------- | :----------------------------------------------------- | :-------------------------------------------------------------------------------------------- | :---------- |
| **CartItemAdded**   | `cart.item_added`       | `commerce-service` | `analytics-service`                           | Người mua thêm sản phẩm vào giỏ hàng                   | `userId`, `productId`, `quantity`, `addedAt`                                                  | **Phase 0** |
| **CheckoutStarted** | `cart.checkout_started` | `commerce-service` | `fulfillment-service`                         | Người mua nhấn nút thanh toán giỏ hàng                 | `userId`, `cartId`, `totalEstimatedAmount`, `startedAt`                                       | **Phase 0** |
| **OrderCreated**    | `order.created`         | `commerce-service` | `fulfillment-service`, `notification-service` | Đơn hàng mua sắm hoặc trúng đấu giá được lập           | `orderId`, `buyerId`, `totalAmount`, `items: [{productId, quantity, unitPrice}]`, `createdAt` | **Phase 0** |
| **OrderPaid**       | `order.paid`            | `commerce-service` | `fulfillment-service`, `notification-service` | Thanh toán qua cổng thành công (Stripe / VNPay / Mock) | `orderId`, `buyerId`, `paymentId`, `amountPaid`, `paymentMethod`, `paidAt`                    | **Phase 0** |
| **OrderCancelled**  | `order.cancelled`       | `commerce-service` | `fulfillment-service`, `notification-service` | Đơn hàng bị hủy do người mua hoặc hết hạn thanh toán   | `orderId`, `buyerId`, `reason`, `cancelledAt`                                                 | **Phase 0** |
| **OrderRefunded**   | `order.refunded`        | `commerce-service` | `notification-service`, `accounting-service`  | Hoàn tiền cho đơn hàng có khiếu nại được phê duyệt     | `orderId`, `refundId`, `refundAmount`, `refundedAt`                                           | Phase 1     |

---

### 2.4. Bounded Context: Real-Time Auction & Bidding (`auction-service`)

| Tên Sự Kiện          | Routing Key / Type   | Producer          | Consumer(s)                                | Điều Kiện Kích Hoạt                           | Cấu Trúc Payload Chi Tiết                                                                     | Phạm Vi     |
| :------------------- | :------------------- | :---------------- | :----------------------------------------- | :-------------------------------------------- | :-------------------------------------------------------------------------------------------- | :---------- |
| **AuctionCreated**   | `auction.created`    | `auction-service` | `notification-service`                     | Người bán thiết lập phiên đấu giá mới         | `auctionId`, `sellerId`, `productId`, `startingPrice`, `bidIncrement`, `startTime`, `endTime` | **Phase 0** |
| **AuctionStarted**   | `auction.started`    | `auction-service` | `notification-service`, `web-customer`     | Đến giờ mở phiên đấu giá theo lịch            | `auctionId`, `productId`, `startedAt`, `endTime`                                              | **Phase 0** |
| **BidPlaced**        | `auction.bid.placed` | `auction-service` | `notification-service`, `web-customer`     | Người mua đặt một mức giá hợp lệ mới          | `auctionId`, `bidderId`, `bidAmount`, `placedAt`                                              | **Phase 0** |
| **AuctionOutbid**    | `auction.outbid`     | `auction-service` | `notification-service`                     | Người đấu giá trước đó bị vượt giá            | `auctionId`, `outbidBidderId`, `newHighestBid`, `outbidAt`                                    | **Phase 0** |
| **AuctionWon**       | `auction.won`        | `auction-service` | `commerce-service`, `notification-service` | Hết giờ đấu giá và tìm ra người chiến thắng   | `auctionId`, `winnerId`, `sellerId`, `finalPrice`, `wonAt`                                    | **Phase 0** |
| **AuctionCancelled** | `auction.cancelled`  | `auction-service` | `notification-service`, `web-customer`     | Phiên đấu giá bị hủy bởi Admin hoặc người bán | `auctionId`, `reason`, `cancelledBy`, `cancelledAt`                                           | **Phase 0** |

---

### 2.5. Bounded Context: Fulfillment & Shipping (`fulfillment-service`)

| Tên Sự Kiện               | Routing Key / Type        | Producer              | Consumer(s)                                | Điều Kiện Kích Hoạt                                               | Cấu Trúc Payload Chi Tiết                                                            | Phạm Vi     |
| :------------------------ | :------------------------ | :-------------------- | :----------------------------------------- | :---------------------------------------------------------------- | :----------------------------------------------------------------------------------- | :---------- |
| **InventoryReserved**     | `inventory.reserved`      | `fulfillment-service` | `commerce-service`                         | Khóa tạm thời số lượng sản phẩm trong kho khi tạo đơn             | `orderId`, `items: [{productId, quantity}]`, `expiresAt`, `reservedAt`               | **Phase 0** |
| **InventoryReleased**     | `inventory.released`      | `fulfillment-service` | `commerce-service`                         | Mở khóa lại số lượng sản phẩm khi hủy đơn hoặc hết hạn thanh toán | `orderId`, `reason`, `releasedAt`                                                    | **Phase 0** |
| **ShipmentCreated**       | `shipment.created`        | `fulfillment-service` | `notification-service`, `commerce-service` | Tạo mã bưu kiện và điều phối đơn vị vận chuyển                    | `shipmentId`, `orderId`, `carrier`, `trackingNumber`, `shippingAddress`, `createdAt` | **Phase 0** |
| **ShipmentStatusUpdated** | `shipment.status_updated` | `fulfillment-service` | `commerce-service`, `notification-service` | Bưu kiện đổi trạng thái (IN_TRANSIT -> DELIVERED -> RETURNED)     | `shipmentId`, `orderId`, `oldStatus`, `newStatus`, `currentLocation?`, `updatedAt`   | **Phase 0** |

---

### 2.6. Bounded Context: Notification & System (`notification-service`, `system`)

| Tên Sự Kiện                  | Routing Key / Type          | Producer               | Consumer(s)                      | Điều Kiện Kích Hoạt                                  | Cấu Trúc Payload Chi Tiết                                              | Phạm Vi     |
| :--------------------------- | :-------------------------- | :--------------------- | :------------------------------- | :--------------------------------------------------- | :--------------------------------------------------------------------- | :---------- |
| **NotificationDispatched**   | `notification.dispatched`   | `notification-service` | `audit-log`                      | Gửi thành công email / SMS / thông báo ứng dụng      | `notificationId`, `recipientId`, `channel`, `template`, `dispatchedAt` | **Phase 0** |
| **NotificationFailed**       | `notification.failed`       | `notification-service` | `audit-log`, `devops-alert`      | Gửi email / SMS thất bại sau số lần thử lại quy định | `notificationId`, `recipientId`, `channel`, `errorReason`, `failedAt`  | **Phase 0** |
| **SystemConfigUpdated**      | `system.config_updated`     | `system`               | `all-services`                   | Tham số cấu hình toàn hệ thống thay đổi từ trung tâm | `key`, `oldValue?`, `newValue`, `updatedBy`, `updatedAt`               | **Phase 0** |
| **MessageBrokerUnavailable** | `system.broker_unavailable` | `health-checker`       | `devops-alert`, `fallback-cache` | Phát hiện cụm RabbitMQ ngắt kết nối                  | `brokerType: 'RABBITMQ'`, `endpoint`, `timestamp`, `reason?`           | **Phase 0** |
| **MessageBrokerRecovered**   | `system.broker_recovered`   | `health-checker`       | `devops-alert`, `retry-worker`   | Cụm RabbitMQ khôi phục kết nối thành công            | `brokerType: 'RABBITMQ'`, `endpoint`, `timestamp`                      | **Phase 0** |

---

## 3. Cách Sử Dụng Trong Source Code TypeScript

Toàn bộ các sự kiện trên đã được cung cấp sẵn thông qua gói `@nexus/contracts`.

```typescript
import {
  IEventPublisher,
  InMemoryEventPublisher,
  UserRegisteredDomainEvent,
  BidPlacedDomainEvent,
} from '@nexus/contracts';

// 1. Khởi tạo publisher
const publisher: IEventPublisher = new InMemoryEventPublisher();

// 2. Tạo và phát tán Domain Event
const event = new UserRegisteredDomainEvent({
  userId: 'usr_01hqz882910',
  email: 'buyer@nexus.local',
  fullName: 'Nguyen Van A',
  role: 'BUYER',
  registeredAt: new Date().toISOString(),
});

await publisher.publish(event);
```
