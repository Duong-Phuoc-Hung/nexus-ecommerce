# 📊 BÁO CÁO SO SÁNH & ĐỀ XUẤT CƠ CHẾ EVENT CHO PHASE 0 (SCRUM-33)

> **Mục tiêu:** Phân tích, đánh giá và đề xuất cơ chế phát/nhận sự kiện (Domain Events) phù hợp nhất cho Phase 0 của Project Nexus, ghi nhận đầy đủ trade-offs để toàn đội ngũ Backend và DevOps thống nhất triển khai.

---

## 1. Bối Cảnh Hệ Thống & Yêu Cầu SRS (Context)

Project Nexus là nền tảng thương mại điện tử và đấu giá thời gian thực (E-Commerce & Real-Time Auction) xây dựng theo mô hình **Modular Monolith hướng Microservices** (7 Bounded Contexts: `api-gateway`, `user-service`, `catalog-service`, `commerce-service`, `auction-service`, `fulfillment-service`, `notification-service`).

Theo tài liệu **SRS 2.8 (Event Message Table)**:

- Toàn hệ thống có hơn 45 sự kiện nghiệp vụ cần được truyền thông bất đồng bộ giữa các module (ví dụ: khi `user-service` phát sinh `user.registered`, `notification-service` cần nhận để gửi email kích hoạt; khi `auction-service` phát sinh `auction.won`, `commerce-service` cần tạo đơn hàng tự động).
- **Mục tiêu Phase 0:** Xây dựng khung sườn hạ tầng, đảm bảo tính độc lập ranh giới (Bounded Context Isolation), hỗ trợ lập trình viên phát triển và chạy Unit Test / Integration Test tại máy cá nhân (Local Dev Experience) siêu tốc mà không bị tắc nghẽn bởi hạ tầng phức tạp, đồng thời sẵn sàng mở rộng khi triển khai môi trường phân tán (Docker Compose & Kubernetes).

---

## 2. So Sánh Chi Tiết 3 Phương Án Cơ Chế Event

| Tiêu Chí Đánh Giá                                   | Phương Án 1: In-Process Event<br>_(ApplicationEventPublisher / EventEmitter / In-Memory)_                                                                    | Phương Án 2: AMQP Message Broker<br>_(RabbitMQ via Docker)_                                                                                                         | Phương Án 3: Distributed Commit Log<br>_(Apache Kafka)_                                                                                             |
| :-------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Độ phức tạp triển khai (Complexity)**          | ⭐⭐⭐⭐⭐ **Rất thấp**<br>- Không cần thư viện ngoài.<br>- Xử lý trực tiếp trong bộ nhớ tiến trình (Process Memory).                                        | ⭐⭐⭐⭐☆ **Trung bình**<br>- Cần cài đặt client AMQP (`amqplib`).<br>- Cấu hình Exchange, Queue, Routing Key và Dead Letter Queue (DLQ).                           | ⭐⭐☆☆☆ **Rất cao**<br>- Đòi hỏi cụm ZooKeeper hoặc KRaft.<br>- Cấu hình Partition, Consumer Group, Offset Management, Schema Registry phức tạp.    |
| **2. Trải nghiệm Local Dev (Local DX & Testing)**   | ⭐⭐⭐⭐⭐ **Xuất sắc**<br>- Chạy ngay lập tức, không tốn RAM/CPU.<br>- Chạy Unit Test tự động trên CI chỉ mất vài giây.<br>- Không phụ thuộc Docker daemon. | ⭐⭐⭐⭐☆ **Rất tốt**<br>- Đã được đóng gói sẵn trong `devops/docker-compose.dev.yml` (Port 5672, UI 15672).<br>- Tốn khoảng ~100MB RAM.                            | ⭐⭐☆☆☆ **Nặng nề**<br>- Chiếm từ 1.5GB - 3GB RAM trên máy cá nhân.<br>- Thời gian khởi động lâu, dễ gây treo máy cấu hình yếu.                     |
| **3. Độ bền & Khả năng Retry (Durability & Retry)** | ⭐☆☆☆☆ **Kém**<br>- Dữ liệu lưu trên RAM; khi tiến trình restart/crash sẽ mất toàn bộ event chưa xử lý.<br>- Không hỗ trợ Dead Letter Queue liên tiến trình. | ⭐⭐⭐⭐⭐ **Rất cao**<br>- Hỗ trợ Message Persistence (lưu đĩa).<br>- Hỗ trợ xác nhận tin nhắn (`ack`/`nack`), tự động đẩy vào DLX khi lỗi quá số lần quy định.    | ⭐⭐⭐⭐⭐ **Cực cao**<br>- Lưu log phân tán lâu dài (Retention policy).<br>- Cho phép phát lại sự kiện từ đầu (Event Replay).                      |
| **4. Đáp ứng SRS 2.8 & Kiến trúc Phân Tán**         | ⭐⭐☆☆☆ **Hạn chế**<br>- Chỉ hoạt động khi các module chạy chung 1 tiến trình Node.js.<br>- Không gửi được tin nhắn giữa các container riêng biệt.           | ⭐⭐⭐⭐⭐ **Hoàn hảo**<br>- Khớp 100% với mô hình Publish/Subscribe theo Topic Exchange (`nexus.events`) của SRS 2.8.<br>- Độc lập hoàn toàn giữa 7 microservices. | ⭐⭐⭐⭐☆ **Dư thừa (Overkill)**<br>- Phù hợp Big Data / High Throughput hàng triệu msg/sec.<br>- Quá thừa thãi cho quy mô giai đoạn đầu của dự án. |

---

## 3. Lý Do Lựa Chọn & Đề Xuất Cho Phase 0

Nhóm Backend và DevOps thống nhất lựa chọn mô hình **Kiến trúc Cổng Kết Nối Đa Hình (Hexagonal Ports & Adapters / Dual-Driver Event Mechanism)**:

```mermaid
flowchart TD
    BL["Domain & Business Logic\n(Use Cases)"] -->|Phụ thuộc duy nhất| IEP["Interface IEventPublisher\n(shared/contracts)"]
    IEP --> DE["DomainEvent&lt;T&gt;\n(Immutable Base Type)"]

    IEP -.->|Adapter 1: Testing & Local| IMEP["InMemoryEventPublisher\n(Unit Tests / CI / In-Process)"]
    IEP -.->|Adapter 2: Inter-Service| RMEP["RabbitMqEventPublisher\n(Docker Compose / Staging / Production)"]

    IMEP --> RAM["Memory Event Store & Local Handlers"]
    RMEP --> RMQ["RabbitMQ Topic Exchange: 'nexus.events'\nRouting Key: {domain}.{entity}.{action}"]
```

### Tại sao lựa chọn mô hình này?

1. **Tuân thủ nguyên lý đảo ngược phụ thuộc (DIP - Dependency Inversion Principle):** Toàn bộ nghiệp vụ ở tầng Application (`user-service`, `catalog-service`, ...) chỉ phụ thuộc vào interface `IEventPublisher` và lớp `DomainEvent<T>` dùng chung tại `@nexus/contracts`. Nghiệp vụ cốt lõi không biết và không quan tâm đằng sau là RabbitMQ, Kafka hay EventEmitter trong RAM.
2. **Tối ưu trải nghiệm phát triển & Tự động hóa CI (Local DX):**
   - Khi chạy Unit Test và CI (`pnpm test`), hệ thống sử dụng `InMemoryEventPublisher`. Test chạy tức thì (vài chục mili-giây), không cần bật Docker, không sợ lỗi treo mạng cổng 5672.
3. **Sẵn sàng cho môi trường phân tán (Distributed Environments):**
   - Khi chạy ứng dụng với Docker Compose (`docker:dev:up`), hệ thống chuyển sang `RabbitMqEventPublisher` để kết nối vào container `nexus-rabbitmq`, bảo đảm độ bền (Durability) và định tuyến Topic linh hoạt.
4. **Loại bỏ Kafka trong Phase 0:** Tránh gánh nặng tài nguyên và độ phức tạp vận hành không cần thiết trong giai đoạn xây dựng khung sườn.

---

## 4. Điều Kiện & Kế Hoạch Chuyển Đổi Sang Phase Tiếp Theo

- **Chuyển sang Phase 1:** Kích hoạt kết nối AMQP chính thức qua `amqplib` có cơ chế tự động kết nối lại (Auto-reconnect), xác thực tài khoản và cấu hình Dead Letter Exchange (`nexus.events.dlx`) cho toàn bộ 7 services.
- **Mở rộng tương lai (nếu cần Kafka / Cloud Pub/Sub):** Chỉ cần tạo thêm 1 Adapter mới (ví dụ: `KafkaEventPublisher implements IEventPublisher`) và cấu hình Dependency Injection mà **không cần sửa đổi bất kỳ dòng mã nghiệp vụ nào** trong các Bounded Contexts.

---

## 5. Kết Luận & Nghiệm Thu (Sign-off)

- **Quyết định:** Thông qua phương án Hexagonal Event Architecture với `IEventPublisher` + `DomainEvent<T>` (Base Type) + `InMemoryEventPublisher` (Testing) + `RabbitMqEventPublisher` (Cluster Runtime).
- **Tài liệu tham chiếu:** [`docs/adr/ADR-001-event-mechanism-phase-0.md`](file:///d:/Nexus/nexus-ecommerce/docs/adr/ADR-001-event-mechanism-phase-0.md).
