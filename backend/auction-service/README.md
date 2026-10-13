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

## 6. Kiểm Thử Tự Động (Automated Testing)

### Chạy test suite riêng cho Redis (Bao gồm SCRUM-32 và SCRUM-41):

```bash
pnpm test:redis
```

### Chạy toàn bộ test suites của dự án (Architecture + Infrastructure + Redis):

```bash
pnpm test
```
