# 📬 Notification & System Audit Service (SRS 3.2 & SCRUM-10)

> **Bounded Context:** Dịch vụ Quản lý Thông báo (Email, SMS, Push FCM) & Nhật ký Kiểm toán Sự kiện Hệ thống (Audit & Event Log).  
> **Cổng dịch vụ:** `4006` (REST API).  
> **Cơ sở dữ liệu:** PostgreSQL `nexus_notification_db` (Cổng `5437` qua Docker Compose).  
> **Tài liệu tham chiếu:** SRS Section 3.2, Section 3.2.1, Section 2.7 & [ADR-002](../../docs/adr/ADR-002-event-log-storage-and-audit.md).

---

## 1. Quyền Sở Hữu & Bảng Dữ Liệu `event_log` (SCRUM-55, SCRUM-56)

Theo nguyên tắc **Database-per-Service** (SRS 4.1), `notification-service` là đơn vị duy nhất sở hữu và quản lý bảng nhật ký kiểm toán sự kiện toàn hệ thống:

- **Tên bảng:** `notification_event_log`
- **File migration:** [`prisma/V1__init_event_log_schema.sql`](prisma/V1__init_event_log_schema.sql)
- **Prisma Schema:** [`prisma/schema.prisma`](prisma/schema.prisma)

### Cấu trúc cột chính (Bất biến - Append Only):

| Tên Cột          | Kiểu Dữ Liệu   | Ràng Buộc           | Ý Nghĩa                                            |
| :--------------- | :------------- | :------------------ | :------------------------------------------------- |
| `id`             | `BIGSERIAL`    | `PRIMARY KEY`       | Khóa chính tự tăng                                 |
| `event_id`       | `VARCHAR(64)`  | `UNIQUE NOT NULL`   | Định danh duy nhất từ `DomainEvent.eventId`        |
| `type`           | `VARCHAR(100)` | `NOT NULL`          | Loại sự kiện (VD: `user.registered`, `order.paid`) |
| `source_service` | `VARCHAR(50)`  | `NOT NULL`          | Service phát ra sự kiện (VD: `user-service`)       |
| `payload`        | `JSONB`        | `NOT NULL`          | Dữ liệu chi tiết sự kiện được đóng băng bất biến   |
| `status`         | `VARCHAR(20)`  | `DEFAULT 'SUCCESS'` | Trạng thái xử lý (`SUCCESS`, `FAILED`, `RETRYING`) |
| `created_at`     | `TIMESTAMPTZ`  | `DEFAULT now()`     | Thời điểm ghi nhận (cấm update/delete)             |

---

## 2. Luồng Tự Động Ghi Log (SCRUM-57 & SCRUM-58)

Các module nghiệp vụ (`user-service`, `catalog-service`, `auction-service`,...) **hoàn toàn không cần gọi thủ công** repository của `notification-service`. Luồng ghi nhận diễn ra hoàn toàn tự động theo mô hình Observer:

```text
[ Business Module (vd: User/Auction) ]
                │
                ▼ publish(event)
     [ IEventPublisher (Port) ]
                │
                ▼ wildcard '*' trigger
 [ GlobalEventAuditSubscriber (Listener) ]
                │
                ▼ recordEvent()
      [ EventLogService ] ──(Chống trùng Idempotent)──┐
                │                                    ▼
                ▼ save()                     [ Đã tồn tại: Bỏ qua ]
  [ notification_event_log (DB) ]
```

---

## 3. Quy Ước Xử Lý Lỗi & Idempotency (SCRUM-59 & ADR-002)

1. **Chống Ghi Trùng (Idempotency):**
   - Nếu nhận lại cùng 1 `event_id` (do mạng retry hoặc broker gửi lặp), `EventLogService` sẽ tự động phát hiện và bỏ qua (`[Idempotent Ignore]`), không sinh bản ghi thừa và không ném lỗi gián đoạn hệ thống.
2. **Không Nuốt Lỗi (No Silent Errors):**
   - Mọi lỗi kết nối database hoặc parse JSON đều được ghi log chẩn đoán chi tiết.
3. **Cô Lập Lỗi Với Luồng Nghiệp Vụ Chính (Fail-Safe Isolation):**
   - Trong Phase 0, lỗi ghi nhật ký ngầm không được làm sập luồng phát sự kiện chính của người dùng, đảm bảo trải nghiệm mua sắm và đấu giá luôn thông suốt.

---

## 4. API Truy Vấn Nhật Ký Kiểm Toán (SRS 2.7 Privileges)

- **`GET /api/v1/event-logs`**: Lấy danh sách sự kiện gần nhất (`EVENT_LOG.VIEW`).
- **`GET /api/v1/event-logs/:eventId`**: Xem chi tiết 1 sự kiện (`EVENT_LOG.VIEW_DETAIL`).
- **`GET /health`**: Kiểm tra trạng thái hoạt động của Notification Service.

---

## 5. Hướng Dẫn Kiểm Thử & Vận Hành

```bash
# 1. Chạy Migration Database (khi chạy Docker)
node scripts/migrate-all-databases.js

# 2. Chạy bộ Integration Test độc lập cho Event Log (SCRUM-60)
node --test scripts/test-event-log-integration.test.js

# 3. Chạy toàn bộ Test Suites của hệ thống
pnpm test
```
