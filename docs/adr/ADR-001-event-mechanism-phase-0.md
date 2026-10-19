# 🏛️ ADR-001: Lựa Chọn Cơ Chế Giao Tiếp Sự Kiện (Event-Driven Architecture) Cho Phase 0 (SCRUM-34)

- **Mã quyết định:** `ADR-001`
- **Trạng thái:** `accepted`
- **Ngày quyết định:** `2026-10-19`
- **Người tham gia xác nhận:** Architecture Team, Backend Lead, DevOps Lead
- **Phạm vi áp dụng:** Toàn bộ 7 Bounded Contexts của Project Nexus (Phase 0 & nền tảng cho Phase 1)

---

## 1. Bối Cảnh (Context)

Hệ thống Nexus E-Commerce & Real-Time Auction được thiết kế theo mô hình Modular Monolith hướng Microservices với 7 Bounded Contexts độc lập. Theo bảng **SRS 2.8 (Event Message Table)**, các nghiệp vụ liên module (ví dụ: đăng ký tài khoản -> gửi email thông báo, thanh toán thành công -> trừ tồn kho và chuẩn bị vận chuyển, kết thúc đấu giá -> khởi tạo đơn hàng) bắt buộc phải giao tiếp thông qua sự kiện bất đồng bộ (Asynchronous Domain Events) để triệt tiêu phụ thuộc trực tiếp (tight coupling).

Trong giai đoạn **Phase 0**, dự án đối mặt với các bài toán:

1. Cần một tiêu chuẩn thống nhất về cấu trúc Domain Event để toàn bộ nhóm Backend tuân thủ khi viết use case.
2. Cần tốc độ phát triển và chạy kiểm thử tự động (Unit / Integration Test) siêu tốc trên máy cá nhân mà không bị phụ thuộc vào việc phải luôn duy trì container Message Broker chạy ngầm.
3. Cần đảm bảo tính sẵn sàng cho môi trường phân tán (Docker Compose, CI Pipeline, K8s) sử dụng RabbitMQ Broker theo đúng thiết kế hạ tầng.

---

## 2. Quyết Định Kiến Trúc (Decision)

Chúng tôi quyết định áp dụng **Mô hình Kiến trúc Cổng & Bộ Chuyển Đổi (Ports & Adapters / Hexagonal Architecture)** cho toàn bộ cơ chế phát và nhận sự kiện của hệ thống:

### 2.1. Hợp đồng dùng chung (Shared Contracts):

- **Base Type Bất Biến:** Toàn bộ sự kiện hệ thống phải kế thừa lớp cơ sở bất biến [`DomainEvent<T>`](file:///d:/Nexus/nexus-ecommerce/shared/contracts/src/events/domain-event.base.ts) đặt tại gói thư viện dùng chung `@nexus/contracts`. Mỗi sự kiện bắt buộc có:
  - `eventId`: Mã định danh duy nhất (UUID v4).
  - `type`: Định danh sự kiện phân cấp (VD: `user.registered`, `catalog.product.created`).
  - `version`: Phiên bản hợp đồng (Default: `1`).
  - `occurredAt`: Chuỗi thời gian chuẩn ISO-8601.
  - `sourceService`: Tên service phát hành (VD: `user-service`).
  - `payload`: Dữ liệu chi tiết dạng readonly (Generic `T`).
- **Cổng Trừu Tượng (Port):** Định nghĩa interface [`IEventPublisher`](file:///d:/Nexus/nexus-ecommerce/shared/contracts/src/events/event-publisher.interface.ts) đại diện cho cổng gửi sự kiện. Tầng Application và Domain chỉ phụ thuộc duy nhất vào interface này.

### 2.2. Hai Bộ Chuyển Đổi Triển Khai (Adapters):

1. **`InMemoryEventPublisher` (Adapter cho Local Test & Fast CI):**
   - Lưu trữ các sự kiện phát sinh trong mảng bộ nhớ (RAM).
   - Cung cấp cơ chế subscribe handler nội bộ theo event type hoặc wildcard `*`.
   - Cung cấp các hàm bổ trợ kiểm thử: `getPublishedEvents()`, `getLastEvent()`, `clear()`.
   - Sử dụng mặc định trong các bộ kiểm thử tự động (`pnpm test`) để loại bỏ sự phụ thuộc vào hạ tầng mạng/container.
2. **`RabbitMqEventPublisher` (Adapter cho Môi trường Phân Tán):**
   - Kết nối tới cụm RabbitMQ trên cổng `5672` (đã khai báo trong `devops/docker-compose.dev.yml`).
   - Sử dụng Topic Exchange: `nexus.events`.
   - Quy ước Routing Key phân cấp: `<domain>.<entity>.<action>` (Ví dụ: `user.account.registered`, `auction.bid.placed`).
   - Thiết lập cơ chế bền vững (Persistent Messages: `deliveryMode = 2`) và Dead Letter Exchange (`nexus.events.dlx`) cho tin nhắn lỗi.

---

## 3. Hệ Quả & Đánh Đổi (Consequences & Trade-offs)

### Ưu Điểm (Positives):

- **Tính độc lập cao (Decoupling):** Mã nguồn nghiệp vụ không chứa bất kỳ logic liên quan đến SDK RabbitMQ hay AMQP protocol.
- **Tốc độ kiểm thử vượt trội (Zero Infrastructure Bottleneck for Testing):** Unit test chạy hoàn toàn trong bộ nhớ với tốc độ mili-giây mà vẫn kiểm tra được chính xác use case có phát đúng sự kiện và payload hay không.
- **Khả năng mở rộng trong tương lai:** Nếu tương lai hệ thống chuyển sang Kafka hoặc Cloud Pub/Sub, ta chỉ cần viết thêm một implementation mới của `IEventPublisher` mà không phải sửa lại use case nghiệp vụ nào.
- **Tuân thủ 100% ranh giới kiến trúc:** Không vi phạm các quy tắc Modular Monolith và kiểm tra ArchUnit (`test-architecture-boundaries.test.js`).

### Nhược Điểm & Thách Thức (Negatives & Mitigations):

- **Khác biệt môi trường:** `InMemoryEventPublisher` không có tính bền bỉ (durability); nếu tiến trình gặp sự cố (crash) trong test, sự kiện chưa xử lý sẽ biến mất.
  - _Biện pháp giảm thiểu:_ Sử dụng `InMemoryEventPublisher` độc quyền cho môi trường Test/CI; khi khởi động môi trường tích hợp (Docker Compose), hệ thống nạp `RabbitMqEventPublisher`.
- **Tính nhất quán cuối cùng (Eventual Consistency):** Khi chuyển sang xử lý bất đồng bộ qua broker, các module cần thiết kế Consumer có tính chất Idempotent (kiểm tra `eventId` tránh xử lý trùng).

---

## 4. Hướng Dẫn Đăng Ký & Sử Dụng (Usage Guide)

### 4.1. Khởi tạo và Đăng ký Publisher trong Dependency Injection:

```typescript
import { IEventPublisher, InMemoryEventPublisher } from '@nexus/contracts';

// Trong môi trường Test hoặc Local Dev độc lập:
const eventPublisher: IEventPublisher = new InMemoryEventPublisher();

// Truyền vào Use Case thông qua Constructor Injection:
const registerUserUseCase = new RegisterUserUseCase(userRepository, eventPublisher);
```

### 4.2. Phát tán sự kiện trong Nghiệp vụ:

```typescript
import { UserRegisteredDomainEvent } from '@nexus/contracts';

// Trong Use Case:
const domainEvent = new UserRegisteredDomainEvent({
  userId: newUser.id,
  email: newUser.email,
  fullName: newUser.fullName,
  role: newUser.role,
  registeredAt: new Date().toISOString(),
});

await this.eventPublisher.publish(domainEvent);
```

---

## 5. Tài Liệu Liên Quan

- [Báo cáo so sánh & đề xuất cơ chế event cho Phase 0](file:///d:/Nexus/nexus-ecommerce/docs/architecture/event-mechanism-comparison-phase-0.md)
- [Danh mục sự kiện SRS 2.8 Event Catalog](file:///d:/Nexus/nexus-ecommerce/docs/standards/event-catalog-srs-2.8.md)
