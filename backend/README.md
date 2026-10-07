# Backend Architecture & Structure Specification (BE)

> **Tài liệu tham chiếu:** SRS Project Nexus v1.0 (Section 2.4, 2.5, 3.1 - 3.6, 4.1 - 4.3, 5.1 - 5.8)  
> **Ngôn ngữ & Nền tảng:** Node.js, TypeScript, Express / NestJS, Prisma ORM, Redis, RabbitMQ.  
> **Nguyên tắc kiến trúc cốt lõi:** Database-per-service (SRS 4.1), Event-Driven Architecture, Layered Services.

---

## 1. Mô Hình Lớp Chuẩn Trong Mỗi Service (Standard Service Layers)

Để code dễ hiểu, dễ phân công nhiệm vụ và bảo trì, mỗi dịch vụ trong `backend/` đều tuân theo mô hình thống nhất:

```text
[ Client / Gateway ]
         │
         ▼
     [ routes/ ]          --> Khai báo đường dẫn HTTP (GET, POST, PUT, DELETE)
         │
         ▼
  [ middlewares/ ]        --> Xác thực Token, kiểm tra quyền (RBAC), Validate dữ liệu đầu vào
         │
         ▼
   [ controllers/ ]       --> Nhận Request, gọi Service, trả về JSON Response chuẩn
         │
         ▼
    [ services/ ]         --> Chứa 100% logic nghiệp vụ, tính toán, kiểm tra điều kiện SRS
      │      │
      │      ├───────────► [ integrations/ ] --> Gọi API bên ngoài (Stripe, GHN, GHTK, FCM)
      │      │
      │      ├───────────► [ publishers/ ]   --> Bắn sự kiện ra RabbitMQ sau khi hoàn thành
      │      │
      ▼      ▼
    [ prisma/ ]           --> Tương tác Cơ sở dữ liệu thông qua Prisma Client
```

---

## 2. Cây Thư Mục Chi Tiết Toàn Bộ Backend

```text
backend/
├── api-gateway/                             # CỔNG ĐIỀU PHỐI API (SRS 2.4)
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── src/
│       ├── configs/
│       │   └── gateway.config.ts            # Cấu hình Port, URL nội bộ các service, Secret Key
│       ├── middlewares/
│       │   ├── auth.middleware.ts           # Giải mã JWT Bearer Token, kiểm tra hạn dùng
│       │   ├── rbac.middleware.ts           # Kiểm tra quyền hạn theo bảng Privileges (SRS 2.7)
│       │   ├── rate-limiter.ts              # Giới hạn tần suất gọi chống tràn tải
│       │   ├── trace-id.middleware.ts       # Gắn mã X-Trace-Id vào header của từng request
│       │   ├── cors.middleware.ts           # Cấu hình tên miền cho phép truy cập (CORS)
│       │   └── error-handler.ts             # Bộ bắt lỗi tập trung tại cổng Gateway
│       ├── routes/
│       │   ├── user.route.ts                # Chuyển tiếp tới User Service (/api/v1/auth, /api/v1/users)
│       │   ├── catalog.route.ts             # Chuyển tiếp tới Catalog Service (/api/v1/products, /api/v1/categories)
│       │   ├── commerce.route.ts            # Chuyển tiếp tới Commerce Service (/api/v1/cart, /api/v1/orders)
│       │   ├── auction.route.ts             # Chuyển tiếp tới Auction Service (/api/v1/auctions, /api/v1/bids)
│       │   ├── fulfillment.route.ts         # Chuyển tiếp tới Fulfillment Service (/api/v1/inventory, /api/v1/shipping)
│       │   ├── notification.route.ts        # Chuyển tiếp tới Notification Service (/api/v1/notifications)
│       │   └── index.ts
│       ├── app.ts                           # Cấu hình Express App
│       └── server.ts                        # Khởi động server HTTP & WebSocket Gateway
│
├── user-service/                            # DỊCH VỤ TÀI KHOẢN & ĐIỂM UY TÍN (SRS 3.1)
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── prisma/
│   │   └── schema.prisma                    # Bảng: users, roles, privileges, ratings, penalties
│   └── src/
│       ├── configs/
│       │   └── user.config.ts               # SESSION_TIMEOUT_MINUTES (30), MAX_LOGIN_ATTEMPTS (5)...
│       ├── controllers/
│       │   ├── auth.controller.ts           # Đăng ký, Đăng nhập, Đăng xuất, Quên mật khẩu
│       │   ├── user.controller.ts           # Xem hồ sơ, Cập nhật thông tin, Xóa mềm (Soft Delete)
│       │   ├── role.controller.ts           # Quản lý chức vụ và phân quyền (RBAC)
│       │   └── reputation.controller.ts     # Đánh giá sau giao dịch, Xem Trust Level, Xử lý phạt
│       ├── services/
│       │   ├── auth.service.ts              # Xử lý mật khẩu, cấp Access/Refresh Token, khóa tài khoản nếu sai 5 lần
│       │   ├── user.service.ts              # Kiểm tra thông tin hợp lệ (Email, CMND, Ngày sinh), đổi mật khẩu
│       │   ├── role.service.ts              # Phân quyền hạn theo 65 mã Privileges (SRS 2.7)
│       │   └── reputation.service.ts        # Tính điểm Trust Level, trừ 10 điểm phạt nếu quá hạn trả tiền
│       ├── routes/
│       │   ├── auth.routes.ts               # POST /login, POST /register, POST /logout, POST /forgot-password
│       │   ├── user.routes.ts               # GET /, GET /:id, PUT /:id, DELETE /:id, POST /change-password
│       │   ├── role.routes.ts               # GET /, POST /, PUT /:id, DELETE /:id
│       │   └── reputation.routes.ts         # POST /ratings, GET /:userId/summary, POST /penalties
│       ├── validations/
│       │   ├── auth.validation.ts           # Kiểm tra định dạng Email, độ mạnh mật khẩu
│       │   ├── user.validation.ts           # Kiểm tra CMND/CCCD, định dạng số điện thoại
│       │   └── rating.validation.ts         # Điểm số từ 1 - 5, cấm tự đánh giá chính mình
│       ├── subscribers/
│       │   ├── order-completed.subscriber.ts# Nhận OrderCompleted -> Cho phép 2 bên đánh giá nhau
│       │   └── payment-timeout.subscriber.ts# Nhận AuctionPaymentTimeout -> Tự động trừ điểm uy tín
│       ├── publishers/
│       │   └── user.publisher.ts            # Bắn: UserRegistered, UserRated, ReputationUpdated...
│       ├── app.ts
│       └── server.ts
│
├── catalog-service/                         # DỊCH VỤ SẢN PHẨM, DANH MỤC & TÌM KIẾM (SRS 3.3)
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── prisma/
│   │   └── schema.prisma                    # Bảng: products, categories, product_images, product_attributes
│   └── src/
│       ├── configs/
│       │   └── catalog.config.ts            # CATEGORY_MAX_LEVEL (3), MAX_PRODUCT_IMAGES (5), PRODUCT_STATUSES
│       ├── controllers/
│       │   ├── product.controller.ts        # CRUD sản phẩm, kiểm soát trạng thái DRAFT/ACTIVE/INACTIVE
│       │   ├── category.controller.ts       # CRUD danh mục, hiển thị cây danh mục
│       │   └── search.controller.ts         # Tìm kiếm sản phẩm, Lọc theo giá/danh mục, Gợi ý khám phá
│       ├── services/
│       │   ├── product.service.ts           # Chặn upload quá 5 ảnh, không cho xóa sản phẩm đã phát sinh đơn
│       │   ├── category.service.ts          # Đảm bảo phân cấp tối đa 3 tầng, không cho xóa danh mục còn sản phẩm
│       │   └── search.service.ts            # Thuật toán tìm kiếm theo tên, danh mục, giá, sắp xếp
│       ├── routes/
│       │   ├── product.routes.ts            # POST /, GET /, GET /:id, PUT /:id, DELETE /:id
│       │   ├── category.routes.ts           # POST /, GET /, GET /tree, GET /:id, PUT /:id, DELETE /:id
│       │   └── search.routes.ts             # GET /products, GET /discovery
│       ├── validations/
│       │   ├── product.validation.ts
│       │   └── category.validation.ts
│       ├── publishers/
│       │   └── catalog.publisher.ts         # Bắn: ProductCreated, ProductUpdated, CategoryCreated...
│       ├── app.ts
│       └── server.ts
│
├── commerce-service/                        # DỊCH VỤ GIỎ HÀNG, ĐẶT HÀNG & THANH TOÁN (SRS 3.4)
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── prisma/
│   │   └── schema.prisma                    # Bảng: carts, cart_items, orders, order_items, payments, invoices
│   └── src/
│       ├── configs/
│       │   └── commerce.config.ts           # CART_EXPIRATION_DAYS (7), CHECKOUT_TIMEOUT_MINUTES (15)
│       ├── controllers/
│       │   ├── cart.controller.ts           # Thao tác món trong giỏ hàng (thêm, sửa số lượng, xóa)
│       │   ├── checkout.controller.ts       # Khởi tạo quy trình checkout, khóa phiên 15 phút
│       │   ├── order.controller.ts          # Tạo đơn hàng, Hủy đơn hàng, Xem lịch sử và chi tiết
│       │   └── payment.controller.ts        # Tạo giao dịch thanh toán, Nhận Webhook từ Stripe
│       ├── services/
│       │   ├── cart.service.ts              # Tính tổng tiền, gộp giỏ hàng khách vô danh (Guest) khi đăng nhập
│       │   ├── checkout.service.ts          # Tái kiểm tra giá và tính khả dụng của hàng ngay trước khi tính tiền
│       │   ├── order.service.ts             # Chụp snapshot giá sản phẩm, quản lý trạng thái đơn hàng
│       │   ├── payment.service.ts           # Cơ chế Idempotent (cửa sổ 60p) chống trừ tiền 2 lần khi nhận Webhook
│       │   └── invoice.service.ts           # Tự động xuất hóa đơn / biên lai điện tử PDF
│       ├── integrations/
│       │   └── stripe-payment.client.ts     # Gọi SDK Stripe: Tạo PaymentIntent, Xác thực chữ ký Webhook
│       ├── routes/
│       │   ├── cart.routes.ts
│       │   ├── checkout.routes.ts
│       │   ├── order.routes.ts
│       │   └── payment.routes.ts
│       ├── validations/
│       │   ├── cart.validation.ts
│       │   └── checkout.validation.ts
│       ├── subscribers/
│       │   ├── auction-won.subscriber.ts    # Nhận AuctionWon -> Tự động sinh đơn hàng cho người thắng cuộc
│       │   └── inventory-reserved.subscriber.ts # Nhận xác nhận kho đã giữ chỗ -> Tiếp tục thanh toán
│       ├── publishers/
│       │   └── commerce.publisher.ts        # Bắn: OrderCreated, OrderPaid, OrderCancelled, OrderRefunded...
│       ├── app.ts
│       └── server.ts
│
├── auction-service/                         # DỊCH VỤ ĐẤU GIÁ & ĐẶT GIÁ REALTIME (SRS 3.5)
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── prisma/
│   │   └── schema.prisma                    # Bảng: auctions, bids, auction_settlements
│   └── src/
│       ├── configs/
│       │   └── auction.config.ts            # DEFAULT_BID_INCREMENT (10), ANTI_SNIPING (5m), PAYMENT_DEADLINE (24h)
│       ├── controllers/
│       │   ├── auction.controller.ts        # Tạo phòng đấu giá, Sửa tham số (chỉ trước khi mở), Hủy phòng
│       │   └── bid.controller.ts            # Đặt giá mới, Xem lịch sử đặt giá công khai
│       ├── services/
│       │   ├── auction.service.ts           # Quản lý vòng đời (SCHEDULED -> ACTIVE -> ENDED -> SETTLED)
│       │   ├── bidding.service.ts           # Đặt giá siêu tốc (< 300ms), kiểm tra bước giá, kích hoạt Anti-sniping
│       │   └── settlement.service.ts        # Chốt người trả giá cao nhất, phát lệnh tạo đơn hàng
│       ├── websockets/
│       │   └── auction-bid.socket.ts        # Kênh Socket.IO phát giá mới tức thì cho toàn bộ người đang theo dõi
│       ├── redis/
│       │   ├── redis-bid-lock.ts            # Khóa phân tán (Lock) chống xung đột mili-giây
│       │   └── redis-auction-cache.ts       # Lưu giá cao nhất hiện tại trên RAM để đọc siêu tốc
│       ├── jobs/
│       │   ├── auction-scheduler.job.ts     # Tự động mở/đóng phiên đấu giá theo đúng giờ hẹn
│       │   └── payment-deadline.job.ts      # Quét đơn quá 24h chưa trả tiền -> Báo phạt uy tín
│       ├── routes/
│       │   ├── auction.routes.ts
│       │   └── bid.routes.ts
│       ├── validations/
│       │   ├── auction.validation.ts
│       │   └── bid.validation.ts
│       ├── publishers/
│       │   └── auction.publisher.ts         # Bắn: AuctionStarted, BidPlaced, Outbid, AuctionWon, AuctionSettled...
│       ├── app.ts
│       └── server.ts
│
├── fulfillment-service/                     # DỊCH VỤ KHO VÀ GIAO HÀNG (SRS 3.6)
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── prisma/
│   │   └── schema.prisma                    # Bảng: warehouses, sku_inventories, inventory_ledgers, shipments
│   └── src/
│       ├── configs/
│       │   └── fulfillment.config.ts        # RESERVATION_TIMEOUT (30m), DEFAULT_WAREHOUSE (WH_001)
│       ├── controllers/
│       │   ├── inventory.controller.ts      # Tra cứu tồn kho theo SKU, Điều chỉnh tồn kho thủ công
│       │   ├── warehouse.controller.ts      # Danh sách kho bãi, Quản lý kho
│       │   └── shipping.controller.ts       # Báo giá ship, Tạo đơn vận chuyển, Xem lộ trình di chuyển (Tracking)
│       ├── services/
│       │   ├── inventory.service.ts         # Quản lý 4 trạng thái: Total, Available, Reserved, Unavailable
│       │   ├── ledger.service.ts            # Sổ cái bất biến lưu vết biến động kho: INTAKE, RESERVE, RELEASE, COMMIT
│       │   ├── warehouse.service.ts         # Phân bổ lấy hàng từ tối đa 2 kho cho 1 đơn hàng
│       │   └── shipping.service.ts          # Chuẩn hóa trạng thái đơn giao nhận từ các hãng về chuẩn chung
│       ├── integrations/
│       │   ├── ghn-shipping.client.ts       # Gọi API Giao Hàng Nhanh (Lấy cước, Đẩy đơn, Tra mã vận đơn)
│       │   ├── ghtk-shipping.client.ts      # Gọi API Giao Hàng Tiết Kiệm
│       │   └── carrier-resilience.ts        # Bộ Circuit Breaker chống sập khi đối tác giao hàng gặp sự cố
│       ├── routes/
│       │   ├── inventory.routes.ts
│       │   ├── warehouse.routes.ts
│       │   └── shipping.routes.ts
│       ├── validations/
│       │   ├── inventory.validation.ts
│       │   └── shipping.validation.ts
│       ├── subscribers/
│       │   ├── order-created.subscriber.ts  # Nhận OrderCreated -> Giữ chỗ kho (Reserve) 30 phút
│       │   ├── order-paid.subscriber.ts     # Nhận OrderPaid -> Trừ kho thật (Commit) & Đẩy đơn sang GHN/GHTK
│       │   ├── order-cancelled.subscriber.ts# Nhận OrderCancelled -> Nhả lại hàng về kho (Release)
│       │   └── auction-created.subscriber.ts# Nhận AuctionCreated -> Khóa giữ kho cho hàng đấu giá
│       ├── publishers/
│       │   └── fulfillment.publisher.ts     # Bắn: InventoryReserved, ShipmentCreated, ShipmentDelivered...
│       ├── app.ts
│       └── server.ts
│
└── notification-service/                    # DỊCH VỤ THÔNG BÁO & NHẬT KÝ SỰ KIỆN (SRS 3.2)
    ├── package.json
    ├── tsconfig.json
    ├── .env.example
    ├── prisma/
    │   └── schema.prisma                    # Bảng: event_logs, notifications, notification_preferences
    └── src/
        ├── configs/
        │   └── notification.config.ts       # Cấu hình Email, Push, SMS, Retry limit (3 lần)
        ├── controllers/
        │   ├── notification.controller.ts   # Lấy danh sách thông báo của tôi, Đánh dấu đã đọc
        │   ├── event-log.controller.ts      # Màn hình Admin tra cứu nhật ký sự kiện hệ thống
        │   ├── preference.controller.ts     # Bật/tắt loại thông báo theo ý người dùng
        │   └── health.controller.ts         # Kiểm tra kết nối Message Broker (RabbitMQ)
        ├── services/
        │   ├── notification.service.ts      # Phân luồng gửi qua Email hoặc Push Notification
        │   ├── event-log.service.ts         # Tự động ghi log sự kiện bất biến và phục vụ tra cứu
        │   ├── preference.service.ts        # Chặn người dùng tắt thông báo giao dịch bắt buộc
        │   └── broker-health.service.ts     # Quét định kỳ kiểm tra RabbitMQ còn sống không
        ├── integrations/
        │   ├── email-sender.client.ts       # Gửi Email qua SMTP / SendGrid
        │   ├── push-fcm.client.ts           # Gửi Push Notification tới App qua Firebase FCM
        │   └── sms-gateway.client.ts        # Gửi SMS viễn thông
        ├── routes/
        │   ├── notification.routes.ts
        │   ├── event-log.routes.ts
        │   ├── preference.routes.ts
        │   └── health.routes.ts
        ├── validations/
        │   └── preference.validation.ts
        ├── subscribers/
        │   ├── audit-event-logger.subscriber.ts # Tự động bắt TẤT CẢ sự kiện hệ thống lưu vào event_logs
        │   ├── order-events.subscriber.ts       # Nhận OrderPaid -> Gửi email hóa đơn cho người mua
        │   └── auction-events.subscriber.ts     # Nhận Outbid -> Bắn Push Notification báo người bị vượt giá
        ├── publishers/
        │   └── notification.publisher.ts     # Bắn: NotificationSent, MessageBrokerUnavailable...
        ├── app.ts
        └── server.ts
```

---

## 3. Danh Sách Cơ Sở Dữ Liệu Riêng Biệt (Database-per-Service)

Mỗi service sử dụng một Database PostgreSQL độc lập:

| Service                | Tên Database cục bộ     | Các bảng chính (Tables)                                                           |
| :--------------------- | :---------------------- | :-------------------------------------------------------------------------------- |
| `user-service`         | `nexus_user_db`         | `users`, `roles`, `privileges`, `user_roles`, `ratings`, `penalties`              |
| `catalog-service`      | `nexus_catalog_db`      | `products`, `categories`, `product_images`, `product_attributes`                  |
| `commerce-service`     | `nexus_commerce_db`     | `carts`, `cart_items`, `orders`, `order_items`, `payments`, `invoices`, `refunds` |
| `auction-service`      | `nexus_auction_db`      | `auctions`, `bids`, `auction_settlements`, `auction_extensions`                   |
| `fulfillment-service`  | `nexus_fulfillment_db`  | `warehouses`, `sku_inventories`, `inventory_ledgers`, `shipments`, `carriers`     |
| `notification-service` | `nexus_notification_db` | `event_logs`, `notifications`, `notification_preferences`                         |
