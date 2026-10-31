# Ghi chú Bàn giao Code Dùng Chung (Shared Changes) — Commerce Service

**Người thực hiện:** Đào Lý Phi Hùng (Role BUYER – Commerce Service)  
**Gửi tới:** Nhóm 1 (Phụ trách Seller & Support Staff – Thành, Hưng, Thiện) & Toàn đội ngũ  
**Ngày cập nhật:** 31/10/2026  
**Nhánh:** `feat/be-commerce-checkout-order`

---

## 1. Mục đích thay đổi

Để giải quyết bài toán: **Đơn hàng Buyer tạo từ PayOS/COD lưu trong PostgreSQL `commerce_orders` nhưng khi tra cứu `GET /api/v1/orders` lại không thấy** (do code cũ đọc từ `InMemoryOrderRepository` trên RAM), đồng thời bảo vệ an toàn dữ liệu cá nhân giữa các người dùng theo chuẩn SRS 3.4.

---

## 2. Chi tiết các file dùng chung đã được điều chỉnh

### 2.1. `backend/commerce-service/src/app.ts`

- **Thay đổi:**
  - Tạo kết nối `Pool` dùng chung tới cơ sở dữ liệu PostgreSQL `nexus_commerce_db` (Port 5434).
  - Thay thế `const orderRepository = new InMemoryOrderRepository()` bằng `new PostgresOrderRepository(pool)`.
  - Mount thêm phân hệ giỏ hàng đồng bộ: `app.use('/api/v1/cart', createCartRoutes(cartController))`.
- **Lưu ý cho Nhóm 1 (Seller/Support Staff):**
  - Khi Support Staff hoặc Seller gọi `GET /api/v1/orders` và `GET /api/v1/orders/:id`, hệ thống giờ đây đọc dữ liệu thật từ bảng `commerce_orders` và `commerce_order_items` trong database, **không còn đọc 4 đơn mock RAM cũ (`ord_01hqz555abc`...) nữa**.
  - **Dữ liệu test:** Các bạn có thể đăng nhập tài khoản Buyer (`buyer@gmail.com` / `123456`) bấm đặt hàng thử (qua PayOS hoặc COD) để sinh đơn hàng thật trong database, sau đó đăng nhập Staff/Seller để xem và xử lý.

---

### 2.2. `backend/commerce-service/src/interfaces/http/controllers/OrderController.ts`

- **Thay đổi:**
  - **Tại `listOrders`:** Thêm logic phân tách phạm vi truy cập:
    - Nếu role là `BUYER`: Tự động gán `buyerId = req.user.sub` (Buyer chỉ được xem đơn của mình, không lộ đơn người khác).
    - Nếu role là `SELLER`: Tự động gán `sellerId = req.user.sub` (Seller chỉ xem đơn đặt tại gian hàng của mình).
    - Nếu role là `ADMIN` hoặc `SUPPORT_STAFF`: **Giữ nguyên 100% logic cũ** (được phép truyền query tìm kiếm toàn bộ đơn của toàn sàn).
  - **Tại `getById`:**
    - Kiểm tra quyền sở hữu đơn hàng: Trả về `403 Forbidden` nếu Buyer cố tình mở xem đơn của Buyer khác, hoặc Seller xem đơn của gian hàng khác. Admin và Staff xem được mọi đơn.
  - **Tại `cancel`:**
    - Bổ sung quyền cho phép Buyer tự hủy đơn khi đơn còn ở trạng thái `PENDING_PAYMENT` hoặc `PROCESSING` (chưa sang `SHIPPED`).
    - Quyền hủy đơn khiếu nại của `SUPPORT_STAFF` và `ADMIN` **vẫn được giữ nguyên 100%**.

---

### 2.3. `backend/commerce-service/src/infrastructure/security/auth.ts`

- **Thay đổi:**
  - Cập nhật hàm `requireOrderPermission`:
    ```typescript
    // BUYER được cấp thêm quyền LIST (xem danh sách đơn của mình) và CANCEL (tự hủy đơn chưa giao)
    if (normalizedRole === 'BUYER') {
      if (action === 'VIEW' || action === 'LIST' || action === 'CANCEL') {
        return next();
      }
    }
    ```
- **Lưu ý cho Nhóm 1:** Toàn bộ quyền của `ADMIN`, `SUPPORT_STAFF` và `SELLER` trong file này **được bảo toàn tuyệt đối**, không bị thay đổi.

---

### 2.4. `backend/api-gateway/src/app.ts` & `backend/api-gateway/src/swagger-specs.ts`

- **Thay đổi:**
  - Thêm 1 dòng điều hướng proxy tại Gateway:
    `app.use('/api/v1/cart', createProxy('Commerce Service', SERVICE_ENDPOINTS.commerce));`
  - Thêm đặc tả các API Giỏ hàng, Checkout COD, và Đơn mua của Buyer vào tài liệu Swagger UI (`http://localhost:4000/api-docs`).

---

## 3. Cách Nhóm 1 kiểm tra & Chạy thử

1. Khởi động các container Docker nền tảng:
   ```bash
   pnpm docker:dev:up
   ```
2. Chạy ứng dụng Commerce:
   ```bash
   pnpm dev:shop
   # hoặc pnpm dev:all
   ```
3. Test đơn hàng của Support Staff / Admin:
   - Mở Swagger UI tại: `http://localhost:4000/api-docs` (Tab _Commerce Service_).
   - Đăng nhập bằng `staff@gmail.com` hoặc `admin@gmail.com` để gọi `GET /api/v1/orders`. Mọi quyền hạn, thao tác Hủy đơn (`/cancel`), Hoàn tiền (`/refund`) của Support Staff vẫn hoạt động mượt mà trên dữ liệu thật PostgreSQL.
