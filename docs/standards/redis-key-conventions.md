# 📑 QUY ƯỚC ĐẶT TÊN REDIS KEY & QUẢN LÝ TTL THEO MODULE (SCRUM-54)

> **Dự án:** Project Nexus - Microservices E-Commerce & Real-Time Auction Platform  
> **Ticket Jira:** [SCRUM-54] `[BE] Quy ước Redis key prefix theo module và cập nhật README`  
> **Mục tiêu:** Tránh xung đột (collision) key giữa các Bounded Contexts dùng chung 1 Redis cluster (Port 6379), chuẩn hóa cấu trúc key và thời gian sống (TTL) cho toàn bộ lập trình viên Backend và Frontend.  
> **Trạng thái:** ✅ **BAN HÀNH CHÍNH THỨC (OFFICIAL STANDARD)**

---

## 1. Nguyên Tắc Thiết Kế (Core Principles)

Toàn bộ các dịch vụ và ứng dụng trong Project Nexus khi thao tác với Redis **bắt buộc tuân thủ 5 nguyên tắc sau**:

1. **Namespace Bắt Buộc (No Bare Keys):**  
   Tuyệt đối **KHÔNG** sử dụng bare key (key không có namespace module, ví dụ: `my_key`, `test123`, `user_token`). Mọi key phải có tiền tố định danh module sở hữu.
2. **Ký Tự Phân Cách Chuẩn (Delimiter):**  
   Sử dụng dấu hai chấm (`:`) làm phân cách phân cấp (ví dụ: `auction:lock:auc_123`).
3. **Định Dạng Chữ Thường (Lowercase & Snake_case):**  
   Toàn bộ tiền tố và mục đích phải viết thường hoàn toàn. Nếu tên định danh phụ gồm nhiều từ, dùng dấu gạch dưới `_` (ví dụ: `rate_limit`, `stock_lock`, `highest_bid`).
4. **Bắt Buộc Thiết Lập TTL (Explicit Time-To-Live):**  
   Mọi key tạo mới trên Redis (ngoại trừ các bộ dữ liệu cấu hình hệ thống bán vĩnh viễn) **phải có TTL rõ ràng** để ngăn chặn rò rỉ bộ nhớ RAM (OOM - Out Of Memory).
5. **Truy Cập Qua Registry / Constants:**  
   Lập trình viên không tự gõ chuỗi tự do (string literal) mà phải sử dụng hằng số từ `RedisKeyPrefix` và hàm `buildRedisKey()` để đảm bảo an toàn kiểu (Type-Safe).

---

## 2. Cấu Trúc Khung Redis Key (Standard Key Pattern)

$$\boxed{\text{<module>}:\text{<purpose>}:\text{<primary\_identifier>}[:\text{<sub\_identifier>}]}$$

Trong đó:

- `<module>`: Tên Bounded Context sở hữu (`auth`, `auction`, `cart`, `catalog`, `notification`, `fulfillment`, `nexus:test`).
- `<purpose>`: Mục đích sử dụng cụ thể (`lock`, `blacklist`, `highest_bid`, `guest`, `product`, `rate_limit`).
- `<primary_identifier>`: ID của thực thể nghiệp vụ (`auction_id`, `user_id`, `product_id`, `token_hash`).
- `[:<sub_identifier>]` _(tùy chọn)_: Thuộc tính con hoặc kênh phụ (ví dụ: `sms`, `email`, `jti`).

---

## 3. Danh Mục Tra Cứu Redis Key Prefix Toàn Hệ Thống

|  STT   | Module / Dịch vụ       | Prefix Chuẩn                | Cấu trúc Key Chi Tiết                         | Kiểu dữ liệu Redis |            TTL Dự kiến             | Mục đích & Nghiệp vụ                                   |
| :----: | :--------------------- | :-------------------------- | :-------------------------------------------- | :----------------: | :--------------------------------: | :----------------------------------------------------- |
| **1**  | **Auth / IAM**         | `auth:blacklist:`           | `auth:blacklist:{token_hash_or_jti}`          |       String       |  $24\text{h}$ ($86,400\text{s}$)   | Danh sách JWT Token đã bị thu hồi / logout             |
| **2**  | **Auth / IAM**         | `auth:lockout:`             | `auth:lockout:{email_or_user_id}`             |  String (Counter)  |    $15\text{m}$ ($900\text{s}$)    | Đếm số lần login sai (khóa sau 5 lần)                  |
| **3**  | **Auth / IAM**         | `auth:password_reset:`      | `auth:password_reset:{reset_token}`           |       String       |    $15\text{m}$ ($900\text{s}$)    | Mã token xác thực đổi mật khẩu 1 lần                   |
| **4**  | **Auth / IAM**         | `auth:session:`             | `auth:session:{user_id}`                      |    Set / String    |  $7\text{d}$ ($604,800\text{s}$)   | Quản lý danh sách các session đang online              |
| **5**  | **Auction (Đấu giá)**  | `auction:lock:`             | `auction:lock:{auction_id}`                   |       String       | $3,000\text{ms} - 5,000\text{ms}$  | Distributed Lock chống race condition khi đặt giá thầu |
| **6**  | **Auction (Đấu giá)**  | `auction:highest_bid:`      | `auction:highest_bid:{auction_id}`            |    Hash / JSON     |   Thời gian phiên $+ 1\text{h}$    | Cache giá thầu cao nhất phục vụ truy vấn tốc độ cao    |
| **7**  | **Auction (Đấu giá)**  | `auction:bids_zset:`        | `auction:bids_zset:{auction_id}`              | Sorted Set (ZSET)  |   Thời gian phiên $+ 24\text{h}$   | Lưu bảng xếp hạng thầu với `Score = Giá thầu`          |
| **8**  | **Auction (Đấu giá)**  | `auction:stream:`           | `auction:stream:{auction_id}`                 |    Redis Stream    |            $2\text{h}$             | Luồng sự kiện thầu realtime cho WebSocket              |
| **9**  | **Auction (Đấu giá)**  | `auction:viewers:`          | `auction:viewers:{auction_id}`                | HyperLogLog / Set  |            $2\text{h}$             | Đếm số lượng người xem trực tiếp phòng đấu giá         |
| **10** | **Commerce (Cart)**    | `cart:guest:`               | `cart:guest:{guest_session_id}`               |    Hash / JSON     |  $7\text{d}$ ($604,800\text{s}$)   | Giỏ hàng tạm thời cho khách chưa đăng nhập             |
| **11** | **Commerce (Cart)**    | `cart:user:`                | `cart:user:{user_id}`                         |    Hash / JSON     | $30\text{d}$ ($2,592,000\text{s}$) | Giỏ hàng người dùng đã đăng nhập                       |
| **12** | **Commerce (Cart)**    | `cart:checkout_lock:`       | `cart:checkout_lock:{cart_id}`                |       String       |          $5,000\text{ms}$          | Khóa chống submit thanh toán trùng lặp                 |
| **13** | **Catalog (Sản phẩm)** | `catalog:product:`          | `catalog:product:{product_id}`                |   String (JSON)    |    $10\text{m}$ ($600\text{s}$)    | Cache thông tin chi tiết sản phẩm                      |
| **14** | **Catalog (Sản phẩm)** | `catalog:categories:`       | `catalog:categories:all`                      |   String (JSON)    |   $1\text{h}$ ($3,600\text{s}$)    | Cache cây danh mục sản phẩm                            |
| **15** | **Catalog (Sản phẩm)** | `catalog:stock_lock:`       | `catalog:stock_lock:{sku_id}`                 |       String       |          $5,000\text{ms}$          | Khóa giữ chỗ số lượng tồn kho khi thanh toán           |
| **16** | **Notification**       | `notification:rate_limit:`  | `notification:rate_limit:{user_id}:{channel}` |  String (Counter)  |            $60\text{s}$            | Giới hạn tần suất gửi tin OTP / Email / SMS            |
| **17** | **Notification**       | `notification:idempotency:` | `notification:idempotency:{event_id}`         |       String       |  $24\text{h}$ ($86,400\text{s}$)   | Chống gửi thông báo lặp lại từ Message Broker          |
| **18** | **Fulfillment**        | `fulfillment:lock:`         | `fulfillment:lock:{shipment_id}`              |       String       |         $10,000\text{ms}$          | Khóa điều phối đơn giao hàng                           |
| **19** | **System & Health**    | `system:health:`            | `system:health:{service_name}`                |   String (JSON)    |            $30\text{s}$            | Cache nhịp tim kiểm tra sức khỏe dịch vụ               |
| **20** | **Testing & QA**       | `nexus:test:`               | `nexus:test:{module}:{test_id}`               |        Any         |            $60\text{s}$            | Namespace cô lập dành cho kịch bản QA tự động          |

---

## 4. Hướng Dẫn Sử Dụng Trong Mã Nguồn (Code Implementation)

### 4.1. Khởi tạo Key an toàn bằng `buildRedisKey`:

```typescript
import {
  RedisKeyPrefix,
  RedisTTL,
  buildRedisKey,
  assertValidRedisKey,
} from './infrastructure/redis';

// 1. Tạo distributed lock cho phiên đấu giá
const auctionLockKey = buildRedisKey(RedisKeyPrefix.AUCTION_LOCK, 'auc_100293');
// -> Kết quả: "auction:lock:auc_100293"

// 2. Tạo key Rate Limiter cho Notification với 2 định danh
const rateLimitKey = buildRedisKey(RedisKeyPrefix.NOTIFICATION_RATE_LIMIT, 'usr_01hqz789', 'sms');
// -> Kết quả: "notification:rate_limit:usr_01hqz789:sms"

// 3. Kiểm duyệt an toàn (ném lỗi nếu là bare key)
assertValidRedisKey(auctionLockKey); // OK
```

### 4.2. Thao tác với Redis Client kèm TTL chuẩn:

```typescript
import { getRedisClient } from './infrastructure/redis/RedisClient';
import { RedisKeyPrefix, RedisTTL, buildRedisKey } from './infrastructure/redis';

const redis = getRedisClient();

// Ghi giá thầu cao nhất với TTL chuẩn
const highestBidKey = buildRedisKey(RedisKeyPrefix.AUCTION_HIGHEST_BID, 'auc_5500');
await redis.set(
  highestBidKey,
  JSON.stringify({ amount: 15000000, bidderId: 'usr_buyer01' }),
  'EX',
  3600,
);

// Thu hồi token (Blacklist) với TTL 24 giờ
const blacklistKey = buildRedisKey(RedisKeyPrefix.AUTH_BLACKLIST, 'jti_xyz8899');
await redis.set(blacklistKey, 'revoked', 'EX', RedisTTL.AUTH_BLACKLIST_SECONDS);
```

---

## 5. Phòng Tránh Các Lỗi Thường Gặp (Anti-Patterns)

| ❌ Hành vi vi phạm (Anti-Pattern)                  | Hậu quả                                                             | ✅ Cách khắc phục chuẩn                                     |
| :------------------------------------------------- | :------------------------------------------------------------------ | :---------------------------------------------------------- |
| `redis.set('token_123', ...)`                      | **Bare key:** Đè dữ liệu module khác, không thể phân biệt nguồn gốc | `buildRedisKey(RedisKeyPrefix.AUTH_BLACKLIST, 'token_123')` |
| `redis.set('cart:guest:1', data)` _(không có TTL)_ | **OOM Leak:** Dữ liệu vĩnh viễn không bao giờ xóa làm đầy RAM Redis | Luôn truyền kèm `'EX', RedisTTL.CART_GUEST_SECONDS`         |
| `redis.set('Auction:Lock:123', ...)`               | **Sai case:** Redis phân biệt hoa thường, gây miss cache            | Luôn dùng chữ thường qua `RedisKeyPrefix.AUCTION_LOCK`      |
| `redis.set('auction:lock:my item id', ...)`        | **Chứa khoảng trắng:** Lỗi phân tích cú pháp CLI và clustering      | Dùng `my_item_id` hoặc `my-item-id`                         |

---

## 6. Kiểm Thử & Xác Nhận Quy Ước Tự Động (Automated Compliance Test)

Dự án cung cấp bộ kiểm thử tự động kiểm tra cú pháp, phát hiện xung đột và chặn bare key:

```bash
pnpm test:redis:prefix
```

Bộ kiểm thử đảm bảo:

- 100% prefix kết thúc bằng dấu `:`.
- Không có 2 prefix nào trùng lặp hoặc xung đột namespace.
- `assertValidRedisKey()` phát hiện và chặn đứng mọi bare key.
