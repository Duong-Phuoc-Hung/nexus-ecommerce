# DevOps & Infrastructure Specification (DEVOPS)

> **Tài liệu tham chiếu:** SRS Project Nexus v1.0 (Section 4.1 - General Implementation Principles, Section 4.3 - Configuration & Secrets Management, Section 5.1 - 5.7)  
> **Nền tảng hạ tầng:** Docker, Docker Compose, PostgreSQL 16, Redis 7 (In-memory Lock), RabbitMQ 3 (Message Broker), Nginx, Kubernetes.

---

## 1. Cây Thư Mục Chi Tiết Của `devops/`

```text
devops/
├── docker-compose.dev.yml                   # Khởi chạy 6 DB Postgres độc lập, Redis, RabbitMQ cục bộ
├── nginx/
│   └── default.conf                         # Cấu hình Reverse Proxy điều hướng domain vào FE và Gateway
├── argocd/
│   └── application.yaml                     # ArgoCD Application CRD (GitOps Continuous Delivery)
└── k8s/                                     # Manifests triển khai cụm Kubernetes (SRS 5.7)
    ├── namespace.yaml                       # Namespace 'nexus'
    ├── configmap.yaml                       # Biến môi trường dùng chung
    ├── secret.yaml                          # Database URLs, JWT secrets, Broker credentials
    ├── api-gateway.yaml                     # Deployment & Service (Port 4000)
    ├── user-service.yaml                    # Deployment & Service (Port 4001)
    ├── catalog-service.yaml                 # Deployment & Service (Port 4002)
    ├── commerce-service.yaml                # Deployment & Service (Port 4003)
    ├── auction-service.yaml                 # Deployment & Service (Port 4004)
    ├── fulfillment-service.yaml             # Deployment & Service (Port 4005)
    ├── notification-service.yaml            # Deployment & Service (Port 4006)
    ├── ingress.yaml                         # Ingress Controller Routing
    ├── kustomization.yaml                   # Kustomize Package Definition
    └── argocd-application.yaml             # ArgoCD Application manifest
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

---

## 4. Multi-Stage Docker Builds (< 150MB)

Mỗi microservice được trang bị Dockerfile multi-stage tận dụng tối đa `pnpm workspaces` (pnpm@12) và `node:20-alpine`:

- **Stage 1 (base)**: Cấu hình môi trường Node.js 20 Alpine với `corepack` kích hoạt `pnpm`.
- **Stage 2 (builder)**: Copy monorepo manifests, shared code và source của service. Chạy `pnpm install`, tự động `prisma generate` (nếu có schema), biên dịch TypeScript và chạy `pnpm deploy --prod` trích xuất bundle độc lập chỉ gồm production dependencies.
- **Stage 3 (runner)**: Loại bỏ các package managers (`npm`, `yarn`, `corepack`), chạy dưới quyền người dùng không đặc quyền (`USER node`, UID 1000), tích hợp Node.js native healthcheck probe. Kích thước image tối ưu chỉ ~130MB (đạt tiêu chuẩn < 150MB).

### Lệnh Build Container Images:

- **Build qua script tự động toàn bộ 7 services**:
  ```bash
  bash scripts/build-all-images.sh
  ```
- **Build lẻ từng microservice**:
  ```bash
  docker build -f backend/api-gateway/Dockerfile -t nexus/api-gateway:latest .
  docker build -f backend/user-service/Dockerfile -t nexus/user-service:latest .
  docker build -f backend/catalog-service/Dockerfile -t nexus/catalog-service:latest .
  docker build -f backend/commerce-service/Dockerfile -t nexus/commerce-service:latest .
  docker build -f backend/auction-service/Dockerfile -t nexus/auction-service:latest .
  docker build -f backend/fulfillment-service/Dockerfile -t nexus/fulfillment-service:latest .
  docker build -f backend/notification-service/Dockerfile -t nexus/notification-service:latest .
  ```
- **Build qua Parameterized Dockerfile tại root**:
  ```bash
  docker build --build-arg SERVICE_NAME=user-service --build-arg SERVICE_PORT=4001 -t nexus/user-service:latest .
  ```

---

## 5. GitLab CI/CD Container Registry Pipeline

Tệp `.gitlab-ci.yml` được cấu hình stage `docker-build` tự động hóa:

- **Xác thực cấu hình Docker Compose** trên Merge Request và Feature branch (`validate_docker_configs`).
- **Tự động build & push song song (parallel matrix)** 7 container images lên GitLab Container Registry khi có commit merge vào nhánh `main` hoặc `develop` (`docker_build_and_push`):
  - Image tags: `$CI_REGISTRY_IMAGE/<service>:$CI_COMMIT_SHORT_SHA` và `$CI_REGISTRY_IMAGE/<service>:latest`.
  - Tận dụng biến hệ thống chuẩn của GitLab: `$CI_REGISTRY`, `$CI_REGISTRY_USER`, `$CI_REGISTRY_PASSWORD`.

---

## 6. Kubernetes & GitOps Triển Khai Tự Động Với ArgoCD

Toàn bộ hạ tầng production Kubernetes được khai báo dạng mã nguồn (GitOps) tại `devops/k8s/`:

- **Namespace**: `nexus`
- **ConfigMap & Secret**: `nexus-config`, `nexus-secret` (kèm `gitlab-registry-secret` loại `kubernetes.io/dockerconfigjson` để pull images từ private GitLab Registry `git.fsoft-academy.edu.vn:5050`).
- **Microservices Deployments & Services**: 7 backend microservices (Ports 4000-4006) với rolling update, non-root security context (`runAsNonRoot: true`, `runAsUser: 1000`), `imagePullSecrets` xác thực Registry, Liveness & Readiness probes (`/health`), giới hạn tài nguyên CPU/RAM chặt chẽ.
- **Ingress**: `nexus-ingress` điều hướng traffic domain vào API Gateway.
- **Kustomization**: Quản lý toàn bộ gói tài nguyên qua `kustomization.yaml`.
- **ArgoCD Application**: `devops/k8s/argocd-application.yaml` và `devops/argocd/application.yaml` kích hoạt chế độ:
  - `automated.prune: true` (Tự động dọn dẹp các tài nguyên bị xóa trên Git).
  - `automated.selfHeal: true` (Tự động khôi phục cấu hình cụm khi có can thiệp thủ công sai lệch).
  - `syncOptions`: `CreateNamespace=true`, `ApplyOutOfSyncOnly=true`.

### Triển khai thủ công hoặc qua GitOps:

```bash
# Chạy bộ test kiểm thử tự động toàn diện hạ tầng & healthcheck:
pnpm test

# Triển khai trực tiếp toàn bộ tài nguyên qua Kustomize:
kubectl apply -k devops/k8s/

# Hoặc kích hoạt ứng dụng ArgoCD tự động giám sát và đồng bộ:
kubectl apply -f devops/argocd/application.yaml
```
