# Backend Architecture & Bounded Context Specification

> **Tài liệu tham chiếu:** SRS Project Nexus v1.0 (Section 2.4, 2.5, 3.1 - 3.6, 4.1 - 4.3, 5.1 - 5.8)  
> **Ngôn ngữ & Nền tảng:** Node.js, TypeScript (Strict Mode), Express, Prisma ORM, Redis, RabbitMQ.  
> **Mô hình kiến trúc:** Domain-Driven Design (DDD) & Clean Architecture / Hexagonal Architecture.

---

## 1. Kiến Trúc 4 Tầng Chuẩn DDD Trong Mỗi Bounded Context

Mỗi service trong `backend/` tương ứng với một **Bounded Context** độc lập và được cấu trúc theo 4 tầng phân tách nghiêm ngặt:

```text
       ┌────────────────────────────────────────────────────────┐
       │             1. INTERFACES (API / PRESENTATION)         │
       │  - HTTP REST Controllers, Express Routes, DTOs         │
       └───────────────────────────┬────────────────────────────┘
                                   │ (calls)
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │             2. APPLICATION (USE CASES)                 │
       │  - Use Cases / Interactors, Inbound & Outbound Ports   │
       └─────────────┬────────────────────────────┬─────────────┘
                     │ (orchestrates)             │ (inversion)
                     ▼                            ▼
┌──────────────────────────────────────┐  ┌────────────────────────────────────┐
│         3. DOMAIN (CORE BUSINESS)    │  │       4. INFRASTRUCTURE            │
│  - Entities & Value Objects          │  │  - Repository Implementations      │
│  - Repository Interfaces (Ports)     │◄─┼── (Prisma, In-Memory)              │
│  - Domain Events & Domain Exceptions │  │  - RabbitMQ Event Publishers       │
│  * 100% Độc lập Framework & Database *│  │  - Database Connections & Drivers  │
└──────────────────────────────────────┘  └────────────────────────────────────┘
```

### Chi tiết nhiệm vụ từng tầng:

1. **`domain/` (Enterprise Business Rules):**
   - **Entities**: Đại diện cho các đối tượng nghiệp vụ cốt lõi, nắm giữ định danh và các quy tắc bảo toàn tính hợp lệ dữ liệu (Domain Invariants).
   - **Repositories (Interfaces/Ports)**: Khai báo hợp đồng truy xuất dữ liệu thuần túy bằng TypeScript Interface. **Tuyệt đối không chứa mã SQL hay Prisma.**
   - **Events**: Khai báo các sự kiện nghiệp vụ nội bộ (Domain Events).
   - **Exceptions**: Các lỗi nghiệp vụ đặc thù của miền (Domain Exceptions).

2. **`application/` (Application Business Rules):**
   - **Use Cases**: Điều phối luồng nghiệp vụ cho từng ca sử dụng (ví dụ: `GetUserProfileUseCase`, `GetProductDetailUseCase`, `GetAuctionDetailUseCase`).
   - **DTOs**: Định nghĩa cấu trúc dữ liệu truyền vào và lấy ra của Use Case.
   - **Ports**: Khai báo các giao diện xuất (Outbound Ports) như `IEventPublisher`.

3. **`infrastructure/` (Frameworks & Drivers):**
   - **Repositories**: Triển khai cụ thể các interface ở tầng Domain (sử dụng Prisma Client hoặc In-Memory phục vụ dev/test).
   - **Messaging**: Triển khai phát tán sự kiện ra RabbitMQ Broker.
   - **Database**: Quản lý kết nối Prisma Client tới PostgreSQL cô lập của service.

4. **`interfaces/` (Interface Adapters):**
   - **Controllers**: Tiếp nhận HTTP Request từ client/gateway, parse dữ liệu, gọi Use Case và trả về HTTP Response chuẩn (JSON).
   - **Routes**: Khai báo endpoint đường dẫn và method (GET, POST, PUT, DELETE).
   - **DTOs**: Kiểm tra và validate dữ liệu request body.

---

## 2. Quy Tắc Giao Tiếp Liên Bounded Context (BẮT BUỘC TUÂN THỦ)

Để đảm bảo các module có thể phát triển, kiểm thử và triển khai độc lập, toàn bộ nhóm phải tuân thủ nghiêm ngặt 4 quy tắc sau:

### Quy tắc 1: CẤM IMPORT CHÉO ENTITY HOẶC REPOSITORY

- **NGHIÊM CẤM:** Service A `import { Order } from '../../commerce-service/src/domain/entities/Order'` hoặc import Repository của nhau.
- **NGHIÊM CẤM:** Một service kết nối hoặc truy vấn trực tiếp vào Database của service khác.
- **LÝ DO:** Mỗi Bounded Context là một ranh giới nghiệp vụ riêng biệt. Việc import chéo sẽ biến hệ thống thành một khối Spaghettti Monolith không thể tách rời.

### Quy tắc 2: GIAO TIẾP ĐỒNG BỘ QUA INTERFACE / HTTP API GATEWAY

- Khi Service A cần thông tin tức thời từ Service B (ví dụ: Commerce Service cần kiểm tra giá sản phẩm từ Catalog Service):
  - **Cách làm đúng:** Service A gọi qua HTTP REST endpoint của Service B (thông qua API Gateway hoặc Internal URL) và nhận về Public DTO.
  - Không bao giờ đọc bảng cơ sở dữ liệu của nhau.

### Quy tắc 3: GIAO TIẾP BẤT ĐỒNG BỘ QUA EVENT BROKER (RABBITMQ)

- Khi một hành động nghiệp vụ hoàn thành ở Service A và các service khác cần phản ứng lại (Event-Driven Architecture):
  - Service A bắn Domain Event chuẩn ra RabbitMQ Exchange (ví dụ: `user.registered`, `auction.bid.placed`, `commerce.order.created`).
  - Các service liên quan (như Notification Service) lắng nghe queue sự kiện tương ứng và thực thi tác vụ ngầm (gửi email, cập nhật cache).
  - Tuân theo bảng phân bổ sự kiện SRS Section 2.8.

### Quy tắc 4: CƠ SỞ DỮ LIỆU ĐỘC LẬP (DATABASE-PER-SERVICE)

- Mỗi Bounded Context sở hữu một Database PostgreSQL riêng biệt trên các cổng khác nhau:
  - `user-service`: `nexus_user_db` (Port 5432)
  - `catalog-service`: `nexus_catalog_db` (Port 5433)
  - `commerce-service`: `nexus_commerce_db` (Port 5434)
  - `auction-service`: `nexus_auction_db` (Port 5435)
  - `fulfillment-service`: `nexus_fulfillment_db` (Port 5436)
  - `notification-service`: `nexus_notification_db` (Port 5437)

---

## 3. Danh Sách 6 Bounded Contexts & API Gateway

| Service                    | Bounded Context                           | Cổng (Port) | Health Check URL               | Endpoint Mẫu                                         |
| :------------------------- | :---------------------------------------- | :---------: | :----------------------------- | :--------------------------------------------------- |
| **`api-gateway`**          | Cổng điều phối & Proxy                    |   `8000`    | `http://localhost:8000/health` | `GET /api/v1`                                        |
| **`user-service`**         | Người dùng & Định danh (SRS 3.1)          |   `3001`    | `http://localhost:3001/health` | `GET /api/v1/users/profile`                          |
| **`catalog-service`**      | Danh mục & Sản phẩm (SRS 3.3)             |   `3002`    | `http://localhost:3002/health` | `GET /api/v1/products`                               |
| **`commerce-service`**     | Giỏ hàng, Đơn hàng & Thanh toán (SRS 3.4) |   `3003`    | `http://localhost:3003/health` | `GET /api/v1/orders/ord_01hqz555abc`                 |
| **`auction-service`**      | Đấu giá thời gian thực (SRS 3.5)          |   `3004`    | `http://localhost:3004/health` | `GET /api/v1/auctions`                               |
| **`fulfillment-service`**  | Vận chuyển & Giao vận (SRS 3.6)           |   `3005`    | `http://localhost:3005/health` | `GET /api/v1/fulfillments/shipments/shp_01hqz222trk` |
| **`notification-service`** | Thông báo Email / Push (SRS 3.2)          |   `3006`    | `http://localhost:3006/health` | `GET /api/v1/notifications/ntf_01hqz111welcome`      |

---

## 4. Hướng Dẫn Biên Dịch & Chạy Thử Nghiệm

### 1. Biên dịch toàn bộ các Service cùng lúc:

Tại thư mục gốc dự án:

```powershell
pnpm build
```

### 2. Khởi chạy từng Service độc lập ở chế độ Development (Hot-reload):

```powershell
# Khởi chạy User Service:
pnpm dev:user

# Khởi chạy Catalog Service:
pnpm dev:catalog

# Khởi chạy Commerce Service:
pnpm dev:commerce

# Khởi chạy Auction Service:
pnpm dev:auction

# Khởi chạy Fulfillment Service:
pnpm dev:fulfillment

# Khởi chạy Notification Service:
pnpm dev:notification

# Khởi chạy API Gateway:
pnpm dev:gateway
```

### 3. Kiểm tra tính sẵn sàng (Health Check Verification):

Mỗi service khi khởi chạy đều trả về trạng thái `UP` với mã HTTP 200:

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/health"
```

Kết quả trả về:

```json
{
  "status": "UP",
  "service": "user-service",
  "boundedContext": "User & Authentication (SRS 3.1)",
  "port": 3001,
  "timestamp": "2026-10-07T10:04:03.848Z"
}
```
