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
      - user_db_data:/var/lib/postgresql/data

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
      - catalog_db_data:/var/lib/postgresql/data

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
      - commerce_db_data:/var/lib/postgresql/data

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
      - auction_db_data:/var/lib/postgresql/data

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
      - fulfillment_db_data:/var/lib/postgresql/data

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
      - notification_db_data:/var/lib/postgresql/data

  # 7. Redis Cache & Distributed Lock (SRS 5.1 Bidding SLA <= 300ms)
  redis:
    image: redis:7-alpine
    container_name: nexus-redis
    ports:
      - '${REDIS_PORT:-6379}:6379'
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 3s
      retries: 5

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
  user_db_data:
  catalog_db_data:
  commerce_db_data:
  auction_db_data:
  fulfillment_db_data:
  notification_db_data:
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

---

## 4. Cấu Hình & Kiểm Tra Kết Nối Dịch Vụ Redis

### 4.1. Cấu hình biến môi trường

Các thông số kết nối Redis được khai báo trong file `.env` (tham khảo template tại [`.env.example`](file:///d:/Nexus/nexus-ecommerce/.env.example)):

```bash
# Redis Cache, Session & Distributed Lock (Redlock)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_URL=redis://localhost:6379
```

_Lưu ý: Môi trường local development mặc định không đặt password. Tuyệt đối không hardcode mật khẩu vào file compose._

### 4.2. Kiểm tra kết nối và trạng thái hoạt động

1. **Kiểm tra Healthcheck:**

   ```bash
   docker compose -f devops/docker-compose.dev.yml ps redis
   ```

   _Kết quả mong đợi: Cột `STATUS` hiển thị `Up ... (healthy)`._

2. **Kiểm tra kết nối trực tiếp qua Redis CLI (Ping):**

   ```bash
   docker exec -it nexus-redis redis-cli ping
   ```

   _Kết quả mong đợi:_

   ```text
   PONG
   ```

3. **Kiểm tra ghi/đọc dữ liệu (Cache test):**
   ```bash
   docker exec -it nexus-redis redis-cli set test_key "nexus_redis_ok"
   docker exec -it nexus-redis redis-cli get test_key
   ```
   _Kết quả mong đợi:_
   ```text
   "nexus_redis_ok"
   ```
