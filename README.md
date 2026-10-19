# Project Nexus - E-Commerce & Auction Platform

> **Phiên bản tài liệu:** 1.0 (Bám sát SRS v1.0 - 04/2026)  
> **Nền tảng kỹ thuật:** Node.js / TypeScript Enterprise Monorepo  
> **Kiến trúc:** Microservices (Event-Driven) + Clean Layered Architecture

---

## 1. Điều Hướng Cấu Trúc Dự Án (Documentation Index)

Dự án được phân chia độc lập và minh bạch thành các khu vực chuyên biệt. Vui lòng xem tài liệu chi tiết của từng phân khu dưới đây:

| Phân khu     | Thư mục mã nguồn                                                                     | File tài liệu cấu trúc chi tiết                                                                            | Trách nhiệm chính                                                                                                    |
| :----------- | :----------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------- |
| **Backend**  | [`backend/`](file:///D:/CodeProject/nexus-ecommerce/nexus-ecommerce-main/backend/)   | [**`backend/README.md`**](file:///D:/CodeProject/nexus-ecommerce/nexus-ecommerce-main/backend/README.md)   | Chứa API Gateway và 6 Core Microservices (User, Catalog, Commerce, Auction, Fulfillment, Notification).              |
| **Frontend** | [`frontend/`](file:///D:/CodeProject/nexus-ecommerce/nexus-ecommerce-main/frontend/) | [**`frontend/README.md`**](file:///D:/CodeProject/nexus-ecommerce/nexus-ecommerce-main/frontend/README.md) | `pnpm dev` chạy `web-customer` trên cổng 3000, gồm Buyer, Seller demo và Support demo; `web-admin` vẫn là app riêng. |
| **Shared**   | [`shared/`](file:///D:/CodeProject/nexus-ecommerce/nexus-ecommerce-main/shared/)     | [**`shared/README.md`**](file:///D:/CodeProject/nexus-ecommerce/nexus-ecommerce-main/shared/README.md)     | Thư viện dùng chung: 45+ Sự kiện hệ thống (SRS 2.8), 65 Mã quyền Privileges (SRS 2.7), Enums và Utils.               |
| **DevOps**   | [`devops/`](file:///D:/CodeProject/nexus-ecommerce/nexus-ecommerce-main/devops/)     | [**`devops/README.md`**](file:///D:/CodeProject/nexus-ecommerce/nexus-ecommerce-main/devops/README.md)     | Docker Compose (6 DB Postgres riêng, Redis, RabbitMQ), Nginx Proxy, Kubernetes và CI/CD.                             |

---

## 2. Bản Đồ Tổng Quan Kiến Trúc (Architecture Map)

```text
[ Web Customer (Buyer/Seller) ]     [ Web Admin (Admin/Support) ]
              │                                   │
              └───────────────┬───────────────────┘
                              ▼
                      [ API Gateway ]
                              │ (HTTP REST / WebSocket)
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
[ User Service ]      [ Catalog Service ]   [ Commerce Service ]
 (Auth, Roles,         (Products, Search,    (Cart, Checkout,
  Reputation)           Categories)           Orders, Stripe)
        │                     │                     │
        └──────────────┬──────┴─────────────────────┘
                       ▼ (Domain Events via RabbitMQ / Kafka)
        ┌──────────────┼────────────────────────────┐
        ▼              ▼                            ▼
[ Auction Service ]   [ Fulfillment Service ]   [ Notification Service ]
 (Bidding <=300ms,     (SKU-Inventory, Ledger,   (Event Logs, Health Check,
  Anti-sniping, Settle) Carriers GHN/GHTK)        Email, Push FCM, SMS)
```

---

## 3. Các Nguyên Tắc Bắt Buộc Từ SRS (Section 4 & 5)

1. **Database-per-Service (SRS 4.1)**: Mỗi service sở hữu cơ sở dữ liệu riêng, tuyệt đối không truy cập hoặc chia sẻ bảng với service khác.
2. **Giao tiếp qua Event & REST API (SRS 4.1 & 4.2)**: Mọi tương tác liên service thực hiện qua REST API chuẩn OpenAPI 3.0 hoặc Domain Events bất đồng bộ.
3. **Hiệu năng đặt giá Auction (SRS 5.1)**: Đường dẫn đặt giá (Bidding) đạt SLA $\le 300\text{ms}$, dùng Redis Distributed Lock chống race conditions.
4. **Idempotency (SRS 3.4.2 & 5.3)**: Mọi thao tác quan trọng (thanh toán webhook Stripe, đặt đơn, trừ kho) phải có khóa Idempotency chống lặp dữ liệu.
5. **Tính bất biến của dữ liệu kiểm toán (SRS 3.2.1 & 3.6.1)**: Bảng `event_logs` và `inventory_ledgers` là bất biến (Append-only, không sửa, không xóa).

---

## 4. Bắt Đầu Phát Triển (Quick Start)

### 4.1. Yêu cầu môi trường

- Node.js >= 20.x
- pnpm >= 9.x
- Docker & Docker Compose

### 4.2. Cài đặt các gói phụ thuộc

```bash
# Cài đặt toàn bộ dependencies cho cả FE, BE và Shared
pnpm install
```

### 4.3. Khởi động hạ tầng cục bộ (Databases, Redis, RabbitMQ)

```bash
# Khởi động 6 cơ sở dữ liệu Postgres riêng, Redis và RabbitMQ
docker compose -f devops/docker-compose.dev.yml up -d
```

### 4.4. Chạy Migration Database cho các dịch vụ

```bash
bash scripts/migrate-all-databases.sh
```

### 4.5. Khởi chạy ứng dụng ở chế độ Development

```bash
# Chạy toàn bộ services và frontends đồng thời
pnpm dev
```

### 4.6. Kiểm thử tự động & Kiểm tra ranh giới kiến trúc (ArchUnit)

```bash
# Chạy toàn bộ test suites (Infrastructure + ArchUnit Architecture Boundaries)
pnpm test

# Hoặc chỉ chạy kiểm tra ranh giới kiến trúc liên Bounded Context
pnpm test:arch

# Hoặc chỉ chạy kiểm tra hạ tầng, Docker & K8s manifests
pnpm test:infra
```
