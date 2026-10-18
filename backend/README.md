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

## Auth & IAM Prototype

User Service exposes these endpoints directly and through the API Gateway:

- `POST /api/v1/auth/register` creates a BUYER account.
- `POST /api/v1/auth/login` returns a JWT and the role permissions.
- `POST /api/v1/auth/logout` revokes the bearer token.
- `POST /api/v1/auth/forgot-password` requests a single-use reset token (15-minute lifetime).
- `POST /api/v1/auth/reset-password` consumes the reset token and changes the password.
- `GET /api/v1/auth/roles` lists the current static role-permission mappings; requires `ROLE.VIEW`.
- `GET /api/v1/users/profile` returns the authenticated user's profile.
- `PUT /api/v1/users/:id/role` assigns `BUYER`, `SELLER`, or `ADMIN`; requires `ROLE.UPDATE`.

For local admin access, configure `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` (minimum 12 characters) before starting User Service. Set a private `JWT_SECRET` for deployments; production startup/authentication must not use the development fallback. The reset token is included in the response only outside production because this prototype has no email-delivery adapter.

These endpoints currently use in-memory repositories and token stores. Accounts, revocations, and reset tokens are lost on restart and are not shared between service replicas; configure persistent storage and an email provider before production use.

## Catalog Product Search API

Catalog Service exposes product search directly at:

```text
GET http://localhost:4002/api/v1/products/search
```

This endpoint currently runs on Catalog Service directly. The API Gateway lists the Catalog prefix, but its current source does not proxy product requests; Gateway routing must be added by its owner before FE can call this endpoint through `http://localhost:4000`.

### Query parameters

| Parameter    | Required | Default | Description                                                                                          |
| ------------ | -------: | ------: | ---------------------------------------------------------------------------------------------------- |
| `q`          |      Yes |       — | Non-empty keyword; case-insensitive substring match against product title or description.            |
| `categoryId` |       No |       — | Exact category ID filter.                                                                            |
| `minPrice`   |       No |       — | Inclusive lower bound for product price; must be a non-negative number.                              |
| `maxPrice`   |       No |       — | Inclusive upper bound for product price; must be a non-negative number and not less than `minPrice`. |
| `page`       |       No |     `1` | Positive integer page number.                                                                        |
| `limit`      |       No |    `20` | Positive integer page size, maximum `100`.                                                           |

Example:

```http
GET http://localhost:4002/api/v1/products/search?q=headphones&categoryId=cat_electronics&minPrice=100&maxPrice=500&page=1&limit=10
```

No JWT is required. The current implementation uses `InMemoryProductRepository` and includes only products for which `Product.isAvailable()` is true (`ACTIVE` status and positive stock). It searches in-memory data and does not query PostgreSQL.

Successful response (`200`):

```json
{
  "success": true,
  "data": [
    {
      "id": "prod_01hqz999xyz",
      "sellerId": "usr_01hqz789abc",
      "categoryId": "cat_electronics",
      "title": "Sony WH-1000XM5 Wireless Headphones",
      "price": 399.99,
      "stockQuantity": 50,
      "status": "ACTIVE"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

No matches returns `200` with an empty `data` array and zero totals. Missing/blank `q`, invalid page/limit/prices, `limit > 100`, or `minPrice > maxPrice` returns `400` with `{ "success": false, "error": "..." }`.

Implementation files:

- Route: `backend/catalog-service/src/interfaces/http/routes/ProductRoutes.ts`
- Request validation: `backend/catalog-service/src/interfaces/http/dtos/SearchProductsQueryDto.ts`
- Controller: `backend/catalog-service/src/interfaces/http/controllers/ProductController.ts`
- Search orchestration: `backend/catalog-service/src/application/use-cases/SearchProductsUseCase.ts`
- Repository contract/data filtering: `backend/catalog-service/src/domain/repositories/IProductRepository.ts`, `backend/catalog-service/src/infrastructure/repositories/InMemoryProductRepository.ts`
- HTTP tests: `backend/catalog-service/src/app.test.ts`

Run the service with `pnpm dev:catalog`. Verify Search API tests with:

```powershell
pnpm exec tsx --test backend/catalog-service/src/app.test.ts
```

Build Catalog Service with:

```powershell
pnpm --filter @nexus/catalog-service build
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

### Quy tắc 5: KIỂM SOÁT TỰ ĐỘNG BẰNG ARCHUNIT TESTS (`pnpm test:arch`)

Các quy tắc ranh giới kiến trúc trên không chỉ dừng lại ở mặt lý thuyết hay quy ước, mà được **bảo vệ và kiểm tra tự động 100%** thông qua bộ test ArchUnit tại [`scripts/test-architecture-boundaries.test.js`](file:///D:/CodeProject/nexus-ecommerce/nexus-ecommerce-main/scripts/test-architecture-boundaries.test.js).

1. **Lệnh chạy kiểm tra ranh giới:**

   ```bash
   # Chạy toàn bộ test suites (gồm cả Architecture Boundaries và Infrastructure)
   pnpm test

   # Hoặc chỉ chạy riêng bài kiểm tra ranh giới kiến trúc ArchUnit
   pnpm test:arch
   ```

2. **Các ràng buộc kiến trúc được tự động thực thi:**
   - **`RULE_1_FORBID_CROSS_CONTEXT_INTERNAL_IMPORT`**: Ngăn chặn tuyệt đối việc một Bounded Context import trực tiếp Entity, Repository, Use-Case hay cấu trúc nội bộ của context khác. Nếu xuất hiện import chéo, test sẽ lập tức **FAIL** và chỉ rõ chính xác file, dòng vi phạm, và ngữ cảnh.
   - **`RULE_2_DOMAIN_LAYER_PURITY`**: Ép buộc tầng Domain phải thuần túy, cấm phụ thuộc vào Application, Infrastructure hay Interfaces.
   - **`RULE_2_DOMAIN_ENTITY_ISOLATION`**: Cấm Domain Entity import trực tiếp các ORM hay Database client (như Prisma, Mongoose).
   - **Giao tiếp hợp lệ được phép**: Chỉ cho phép import từ các package dùng chung chuẩn hóa (`@nexus/contracts`, `@nexus/events`, `@nexus/shared`, `@nexus/utils`) hoặc thư viện bên thứ ba.
   - **Tự động áp dụng cho package mới (Dynamic Extensibility)**: Bất kỳ thư mục Bounded Context mới nào được thêm vào thư mục `backend/` đều được engine tự động phát hiện và áp dụng toàn bộ rule mà không cần sửa đổi test runner.

---

## 3. Danh Sách 6 Bounded Contexts & API Gateway

| Service                    | Bounded Context                           | Cổng (Port) | Health Check URL               | Endpoint Mẫu                                         |
| :------------------------- | :---------------------------------------- | :---------: | :----------------------------- | :--------------------------------------------------- |
| **`api-gateway`**          | Cổng điều phối & Proxy                    |   `8000`    | `http://localhost:8000/health` | `GET /api/v1`                                        |
| **`user-service`**         | Người dùng & Định danh (SRS 3.1)          |   `3001`    | `http://localhost:3001/health` | `GET /api/v1/users/profile`                          |
| **`catalog-service`**      | Danh mục & Sản phẩm (SRS 3.3)             |   `4002`    | `http://localhost:4002/health` | `GET /api/v1/products`                               |
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

---

## 5. Cấu Hình & Kết Nối Redis (SRS 3.5 - SCRUM-32)

Dịch vụ Đấu giá (`auction-service`) sử dụng Redis làm In-Memory Cache và Khóa phân tán (Redlock) với cấu hình an toàn qua biến môi trường:

### 1. Bảng biến môi trường (Environment Variables):

- `REDIS_HOST`: Địa chỉ máy chủ Redis (mặc định: `localhost`).
- `REDIS_PORT`: Cổng kết nối Redis (mặc định: `6379`, hợp lệ từ 1 - 65535).
- `REDIS_PASSWORD`: Mật khẩu xác thực (môi trường local dev để trống, tuyệt đối không hardcode secret).
- `REDIS_TIMEOUT`: Thời gian timeout kết nối/lệnh (mặc định: `5000` ms).
- `REDIS_URL`: Chuỗi URL kết nối đầy đủ (ví dụ: `redis://localhost:6379`).

### 2. Kiểm tra sức khỏe kết nối (Health Check):

- Endpoint kiểm tra riêng cho Redis:
  ```powershell
  Invoke-RestMethod -Uri "http://localhost:4004/health/redis"
  ```
- Kết quả mong đợi khi kết nối thành công:
  ```json
  {
    "status": "UP",
    "host": "localhost",
    "port": 6379,
    "latencyMs": 2,
    "timestamp": "2026-10-13T16:45:00.000Z"
  }
  ```

### 3. Lệnh chạy Test Suite riêng cho Redis:

```bash
pnpm test:redis
```

Chi tiết cấu hình và cơ chế chẩn đoán lỗi xem tại: [`backend/auction-service/README.md`](./auction-service/README.md).
