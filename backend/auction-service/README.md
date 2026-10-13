# 🔴 Auction Service - Redis Configuration & Real-Time Engine (SCRUM-32)

> **Bounded Context:** SRS Section 3.5 (Real-Time Auction & Bidding)  
> **Hiệu năng cam kết (SLA):** Bidding SLA $\le 300\text{ms}$ thông qua Redis Distributed Lock (Redlock) và In-Memory Caching.  
> **Thư viện kết nối:** `ioredis` (Strict Mode TypeScript)

---

## 1. Cấu Hình Biến Môi Trường (Environment Variables)

Dịch vụ đọc cấu hình kết nối Redis an toàn từ biến môi trường (qua file `.env`, xem mẫu tại [`.env.example`](./.env.example)):

| Tên biến         | Kiểu dữ liệu |  Mặc định   | Bắt buộc | Mô tả                                                         |
| :--------------- | :----------: | :---------: | :------: | :------------------------------------------------------------ |
| `REDIS_HOST`     |   `string`   | `localhost` |  Không   | Địa chỉ máy chủ Redis (hoặc tên service Docker `nexus-redis`) |
| `REDIS_PORT`     |   `number`   |   `6379`    |  Không   | Cổng kết nối Redis (hợp lệ trong khoảng 1 - 65535)            |
| `REDIS_PASSWORD` |   `string`   |  _(rỗng)_   |  Không   | Mật khẩu xác thực Redis (môi trường dev để trống)             |
| `REDIS_TIMEOUT`  |   `number`   |   `5000`    |  Không   | Thời gian timeout kết nối và lệnh (mili-giây)                 |
| `REDIS_URL`      |   `string`   | _(tự tạo)_  |  Không   | Chuỗi URL kết nối đầy đủ (ví dụ: `redis://localhost:6379`)    |

> 🔒 **Nguyên tắc bảo mật:** Tuyệt đối không hardcode mật khẩu hay port trong mã nguồn. Toàn bộ thông số được đọc thông qua hàm `loadRedisConfigFromEnv()`.

---

## 2. Cơ Chế Chẩn Đoán Lỗi (Error Diagnostics)

Hệ thống được trang bị lớp lỗi chuyên biệt `RedisConfigError` nhằm bắt sớm các sai sót cấu hình trước khi ứng dụng khởi chạy:

- **Sai định dạng cổng:** Báo lỗi rõ ràng nếu `REDIS_PORT` không phải là số hoặc nằm ngoài khoảng `1 - 65535`.
- **Sai timeout:** Báo lỗi nếu `REDIS_TIMEOUT` là số âm hoặc bằng 0.
- **Sai URL:** Báo lỗi định dạng nếu `REDIS_URL` không có giao thức `redis://` hoặc `rediss://`.
- **Mất kết nối:** Tự động retry với thuật toán exponential backoff tối đa 5 lần và in log chẩn đoán `[Redis Diagnostic Error]` mà không làm crash ứng dụng đột ngột.

---

## 3. Kiến Trúc & Cách Sử Dụng Trong Mã Nguồn

Cấu trúc module đặt tại `src/infrastructure/redis/`:

```text
src/infrastructure/redis/
├── RedisConfig.ts    # Thẩm định & phân tích biến môi trường, định nghĩa RedisConfigError
└── RedisClient.ts    # Singleton Client Factory, Health Check, Graceful Shutdown
```

### Sử dụng Redis Client:

```typescript
import { getRedisClient, checkRedisHealth } from './infrastructure/redis/RedisClient';

// Lấy client singleton
const redis = getRedisClient();
await redis.set('auction:highest_bid:auc_01', '5000000', 'EX', 3600);

// Kiểm tra sức khỏe kết nối
const health = await checkRedisHealth();
console.log(health); // { status: 'UP', latencyMs: 2, ... }
```

---

## 4. Kiểm Thử (Testing & Verification)

### Chạy test suite riêng cho Redis:

```bash
pnpm test:redis
```

### Chạy toàn bộ test suites (Architecture + Infrastructure + Redis):

```bash
pnpm test
```

### Kiểm tra qua HTTP Health Endpoint:

Sau khi khởi chạy service (`pnpm dev:auction`), truy cập:

- `GET http://localhost:4004/health` -> Trả về HTTP 200 kèm `redis.status = "UP"`.
- `GET http://localhost:4004/health/redis` -> Trả về chi tiết độ trễ `latencyMs` và trạng thái kết nối.
