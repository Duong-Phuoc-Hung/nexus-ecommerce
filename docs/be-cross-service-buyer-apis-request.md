# Đặc tả yêu cầu API phía Buyer cho các Service liên quan (Cross-Service Buyer APIs Request)

> **Người lập:** Đào Lý Phi Hùng (`hungdlpse172826@fpt.edu.vn`)  
> **Vai trò:** Backend Engineer — `backend/commerce-service` (SRS 3.4 — Cart, Orders & Payments)  
> **Ngày lập:** 05/11/2026  
> **Tài liệu tham chiếu:** SRS Nexus Ecommerce & Auction v1.0, `AI_RULES.md`

---

## 1. Mục đích tài liệu

Theo quy định kiến trúc Microservices và phân chia ranh giới Bounded Context trong `AI_RULES.md`:

- `backend/commerce-service` chỉ phụ trách Bounded Context **Giỏ hàng (Cart), Đặt hàng (Checkout/Orders) & Thanh toán (Payments)** (SRS 3.4).
- Các chức năng phía Người mua (Buyer) như: Đánh giá Shop/Sản phẩm, Sản phẩm yêu thích (Wishlist), Khiếu nại vận chuyển (Dispute Support Case), Thông báo đẩy (Notifications), và Chốt thanh toán đơn thắng đấu giá thuộc trách nhiệm của các Service chuyên trách.

Tài liệu này được lập để bàn giao và yêu cầu các Backend team phụ trách (`user-service`, `catalog-service`, `fulfillment-service`, `notification-service`, `auction-service`) triển khai các endpoint còn thiếu nhằm hoàn thiện trọn vẹn luồng trải nghiệm Người mua trên toàn hệ thống Nexus.

---

## 2. Danh sách yêu cầu theo từng Service

### 2.1. User Service (`backend/user-service/`)

**Mục tiêu:** Quản lý sổ địa chỉ giao hàng và Đánh giá uy tín Người bán sau khi hoàn thành giao dịch (SRS 3.1.2).

| Method   | Endpoint                          | Quyền hạn    | Mô tả chi tiết                                                                                                                                       |
| :------- | :-------------------------------- | :----------- | :--------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST`   | `/api/v1/users/:sellerId/rate`    | `BUYER`      | Đánh giá sao (1 - 5 sao) và nhận xét Người bán sau khi đơn hàng chuyển sang trạng thái `DELIVERED`. Cập nhật điểm uy tín `reputationScore` cho Shop. |
| `GET`    | `/api/v1/users/:sellerId/ratings` | Public / All | Xem điểm đánh giá trung bình và danh sách các đánh giá của Người mua dành cho Người bán này.                                                         |
| `GET`    | `/api/v1/users/me/addresses`      | `BUYER`      | Lấy danh sách sổ địa chỉ nhận hàng cá nhân để tự động điền (autofill) khi Checkout.                                                                  |
| `POST`   | `/api/v1/users/me/addresses`      | `BUYER`      | Thêm địa chỉ nhận hàng mới (Họ tên, SĐT, Tỉnh/Thành, Quận/Huyện, Phường/Xã, Địa chỉ chi tiết, Mặc định).                                             |
| `PUT`    | `/api/v1/users/me/addresses/:id`  | `BUYER`      | Sửa thông tin địa chỉ nhận hàng.                                                                                                                     |
| `DELETE` | `/api/v1/users/me/addresses/:id`  | `BUYER`      | Xóa địa chỉ nhận hàng khỏi sổ địa chỉ.                                                                                                               |

---

### 2.2. Catalog Service (`backend/catalog-service/`)

**Mục tiêu:** Quản lý Danh sách yêu thích (Wishlist), Đánh giá chất lượng sản phẩm và API đồng bộ trừ tồn kho khi đơn hàng được tạo.

| Method   | Endpoint                                    | Quyền hạn            | Mô tả chi tiết                                                                                                                                                                                                         |
| :------- | :------------------------------------------ | :------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST`   | `/api/v1/catalog/products/:id/deduct-stock` | **Internal Service** | API nội bộ cho phép `commerce-service` gọi trừ tồn kho (`stockQuantity = stockQuantity - quantity`) khi Buyer thanh toán thành công (COD hoặc PayOS PAID). Đảm bảo tính nhất quán dữ liệu giữa Cart/Orders và Catalog. |
| `GET`    | `/api/v1/catalog/favorites`                 | `BUYER`              | Lấy danh sách sản phẩm Người mua đã bấm Yêu thích (Wishlist).                                                                                                                                                          |
| `POST`   | `/api/v1/catalog/favorites/:productId`      | `BUYER`              | Thêm sản phẩm vào danh sách Yêu thích.                                                                                                                                                                                 |
| `DELETE` | `/api/v1/catalog/favorites/:productId`      | `BUYER`              | Xóa sản phẩm khỏi danh sách Yêu thích.                                                                                                                                                                                 |
| `POST`   | `/api/v1/catalog/products/:id/reviews`      | `BUYER`              | Đánh giá chất lượng sản phẩm đã mua (1-5 sao, hình ảnh, văn bản nhận xét).                                                                                                                                             |
| `GET`    | `/api/v1/catalog/products/:id/reviews`      | Public / All         | Xem các lượt đánh giá và bình luận về sản phẩm.                                                                                                                                                                        |

---

### 2.3. Fulfillment Service (`backend/fulfillment-service/`)

**Mục tiêu:** Tiếp nhận khiếu nại sự cố vận chuyển từ Người mua (Hàng vỡ, giao sai, thiếu phụ kiện) (SRS 3.6).

| Method | Endpoint                         | Quyền hạn                   | Mô tả chi tiết                                                                                                                                                                                              |
| :----- | :------------------------------- | :-------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST` | `/api/v1/support/cases`          | `BUYER`                     | Người mua tạo phiếu khiếu nại / sự cố vận chuyển đối với đơn hàng đã nhận. Payload gồm: `orderId`, `type` (`DAMAGE`, `WRONG_ITEM`, `LATE_DELIVERY`), `description`, `evidenceUrls` (ảnh chụp mở hộp/video). |
| `GET`  | `/api/v1/support/cases/my-cases` | `BUYER`                     | Người mua tra cứu danh sách và trạng thái xử lý các yêu cầu hỗ trợ / khiếu nại của chính mình.                                                                                                              |
| `GET`  | `/api/v1/support/cases/:id`      | `BUYER` (chính chủ) / Staff | Xem chi tiết tiến độ giải quyết một vụ việc khiếu nại.                                                                                                                                                      |

---

### 2.4. Notification Service (`backend/notification-service/`)

**Mục tiêu:** Thông báo thời gian thực về tiến trình đơn hàng và cập nhật hệ thống cho Người mua (SRS 3.2.3).

| Method | Endpoint                            | Quyền hạn               | Mô tả chi tiết                                                                                                                               |
| :----- | :---------------------------------- | :---------------------- | :------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/api/v1/notifications`             | `BUYER` / Authenticated | Lấy danh sách thông báo theo `userId` (Thông báo đơn hàng, Trạng thái vận chuyển GHN, Kết quả hoàn tiền). Hỗ trợ đánh dấu đã đọc (`isRead`). |
| `PUT`  | `/api/v1/notifications/:id/read`    | `BUYER` / Authenticated | Đánh dấu thông báo là đã đọc.                                                                                                                |
| `PUT`  | `/api/v1/notifications/preferences` | `BUYER` / Authenticated | Cài đặt tùy chọn nhận thông báo qua Email, SMS hoặc Web Push.                                                                                |

---

### 2.5. Auction Service (`backend/auction-service/`)

**Mục tiêu:** Bàn giao giao dịch thắng đấu giá sang luồng Checkout của Commerce Service.

- **Luồng tích hợp:**
  1. Khi một phiên đấu giá kết thúc thành công với người thắng (`winnerId`), `auction-service` phát sinh sự kiện hoặc gọi API nội bộ sang `commerce-service`.
  2. Người thắng cuộc đấu giá được điều hướng tới màn hình Checkout với thông tin sản phẩm và giá trúng thầu (`finalBidAmount`), gọi API `POST /api/v1/orders/checkout` để khởi tạo đơn hàng với loại `AUCTION_SETTLEMENT`.
  3. Sau khi người mua hoàn tất thanh toán, `commerce-service` phát thông báo xác nhận để `auction-service` đóng hoàn toàn trạng thái phiên đấu giá.

---

## 3. Trạng thái hiện tại của Commerce Service (`backend/commerce-service/`)

Phía `backend/commerce-service` do Hùng phụ trách hiện **ĐÃ HOÀN TẤT ĐẦY ĐỦ 100% CÁC API VÀ ĐÃ PASS TẤT CẢ TEST**:

1. **Cart Subsystem (Giỏ hàng):**
   - `GET /api/v1/cart`: Lấy giỏ hàng chi tiết kèm `imageUrl`, `availability` (`AVAILABLE`, `OUT_OF_STOCK`, `UNAVAILABLE`), và thông tin nhà bán.
   - `POST /api/v1/cart/items`: Thêm sản phẩm vào giỏ hàng với kiểm tra số lượng tồn kho thực tế qua Catalog Service (`HttpCatalogClient`).
   - `PUT /api/v1/cart/items/:id`: Cập nhật số lượng sản phẩm trong giỏ với xác thực tồn kho.
   - `DELETE /api/v1/cart/items/:id`: Xóa sản phẩm khỏi giỏ hàng.
   - `DELETE /api/v1/cart`: Làm rỗng toàn bộ giỏ hàng (tự động kích hoạt khi thanh toán COD hoặc PayOS PAID webhook).
   - Khóa phân tán bảo vệ Concurrency (`MAX_ACTIVE_CART_PER_USER = 1`).

2. **Checkout & Payments:**
   - `POST /api/v1/checkout/quote`: Báo giá tổng đơn hàng kèm phí vận chuyển GHN động theo trọng lượng/địa chỉ.
   - `POST /api/v1/orders/checkout`: Khởi tạo đơn hàng bền vững trong PostgreSQL.
   - `POST /api/v1/orders/:id/payment-link`: Tạo link thanh toán PayOS QRCode thực.
   - `GET /api/v1/orders/:id/payment-status`: Tra cứu trạng thái thanh toán đơn hàng.
   - `POST /api/v1/payments/payos/webhook`: Webhook đồng bộ tự động với cổng PayOS.

3. **Orders (Lịch sử & Chi tiết):**
   - `GET /api/v1/orders/my-orders`: **API mới dành riêng cho BUYER** xem lịch sử đơn hàng cá nhân, chống hoàn toàn IDOR, hỗ trợ tìm kiếm từ khóa `q`, lọc `status`, sắp xếp và phân trang.
   - `GET /api/v1/orders/:id`: Xem chi tiết đơn hàng (bảo vệ IDOR cho BUYER và SELLER).
   - `POST /api/v1/orders/:id/cancel`: Hủy đơn hàng (BUYER được tự hủy khi đơn chưa vận chuyển).
   - `POST /api/v1/orders/:id/refund/request`: Người mua gửi yêu cầu trả hàng / hoàn tiền kèm lý do và chứng cứ.
   - `GET /api/v1/orders`: Dành riêng cho SUPPORT_STAFF và ADMIN tra cứu toàn sàn (trả về 403 đối với BUYER theo đúng chuẩn RBAC).
