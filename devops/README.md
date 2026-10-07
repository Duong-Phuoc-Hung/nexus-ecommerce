# DevOps & Infrastructure Specification (DEVOPS)

> **Tài liệu tham chiếu:** SRS Project Nexus v1.0 (Section 4.1 - General Implementation Principles, Section 4.3 - Configuration & Secrets Management, Section 5.1 - 5.7)  
> **Nền tảng hạ tầng:** Docker, Docker Compose, PostgreSQL 16, Redis 7 (In-memory Lock), RabbitMQ 3 (Message Broker), Nginx, Kubernetes.

---

## 1. Cây Thư Mục Chi Tiết Của `devops/`

```text
devops/
├── docker-compose.dev.yml                   # Khởi chạy 6 DB Postgres độc lập, Redis, RabbitMQ cục bộ
├── docker-compose.prod.yml                  # Cấu hình containerization cho môi trường thật (SRS 5.7)
├── nginx/
│   └── default.conf                         # Cấu hình Reverse Proxy điều hướng domain vào FE và Gateway
└── k8s/                                     # File triển khai cụm Kubernetes (SRS 5.7)
    ├── api-gateway.deployment.yml
    ├── user-service.deployment.yml
    ├── catalog-service.deployment.yml
    ├── commerce-service.deployment.yml
    ├── auction-service.deployment.yml
    ├── fulfillment-service.deployment.yml
    ├── notification-service.deployment.yml
    └── ingress.yml
```

---

## 2. Thiết Lập Môi Trường Cục Bộ (`docker-compose.dev.yml`)

Theo **SRS Section 4.1**: Các dịch vụ không được phép dùng chung database. Môi trường phát triển cục bộ khởi chạy 6 container PostgreSQL riêng biệt:

```yaml
version: '3.8'

services:
  # 1. Cơ sở dữ liệu User Service (Port: 5432)
  postgres-user:
    image: postgres:16-alpine
    container_name: nexus-postgres-user
    environment:
      POSTGRES_USER: nexus_user
      POSTGRES_PASSWORD: nexus_password
      POSTGRES_DB: nexus_user_db
    ports:
      - '5432:5432'
    volumes:
      - user_data:/var/lib/postgresql/data

  # 2. Cơ sở dữ liệu Catalog Service (Port: 5433)
  postgres-catalog:
    image: postgres:16-alpine
    container_name: nexus-postgres-catalog
    environment:
      POSTGRES_USER: nexus_catalog
      POSTGRES_PASSWORD: nexus_password
      POSTGRES_DB: nexus_catalog_db
    ports:
      - '5433:5432'
    volumes:
      - catalog_data:/var/lib/postgresql/data

  # 3. Cơ sở dữ liệu Commerce Service (Port: 5434)
  postgres-commerce:
    image: postgres:16-alpine
    container_name: nexus-postgres-commerce
    environment:
      POSTGRES_USER: nexus_commerce
      POSTGRES_PASSWORD: nexus_password
      POSTGRES_DB: nexus_commerce_db
    ports:
      - '5434:5432'
    volumes:
      - commerce_data:/var/lib/postgresql/data

  # 4. Cơ sở dữ liệu Auction Service (Port: 5435)
  postgres-auction:
    image: postgres:16-alpine
    container_name: nexus-postgres-auction
    environment:
      POSTGRES_USER: nexus_auction
      POSTGRES_PASSWORD: nexus_password
      POSTGRES_DB: nexus_auction_db
    ports:
      - '5435:5432'
    volumes:
      - auction_data:/var/lib/postgresql/data

  # 5. Cơ sở dữ liệu Fulfillment Service (Port: 5436)
  postgres-fulfillment:
    image: postgres:16-alpine
    container_name: nexus-postgres-fulfillment
    environment:
      POSTGRES_USER: nexus_fulfillment
      POSTGRES_PASSWORD: nexus_password
      POSTGRES_DB: nexus_fulfillment_db
    ports:
      - '5436:5432'
    volumes:
      - fulfillment_data:/var/lib/postgresql/data

  # 6. Cơ sở dữ liệu Notification Service (Port: 5437)
  postgres-notification:
    image: postgres:16-alpine
    container_name: nexus-postgres-notification
    environment:
      POSTGRES_USER: nexus_notification
      POSTGRES_PASSWORD: nexus_password
      POSTGRES_DB: nexus_notification_db
    ports:
      - '5437:5432'
    volumes:
      - notification_data:/var/lib/postgresql/data

  # 7. Redis Cache & Distributed Lock cho Bidding Đấu giá (Port: 6379)
  redis:
    image: redis:7-alpine
    container_name: nexus-redis
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

  # 8. RabbitMQ Message Broker phục vụ truyền tải 45+ sự kiện (Port: 5672, Dashboard: 15672)
  rabbitmq:
    image: rabbitmq:3-management-alpine
    container_name: nexus-rabbitmq
    ports:
      - '5672:5672'
      - '15672:15672'
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq

volumes:
  user_data:
  catalog_data:
  commerce_data:
  auction_data:
  fulfillment_data:
  notification_data:
  redis_data:
  rabbitmq_data:
```

---

## 3. Lệnh Thao Tác Hạ Tầng Nhanh

- **Khởi động toàn bộ hạ tầng ngầm**:
  ```bash
  docker compose -f devops/docker-compose.dev.yml up -d
  ```
- **Kiểm tra trạng thái các container**:
  ```bash
  docker compose -f devops/docker-compose.dev.yml ps
  ```
- **Dừng hạ tầng**:
  ```bash
  docker compose -f devops/docker-compose.dev.yml down
  ```
