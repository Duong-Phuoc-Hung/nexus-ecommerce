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

## User Auth/IAM API

Tài liệu này phản ánh route/controller/use-case hiện có trong User Service. Base URL mặc định dành cho FE là `http://localhost:4000/api/v1` (qua API Gateway). User Service mặc định nghe tại `http://localhost:4001`.

### Chạy Backend

Yêu cầu: Node.js `>=20`, pnpm `>=9`; PostgreSQL chỉ cần khi chạy repository Postgres.

Cài dependency từ thư mục gốc:

```powershell
pnpm install
```

Để chạy nhanh cho demo bằng InMemory (dữ liệu mất khi dừng User Service), mở hai terminal:

```powershell
# Terminal 1: User Service
$env:USE_IN_MEMORY_DB = 'true'
pnpm dev:user
```

```powershell
# Terminal 2: API Gateway
pnpm dev:gateway
```

Để chạy với Postgres, app cần database `nexus_user_db` và các migration của User Service. Có thể khởi động hạ tầng bằng `pnpm docker:dev:up`, sau đó `pnpm db:migrate`; lưu ý script migration chạy migration cho toàn bộ services trong repo. User Service mặc định dùng `DB_HOST=localhost`, `DB_PORT=5432`, `DB_USER=nexus_user`, `DB_NAME=nexus_user_db`; cấu hình mật khẩu bằng `DB_PASSWORD` trong môi trường local, không đưa secret vào tài liệu hoặc FE. Nếu `USE_IN_MEMORY_DB` không bằng `true`, User Service chọn `PostgresUserRepository`.

Các biến Auth liên quan:

| Biến                                                      | Tác dụng                                                                                                |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `USE_IN_MEMORY_DB`                                        | Đặt `true` để demo bằng `InMemoryUserRepository`; mặc định dùng Postgres.                               |
| `JWT_SECRET`                                              | Secret ký/xác minh JWT; production bắt buộc cấu hình giá trị riêng.                                     |
| `PORT` / `USER_SERVICE_PORT`                              | Port User Service; mặc định `4001`. `PORT` được ưu tiên nếu cả hai cùng có.                             |
| `GATEWAY_PORT`                                            | Port Gateway; mặc định `4000` (biến `PORT` được ưu tiên).                                               |
| `USER_SERVICE_URL`                                        | URL upstream User Service của Gateway; mặc định dùng localhost và port User Service.                    |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Thông tin kết nối Postgres; có default dev trong repository.                                            |
| `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`       | Tạo admin mẫu trong InMemory repository; password tối thiểu 12 ký tự. Không dùng để bootstrap Postgres. |

Health checks:

```powershell
Invoke-RestMethod http://localhost:4001/health
Invoke-RestMethod http://localhost:4000/health
```

### Danh sách API

Tất cả route dưới đây có thể gọi trực tiếp tới User Service bằng prefix `http://localhost:4001`, hoặc qua Gateway bằng base URL `http://localhost:4000/api/v1`. FE nên dùng Gateway. Request có body dùng `Content-Type: application/json`. Success/error response theo envelope `{ "success": boolean, "data"?: ..., "error"?: ... }`, trừ endpoint forgot-password trả message trực tiếp ở top level.

| Chức năng                | Method và URL                | JWT / permission            | Request                                                                               | Kết quả và trạng thái                                                                                                                                                                                                              |
| ------------------------ | ---------------------------- | --------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Đăng ký                  | `POST /auth/register`        | Không cần                   | `{ "email": "buyer@example.com", "fullName": "Demo Buyer", "password": "secret123" }` | `201` trả `data` gồm `id`, `email`, `fullName`, `role`, `status`, `reputationScore`, `createdAt`, `updatedAt`; role luôn là `BUYER`. `400` dữ liệu không hợp lệ; `409` email trùng. Password hiện tối thiểu 6 ký tự.               |
| Đăng nhập                | `POST /auth/login`           | Không cần                   | `{ "email": "buyer@example.com", "password": "secret123" }`                           | `200` trả `data.token` và `data.user` (id, email, fullName, role, status, reputationScore, permissions). `401` thiếu/sai thông tin, user không tồn tại hoặc inactive; `423` account bị khóa sau 5 lần sai liên tiếp trong 15 phút. |
| Đăng xuất                | `POST /auth/logout`          | Bearer JWT hợp lệ           | Không có body                                                                         | `200` trả success/message; `401` token thiếu/sai/hết hạn. Backend thêm token vào revoked-token store trong RAM; token bị từ chối ở request tiếp theo.                                                                              |
| Yêu cầu quên mật khẩu    | `POST /auth/forgot-password` | Không cần                   | `{ "email": "buyer@example.com" }`                                                    | `200` trả thông điệp chung để không tiết lộ email có tồn tại hay không. Trong môi trường không phải production, nếu account tồn tại thì response có thêm `resetToken`. Chưa gửi email thật.                                        |
| Đặt lại mật khẩu         | `POST /auth/reset-password`  | Reset token; không cần JWT  | `{ "token": "<reset-token>", "newPassword": "new-secret-123" }`                       | `200` đổi mật khẩu; `400` password ngắn hơn 12 ký tự hoặc token thiếu/sai/hết hạn/đã dùng. Reset token dùng một lần, TTL 15 phút.                                                                                                  |
| Xem role/permission tĩnh | `GET /auth/roles`            | Bearer JWT + `ROLE.VIEW`    | Không có body                                                                         | `200` trả `data` là danh sách role cùng permissions tĩnh; `401` thiếu/sai JWT; `403` không có quyền. Đây không phải CRUD role.                                                                                                     |
| Xem hồ sơ hiện tại       | `GET /users/profile`         | Bearer JWT + `PROFILE.VIEW` | Không có body                                                                         | `200` trả `data` gồm `id`, `email`, `fullName`, `role`, `status`, `reputationScore`, `createdAt`; `401` thiếu/sai JWT; `403` thiếu quyền.                                                                                          |
| Xem hồ sơ theo ID        | `GET /users/:id`             | Bearer JWT + `USER.VIEW`    | ID nằm trong path                                                                     | `200` trả profile; `401` thiếu/sai JWT; `403` thiếu quyền; `404` không tìm thấy user. Chưa có API list users.                                                                                                                      |
| Gán role cho user        | `PUT /users/:id/role`        | Bearer JWT + `ROLE.UPDATE`  | `{ "role": "SELLER" }` (`BUYER`, `SELLER`, `ADMIN`)                                   | `200` trả user ID và role mới; `401` thiếu/sai JWT; `403` thiếu quyền; `400` role không hợp lệ; `404` user không tồn tại.                                                                                                          |

Đăng ký không nhận `role`, phone hoặc CCCD trong request. Backend tự gán `BUYER`; Postgres repository hiện sinh phone/identify number nội bộ để thỏa schema. Không gửi permission trong request body. Role/permission lấy từ cấu hình tĩnh trong `authorization.ts`.

### JWT và quyền truy cập

1. Gọi `POST /auth/login`; lấy `data.token`.
2. Với route cần đăng nhập, gửi header `Authorization: Bearer <token>`.
3. Middleware xác minh chữ ký HS256, `exp` (8 giờ) và revoked-token store. `401` nghĩa là thiếu/sai/hết hạn/đã thu hồi token; `403` nghĩa là thiếu permission.
4. Logout gọi `POST /auth/logout` với cùng bearer token. Revocation có hiệu lực trong process đang chạy, nhưng store ở RAM nên không dùng chung giữa replicas và mất khi restart.

JWT được ký bằng `JWT_SECRET`. Ở production biến này là bắt buộc; fallback chỉ dành cho development. Payload JWT được ký, không mã hóa, nên không chứa password/secret.

### Vị trí xử lý và tích hợp FE

- Routes/middleware: `backend/user-service/src/interfaces/http/routes/UserRoutes.ts`, `backend/user-service/src/infrastructure/security/authorization.ts`.
- Controller/use cases: `backend/user-service/src/interfaces/http/controllers/UserController.ts`, `backend/user-service/src/application/use-cases/`.
- Hash/JWT: `backend/user-service/src/infrastructure/security/auth.ts`.
- Repositories: `backend/user-service/src/infrastructure/repositories/`.
- Gateway proxy: `backend/api-gateway/src/app.ts`, prefix `/api/v1/auth` và `/api/v1/users`.
- FE customer gọi Auth ở `frontend/web-customer/src/services/auth.api.ts`; form login/register/forgot nằm trong `frontend/web-customer/src/modules/user/auth/AuthPage.tsx`. `resetPassword()` có client method nhưng hiện chưa có form đặt lại mật khẩu. Admin API client ở `frontend/web-admin/src/services/admin-api.ts`.

### Trạng thái kiểm thử

- Auth use-case/middleware và Gateway proxy có test riêng; lệnh chạy:

  ```powershell
  pnpm exec tsx --test backend/user-service/src/application/use-cases/IAM.test.ts backend/user-service/src/infrastructure/security/authorization.test.ts backend/api-gateway/src/app.test.ts
  ```

- `pnpm test` hiện chạy architecture/infrastructure/Redis scripts; nó không tự chạy các file Auth test kể trên. Chạy `pnpm build` trước `pnpm test`, vì Redis tests load generated `dist` files.
- Các luồng register/login/profile/role-denial/logout/lockout đã được xác minh qua Gateway với InMemory. Postgres live flow và forgot/reset HTTP flow chưa được xác minh trong lần rà soát này.

### Giới hạn hiện tại

- Reset token và revoked-token store ở RAM; reset token chưa gửi email.
- Role/permission là mapping tĩnh; chưa có CRUD user/role/permission.
- Password mới dùng bcryptjs; code vẫn verify PBKDF2 legacy hash nhưng chưa tự rehash legacy hash sau login.
- Register password tối thiểu 6 ký tự, reset password tối thiểu 12 ký tự.
- Chưa có refresh token, endpoint change-password, API list users hoặc form reset-password hoàn chỉnh ở FE.

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
| **`api-gateway`**          | Cổng điều phối & Proxy                    |   `4000`    | `http://localhost:4000/health` | `GET /api/v1`                                        |
| **`user-service`**         | Người dùng & Định danh (SRS 3.1)          |   `4001`    | `http://localhost:4001/health` | `GET /api/v1/users/profile`                          |
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
Invoke-RestMethod -Uri "http://localhost:4001/health"
```

Kết quả trả về:

```json
{
  "status": "UP",
  "service": "user-service",
  "boundedContext": "User & Authentication (SRS 3.1)",
  "port": 4001,
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
