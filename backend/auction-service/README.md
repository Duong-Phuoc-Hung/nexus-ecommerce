# 🔴 Auction Service - Redis Configuration & Real-Time Health Engine (SCRUM-32 / SCRUM-41)

> **Bounded Context:** SRS Section 3.5 (Real-Time Auction & Bidding)  
> **Hiệu năng cam kết (SLA):** Bidding SLA $\le 300\text{ms}$ thông qua Redis Distributed Lock (Redlock) và In-Memory Caching.  
> **Thư viện kết nối:** `ioredis` (Strict Mode TypeScript)

---

## 1. Cấu Hình Biến Môi Trường (Environment Variables)

Dịch vụ đọc cấu hình kết nối Redis an toàn từ biến môi trường (qua file `.env`, xem mẫu tại [`.env.example`](./.env.example)):

| Tên biến                | Kiểu dữ liệu |  Mặc định   | Bắt buộc | Mô tả                                                               |
| :---------------------- | :----------: | :---------: | :------: | :------------------------------------------------------------------ |
| `REDIS_HOST`            |   `string`   | `localhost` |  Không   | Địa chỉ máy chủ Redis (hoặc tên service Docker `nexus-redis`)       |
| `REDIS_PORT`            |   `number`   |   `6379`    |  Không   | Cổng kết nối Redis (hợp lệ trong khoảng 1 - 65535)                  |
| `REDIS_PASSWORD`        |   `string`   |  _(rỗng)_   |  Không   | Mật khẩu xác thực Redis (môi trường dev để trống)                   |
| `REDIS_TIMEOUT`         |   `number`   |   `5000`    |  Không   | Thời gian timeout kết nối và lệnh thông thường (mili-giây)          |
| `REDIS_PING_TIMEOUT_MS` |   `number`   |   `1500`    |  Không   | Giới hạn thời gian PING kiểm tra sức khỏe để chống treo (mili-giây) |
| `REDIS_URL`             |   `string`   | _(tự tạo)_  |  Không   | Chuỗi URL kết nối đầy đủ (ví dụ: `redis://localhost:6379`)          |

> 🔒 **Nguyên tắc bảo mật:** Tuyệt đối không hardcode mật khẩu hay port trong mã nguồn. Toàn bộ thông số được đọc thông qua hàm `loadRedisConfigFromEnv()`.

---

## 2. Cơ Chế Chẩn Đoán Lỗi & Giới Hạn Thời Gian (SCRUM-41)

Hệ thống được trang bị lớp lỗi chuyên biệt `RedisConfigError` và cơ chế Timeout Wrapper:

- **Sai định dạng cổng:** Báo lỗi rõ ràng nếu `REDIS_PORT` không phải là số hoặc nằm ngoài khoảng `1 - 65535`.
- **Sai timeout:** Báo lỗi nếu `REDIS_TIMEOUT` hoặc `REDIS_PING_TIMEOUT_MS` là số âm hoặc bằng 0.
- **Sai URL:** Báo lỗi định dạng nếu `REDIS_URL` không có giao thức `redis://` hoặc `rediss://`.
- **Chống treo Endpoint (Anti-Hanging Timeout Wrapper):** Bọc lệnh `PING` bằng `Promise.race` và bộ đếm thời gian nghiêm ngặt (mặc định `1500ms`). Khi Redis bị deadlock hoặc phân mảnh mạng (network partition), health check sẽ tự động reject và trả về trạng thái `DOWN` thay vì treo socket và làm cạn kiệt connection pool.
- **Log chẩn đoán trực quan:** In log cảnh báo/lỗi `[Redis Health Check DOWN]` kèm lý do cụ thể khi không kết nối được hoặc timeout.

---

## 3. Kiến Trúc & Cách Sử Dụng Trong Mã Nguồn

Cấu trúc module đặt tại `src/infrastructure/redis/`:

```text
src/infrastructure/redis/
├── RedisConfig.ts    # Thẩm định & phân tích biến môi trường, định nghĩa RedisConfigError
└── RedisClient.ts    # Singleton Client Factory, Bounded Ping Health Check, Graceful Shutdown
```

### Sử dụng Redis Client:

```typescript
import { getRedisClient, checkRedisHealth } from './infrastructure/redis/RedisClient';

// Lấy client singleton
const redis = getRedisClient();
await redis.set('auction:highest_bid:auc_01', '5000000', 'EX', 3600);

// Kiểm tra sức khỏe kết nối (kèm bounded timeout 1500ms)
const health = await checkRedisHealth();
console.log(health); // { status: 'UP', latencyMs: 2, ... }
```

---

## 4. Hệ Thống HTTP Health Endpoints (SCRUM-41)

Nhằm ngăn chặn **"Healthy Giả" (False Positive)** trên các Health Dashboard (Kubernetes, AWS ALB, Prometheus, Consul), hệ thống cung cấp 3 endpoints chuyên biệt:

### 4.1. `GET /health` (Aggregated Health Endpoint)

Endpoint tổng quan phản ánh chính xác trạng thái sống còn của cả tiến trình ứng dụng lẫn Redis:

- **Khi Redis hoạt động bình thường:** Trả về HTTP `200 OK`
  ```json
  {
    "status": "UP",
    "service": "auction-service",
    "boundedContext": "Real-Time Auction & Bidding (SRS 3.5)",
    "port": 4004,
    "timestamp": "2026-10-14T01:30:00.000Z",
    "components": {
      "redis": {
        "status": "UP",
        "host": "localhost",
        "port": 6379,
        "latencyMs": 2,
        "timestamp": "2026-10-14T01:30:00.000Z"
      }
    }
  }
  ```
- **Khi Redis ngừng hoạt động hoặc timeout:** Trả về HTTP `503 Service Unavailable`
  ```json
  {
    "status": "DOWN",
    "service": "auction-service",
    "boundedContext": "Real-Time Auction & Bidding (SRS 3.5)",
    "port": 4004,
    "timestamp": "2026-10-14T01:30:00.000Z",
    "components": {
      "redis": {
        "status": "DOWN",
        "host": "localhost",
        "port": 6379,
        "error": "Không thể kết nối hoặc ping Redis (localhost:6379): Redis ping timed out sau 1500ms",
        "timestamp": "2026-10-14T01:30:00.000Z"
      }
    }
  }
  ```

### 4.2. `GET /health/redis` (Component Health Indicator)

- Dành riêng cho hệ thống giám sát cơ sở hạ tầng (Infrastructure Monitoring).
- Trả về HTTP `200 OK` khi Redis `UP` và HTTP `503 Service Unavailable` khi Redis `DOWN`.

### 4.3. `GET /health/liveness` (K8s Liveness Probe)

- Kiểm tra độc lập tiến trình HTTP Server đang chạy (không phụ thuộc external deps như Redis).
- Luôn trả về HTTP `200 OK` để tránh trường hợp Kubernetes restart loop pod liên tục khi Redis bảo trì.

---

## 5. Hướng Dẫn Kiểm Tra Thủ Công (Manual Verification)

### Bước 1: Khởi động dịch vụ

```bash
# Khởi động container Redis
docker compose -f devops/docker-compose.dev.yml up -d nexus-redis

# Khởi động auction-service
pnpm dev:auction
```

### Bước 2: Kiểm tra khi Redis đang chạy (UP)

Sử dụng `curl`:

```bash
curl -i http://localhost:4004/health
```

Hoặc PowerShell:

```powershell
Invoke-RestMethod -Uri http://localhost:4004/health
```

**Kết quả mong đợi:** HTTP 200, `status = "UP"`, `components.redis.status = "UP"`, `latencyMs` hiển thị độ trễ mili-giây.

### Bước 3: Kiểm tra khi Redis bị dừng (DOWN)

Dừng container Redis để mô phỏng sự cố:

```bash
docker compose -f devops/docker-compose.dev.yml stop nexus-redis
```

Gửi lại request kiểm tra:

```bash
curl -i http://localhost:4004/health
```

**Kết quả mong đợi:**

- HTTP Status Code: `503 Service Unavailable`
- Response Body: `status = "DOWN"`, `components.redis.status = "DOWN"` kèm thông báo lỗi rõ ràng.
- Application Log: In log `[Redis Health Check DOWN] Không thể kết nối hoặc ping Redis (localhost:6379)...`

### Bước 4: Khôi phục container Redis

```bash
docker compose -f devops/docker-compose.dev.yml start nexus-redis
```

Gửi lại request kiểm tra: `GET http://localhost:4004/health` sẽ tự động chuyển về HTTP 200 `UP`.

---

## 6. Kiểm Thử Tự Động & QA Verification (SCRUM-32, SCRUM-41, SCRUM-43)

### Chạy kịch bản kiểm thử QA tự động (SCRUM-43):

Kịch bản end-to-end kiểm tra toàn diện 5 phases: cấu hình, đọc/ghi CRUD với TTL, dọn dẹp key (`DEL`), cô lập namespace `nexus:test:qa_scrum43:*`, health check khi Redis BẬT (HTTP 200) và khi Redis TẮT (HTTP 503, chống healthy giả):

```bash
pnpm qa:redis
```

### Chạy test suite riêng cho Redis (Bao gồm đầy đủ 6 suites):

```bash
pnpm test:redis
```

### Chạy toàn bộ test suites của dự án (Architecture + Infrastructure + Redis):

```bash
pnpm test
```

> 📄 **Xem báo cáo nghiệm thu chi tiết:** [`docs/qa/SCRUM-43-redis-read-write-health-down-report.md`](../../docs/qa/SCRUM-43-redis-read-write-health-down-report.md)

---

## 7. Quy Ước Redis Key Prefix & Quản Lý TTL Theo Module (SCRUM-54)

Nhằm tránh **xung đột key (Key Collision)** giữa các Bounded Contexts dùng chung cụm Redis (Port 6379), hệ thống chuẩn hóa cấu trúc key theo nguyên tắc:

$$\text{<module>}:\text{<purpose>}:\text{<identifier>}[:\text{<sub\_identifier>}]$$

### 7.1. Bảng Tra Cứu Tiền Tố (Prefix Registry) & TTL Dự Kiến

| Module / Bounded Context | Tiền tố chuẩn (`RedisKeyPrefix`) | Cấu trúc Key                                  | Kiểu dữ liệu  |     TTL Mặc định (`RedisTTL`)     | Mục đích sử dụng                                  |
| :----------------------- | :------------------------------- | :-------------------------------------------- | :-----------: | :-------------------------------: | :------------------------------------------------ |
| **Auth / IAM**           | `auth:blacklist:`                | `auth:blacklist:{token_jti_or_hash}`          |    String     |      $86,400\text{s}$ (24h)       | Danh sách JWT Token đã logout / thu hồi           |
| **Auth / IAM**           | `auth:lockout:`                  | `auth:lockout:{email_or_user_id}`             |    Counter    |        $900\text{s}$ (15m)        | Khóa tạm thời sau 5 lần nhập sai mật khẩu         |
| **Auth / IAM**           | `auth:password_reset:`           | `auth:password_reset:{reset_token}`           |    String     |        $900\text{s}$ (15m)        | Token đặt lại mật khẩu một lần                    |
| **Auction**              | `auction:lock:`                  | `auction:lock:{auction_id}`                   |    String     | $3,000\text{ms} - 5,000\text{ms}$ | Distributed Lock chống race condition khi đặt giá |
| **Auction**              | `auction:highest_bid:`           | `auction:highest_bid:{auction_id}`            |  Hash / JSON  |   Thời gian phiên $+ 1\text{h}$   | Cache giá thầu cao nhất truy vấn nhanh            |
| **Auction**              | `auction:bids_zset:`             | `auction:bids_zset:{auction_id}`              |     ZSET      |  Thời gian phiên $+ 24\text{h}$   | Sorted Set lịch sử giá thầu theo Score            |
| **Auction**              | `auction:stream:`                | `auction:stream:{auction_id}`                 |    Stream     |            $2\text{h}$            | Redis Stream sự kiện đấu giá realtime             |
| **Commerce (Cart)**      | `cart:guest:`                    | `cart:guest:{guest_session_id}`               |  Hash / JSON  |      $604,800\text{s}$ (7d)       | Giỏ hàng tạm thời cho khách chưa đăng nhập        |
| **Commerce (Cart)**      | `cart:user:`                     | `cart:user:{user_id}`                         |  Hash / JSON  |     $2,592,000\text{s}$ (30d)     | Giỏ hàng người dùng đã đăng nhập                  |
| **Catalog**              | `catalog:product:`               | `catalog:product:{product_id}`                | String (JSON) |        $600\text{s}$ (10m)        | Cache thông tin chi tiết sản phẩm                 |
| **Catalog**              | `catalog:categories:`            | `catalog:categories:all`                      | String (JSON) |       $3,600\text{s}$ (1h)        | Cache cây danh mục sản phẩm                       |
| **Catalog**              | `catalog:stock_lock:`            | `catalog:stock_lock:{sku_id}`                 |    String     |         $5,000\text{ms}$          | Khóa tạm giữ tồn kho khi checkout                 |
| **Notification**         | `notification:rate_limit:`       | `notification:rate_limit:{user_id}:{channel}` |    Counter    |         $60\text{s}$ (1m)         | Giới hạn tần suất gửi OTP / SMS / Email           |
| **Fulfillment**          | `fulfillment:lock:`              | `fulfillment:lock:{shipment_id}`              |    String     |         $10,000\text{ms}$         | Khóa điều phối đơn giao hàng                      |
| **Testing & QA**         | `nexus:test:`                    | `nexus:test:{module}:{test_id}`               |      Any      |           $60\text{s}$            | Namespace cô lập kịch bản test tự động            |

### 7.2. Hướng Dẫn Sử Dụng Trong Mã Nguồn

```typescript
import {
  RedisKeyPrefix,
  RedisTTL,
  buildRedisKey,
  assertValidRedisKey,
} from './infrastructure/redis';

// 1. Tạo key phân tán an toàn (Type-Safe, tự động kiểm tra khoảng trắng và rỗng)
const lockKey = buildRedisKey(RedisKeyPrefix.AUCTION_LOCK, 'auc_100293');
// -> Kết quả: "auction:lock:auc_100293"

// 2. Chặn bare key không có namespace module
assertValidRedisKey(lockKey); // Hợp lệ!
// assertValidRedisKey('bare_key_danger'); // Ném lỗi [RedisKeyViolationError] ngay lập tức!
```

> 📖 **Xem tài liệu chi tiết quy chuẩn toàn nền tảng:** [`docs/standards/redis-key-conventions.md`](../../docs/standards/redis-key-conventions.md)
