# 🏛️ ADR-002: Kiến Trúc Lưu Trữ Event Log & Cơ Chế Kiểm Toán Bất Biến (SCRUM-55, SCRUM-59)

- **Mã quyết định:** `ADR-002`
- **Trạng thái:** `accepted`
- **Ngày quyết định:** `2026-10-19`
- **Người tham gia xác nhận:** Architecture Team, Backend Lead, DBA Lead
- **Căn cứ yêu cầu:** SRS Section 3.2.1 (System Audit & Event Logs) & SCRUM-10

---

## 1. Bối Cảnh (Context)

Trong hệ thống E-Commerce & Đấu giá thời gian thực Project Nexus, các Bounded Contexts liên tục phát hành các sự kiện nghiệp vụ quan trọng (đăng ký, tạo sản phẩm, đặt giá, chốt phiên đấu giá, thanh toán, vận chuyển).

Theo yêu cầu **SRS 3.2.1 (System Audit & Event Logging)**:

1. Hệ thống cần ghi nhận nhật ký tập trung mọi Domain Event phát sinh từ 6 dịch vụ để phục vụ truy vết, kiểm toán bảo mật và giải quyết khiếu nại giao dịch.
2. Cần xác định rõ **Owner Bounded Context** sở hữu bảng dữ liệu này nhằm tuân thủ nguyên tắc độc lập cơ sở dữ liệu (Database-per-Service), nghiêm cấm các module khác truy cập trực tiếp vào database kiểm toán.
3. Cần cơ chế tự động ghi log khi có sự kiện được phát tán mà không đòi hỏi các lập trình viên tầng nghiệp vụ phải gọi hàm ghi log thủ công.
4. Cần quy ước rõ ràng về xử lý lỗi (Error Handling), phòng chống lặp tin nhắn (Idempotency) và độ bền (Durability).

---

## 2. Quyết Định Kiến Trúc (Decision)

### 2.1. Quyền Sở Hữu (Ownership) & Tên Bảng (SCRUM-55)

- **Bounded Context sở hữu:** `notification-service` (Dịch vụ Thông báo & Kiểm toán Hệ thống).
- **Cơ sở dữ liệu lưu trữ:** PostgreSQL riêng biệt (`nexus_notification_db`, cổng `5437` trong `devops/docker-compose.dev.yml`).
- **Tên bảng vật lý:** `notification_event_log`.
- **Ranh giới truy cập:** Toàn bộ việc ghi nhận và truy vấn dữ liệu `notification_event_log` được đóng gói bên trong `notification-service`. Các service khác tuyệt đối **không** được kết nối trực tiếp tới cơ sở dữ liệu này.

### 2.2. Cấu Trúc Bảng Dữ Liệu Bất Biến (Schema Definition)

Bảng tuân thủ nguyên tắc **Append-Only** (chỉ cho phép `INSERT`, nghiêm cấm `UPDATE` và `DELETE` để bảo toàn tính toàn vẹn kiểm toán):

| Tên Cột          | Kiểu Dữ Liệu   | Ràng Buộc                            | Ý Nghĩa Nghiệp Vụ                                                                                      |
| :--------------- | :------------- | :----------------------------------- | :----------------------------------------------------------------------------------------------------- |
| `id`             | `BIGSERIAL`    | `PRIMARY KEY`                        | Khóa chính tự tăng tối ưu hiệu năng đánh index.                                                        |
| `event_id`       | `VARCHAR(64)`  | `UNIQUE NOT NULL`                    | Mã định danh duy nhất của Domain Event (`crypto.randomUUID()`). Dùng để chống ghi trùng (Idempotency). |
| `type`           | `VARCHAR(100)` | `NOT NULL`                           | Tên loại sự kiện phân cấp (VD: `user.registered`, `auction.won`).                                      |
| `source_service` | `VARCHAR(50)`  | `NOT NULL`                           | Tên service phát hành (VD: `user-service`, `auction-service`).                                         |
| `payload`        | `JSONB`        | `NOT NULL`                           | Toàn bộ dữ liệu chi tiết của sự kiện được lưu trữ dưới dạng nhị phân JSONB.                            |
| `status`         | `VARCHAR(20)`  | `NOT NULL DEFAULT 'SUCCESS'`         | Trạng thái xử lý (`SUCCESS`, `FAILED`, `RETRYING`).                                                    |
| `created_at`     | `TIMESTAMPTZ`  | `NOT NULL DEFAULT CURRENT_TIMESTAMP` | Thời điểm ghi nhận vào nhật ký kiểm toán (bất biến).                                                   |

- **Chỉ mục (Indexes):**
  - `idx_event_created_at` trên cột `created_at DESC` (tối ưu truy vấn nhật ký theo thời gian).
  - `idx_event_type` trên cột `type` (tìm kiếm theo loại sự kiện).
  - `idx_event_source` trên cột `source_service` (lọc sự kiện theo module nguồn).

---

### 2.3. Cơ Chế Bắt Sự Kiện Tự Động (Observer Listener - SCRUM-57)

- Thiết lập một **Global Audit Listener** (`GlobalEventAuditSubscriber`) tự động đăng ký với cổng `IEventPublisher` thông qua cơ chế wildcard (`*`).
- Khi bất kỳ module nào gọi `eventPublisher.publish(event)`, listener này tự động kích hoạt ngầm và chuyển dữ liệu sang `EventLogService` để lưu vào bảng `notification_event_log`.
- **Module nghiệp vụ hoàn toàn độc lập:** Không cần import entity hay repository của `notification-service`.

---

### 2.4. Chiến Lược Xử Lý Lỗi & Tính Bất Biến (Error Handling & Idempotency - SCRUM-59)

1. **Chống Ghi Trùng (Idempotency Strategy):**
   - Nếu nhận được sự kiện có `event_id` đã tồn tại trong cơ sở dữ liệu, hệ thống tự động bỏ qua (No-op / Ignore) hoặc trả về bản ghi cũ, không ném lỗi làm gián đoạn hệ thống.
2. **Nguyên Tắc Không Nuốt Lỗi (No Silent Failures):**
   - Mọi sự cố khi ghi log (lỗi kết nối DB, lỗi parse JSON) đều được ghi nhận vào Error Logger chẩn đoán kèm `eventId` và stack trace chi tiết.
3. **Cô Lập Lỗi Với Nghiệp Vụ Cốt Lõi (Non-blocking Isolation):**
   - Trong giai đoạn Phase 0, tác vụ ghi audit log được thực hiện an toàn. Lỗi phát sinh trong quá trình ghi audit log không được làm sập (abort) luồng nghiệp vụ chính của người dùng, nhưng được cảnh báo tới bộ giám sát hệ thống.

---

## 3. Hệ Quả & Đánh Đổi (Consequences)

- **Ưu điểm:**
  - Minh bạch kiểm toán theo chuẩn SRS 3.2.1.
  - Giữ trọn vẹn ranh giới Bounded Context và Clean Architecture.
  - Tự động hóa 100%, không phát sinh boilerplate code ở các module nghiệp vụ khác.
- **Đánh đổi:**
  - Cần tối ưu dung lượng lưu trữ `JSONB` trong tương lai (Phase 1/2) bằng chính sách lưu trữ phân tầng (Partitioning / Log Archival).
