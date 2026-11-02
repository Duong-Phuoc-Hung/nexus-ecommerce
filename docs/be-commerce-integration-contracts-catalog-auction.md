# HỢP ĐỒNG TÍCH HỢP LIÊN SERVICE (INTER-SERVICE CONTRACT SPECIFICATION)

## COMMERCE SERVICE $\leftrightarrow$ CATALOG SERVICE & AUCTION SERVICE

**Tác giả:** Đào Lý Phi Hùng (Backend Engineer — Phụ trách Commerce Bounded Context)  
**Ngày lập:** 02/11/2026  
**Căn cứ kiến trúc:** Tuân thủ `AI_RULES.md`, Nguyên tắc Bounded Context & Clean Architecture (Hexagonal Architecture / Ports & Adapters).

---

## 1. NGUYÊN TẮC RANH GIỚI BẮT BUỘC (BOUNDARY RULES)

1. **Tuyệt đối không sửa code của service khác:**
   - `catalog-service` (do bạn Thành / nhóm Catalog phụ trách).
   - `auction-service` (do nhóm Auction phụ trách).
   - Commerce Service **chỉ đóng vai trò là Client tiêu thụ (API Consumer)** hoặc **Subscriber lắng nghe Event**, không can thiệp vào Source code, Database hay Business logic nội bộ của Catalog và Auction.
2. **Giao tiếp qua Hợp đồng công khai (Public Contracts):**
   - Chỉ gọi qua REST API chuẩn (`/api/v1/*`) hoặc phát tán/lắng nghe Domain Events qua Redis Event Bus (`@nexus/events`).
   - Mọi tương tác trong Commerce Service bắt buộc đi qua tầng **Anti-Corruption Layer (ACL)**: `ICatalogClient` và `HttpCatalogClient`.

---

## 2. NHU CẦU TÍCH HỢP VỚI CATALOG SERVICE (CỔNG 4002)

Commerce Service (Giỏ hàng & Đặt hàng) cần phối hợp với Catalog Service qua 3 API sau:

```
+------------------+         REST API (HTTP)         +------------------+
| Commerce Service | ------------------------------> | Catalog Service  |
|  (Cart & Orders) | <------------------------------ |  (Products/Stock)|
+------------------+                                 +------------------+
```

### 2.1. API Tra cứu thông tin sản phẩm (Đang sử dụng)

- **Phương thức:** `GET`
- **Endpoint:** `/api/v1/products/:id` (hoặc `/api/v1/catalog/products/:id`)
- **Mục đích:** Commerce gọi để kiểm tra sản phẩm có tồn tại không, trạng thái có đang mở bán (`status === 'ACTIVE'`) không, đơn giá và số lượng tồn kho thực tế (`stockQuantity`) nhằm ngăn chặn thêm vào giỏ vượt tồn kho hoặc mua hàng không hợp lệ.
- **Hợp đồng Response mong muốn từ Catalog:**
  ```json
  {
    "success": true,
    "data": {
      "id": "101",
      "sellerId": "seller_01",
      "title": "Áo Thun Nam Cotton Cao Cấp",
      "price": 250000,
      "stockQuantity": 50,
      "status": "ACTIVE"
    }
  }
  ```
- **Hiện trạng phía Commerce:** Đã triển khai xong `HttpCatalogClient.ts` để gọi API này với cơ chế timeout 5 giây và xử lý lỗi an toàn.

---

### 2.2. API Khấu trừ tồn kho thật khi chốt đơn (Đề xuất Catalog triển khai)

- **Vấn đề hiện tại:** Khi khách đặt hàng thành công (hoặc thanh toán PayOS/COD), Commerce Service chỉ tạm giữ kho trong bảng nội bộ `commerce_stock_reservations`. Tồn kho gốc trong bảng `catalog_products` của Catalog vẫn chưa bị trừ thực tế.
- **Phương thức:** `POST`
- **Endpoint đề xuất:** `/api/v1/catalog/products/:id/deduct-stock`
- **Quyền hạn:** Service-to-Service (nội bộ hệ thống)
- **Request Body:**
  ```json
  {
    "orderId": "ORD-20261102-001",
    "quantity": 2,
    "reason": "ORDER_PAYMENT_COMPLETED"
  }
  ```
- **Response mong muốn:**
  ```json
  {
    "success": true,
    "message": "Đã trừ tồn kho thành công.",
    "data": {
      "productId": "101",
      "previousStock": 50,
      "remainingStock": 48
    }
  }
  ```
- _(Gợi ý thay thế: Nếu nhóm Catalog muốn dùng Event-Driven, Commerce sẵn sàng phát sự kiện `OrderPlacedEvent` lên Redis để Catalog tự subscribe và trừ kho)_.

---

### 2.3. Phân hệ Danh sách yêu thích (Favorites)

- **Hiện trạng:** Frontend đang lưu tạm danh sách yêu thích ở `localStorage (nexus-favorites-v1)`.
- **Đề xuất cho nhóm Catalog/User:** Nếu chuyển sang lưu trữ trên Database máy chủ, đề xuất nhóm Catalog hoặc User xây dựng 2 endpoints:
  - `GET /api/v1/favorites`: Lấy danh sách sản phẩm yêu thích của Buyer.
  - `POST /api/v1/favorites/:productId`: Thêm/Xóa sản phẩm khỏi danh sách yêu thích.
- Phía Commerce Service không can thiệp vào phân hệ này.

---

## 3. NHU CẦU TÍCH HỢP VỚI AUCTION SERVICE (CỔNG 4004)

Commerce Service và Auction Service tương tác tại điểm giao thoa: **Người thắng đấu giá thực hiện thanh toán (Auction Settlement & Checkout)**.

```
       [Đấu giá kết thúc]
      +------------------+
      |  Auction Service |
      +------------------+
               |
               | (1) Phát sự kiện: AuctionWonEvent
               v
      +------------------+
      | Commerce Service | ----> (2) Tạo đơn hàng thanh toán
      | (Checkout/Orders)| ----> (3) Sinh link VietQR PayOS / COD
      +------------------+
```

### 3.1. Kịch bản 1: Event-Driven qua Redis (Khuyến nghị cao nhất)

1. Khi phiên đấu giá kết thúc thành công (`status = 'SETTLED'`), **Auction Service** phát sự kiện:
   - **Event Type:** `AUCTION_SETTLED` hoặc `AUCTION_WON`
   - **Payload đề xuất:**
     ```json
     {
       "auctionId": "auc_999",
       "winnerId": "usr_buyer_123",
       "sellerId": "usr_seller_456",
       "productId": "prod_101",
       "productTitle": "Đồng hồ cổ quý hiếm",
       "finalBidAmount": 5500000,
       "settledAt": "2026-11-02T01:00:00.000Z"
     }
     ```
2. **Commerce Service** lắng nghe sự kiện này và tự động:
   - Tạo đơn hàng trong `commerce_orders` với trạng thái `PENDING_PAYMENT`.
   - Giữ tồn kho món đồ đấu giá cho người thắng.
   - Gửi thông báo đến Buyer kèm link thanh toán.

---

### 3.2. Kịch bản 2: Gọi trực tiếp API Checkout của Commerce

Nếu nhóm Auction muốn xử lý đồng bộ qua REST API, Auction Service chỉ cần chuyển hướng hoặc gọi API Checkout sẵn có của Commerce:

- **Endpoint:** `POST /api/v1/orders/checkout`
- **Request Body:**
  ```json
  {
    "paymentMethod": "PAYOS",
    "isAuction": true,
    "auctionId": "auc_999",
    "items": [
      {
        "productId": "prod_101",
        "quantity": 1,
        "price": 5500000
      }
    ],
    "shippingAddress": {
      "fullName": "Người Thắng Đấu Giá",
      "phone": "0901234567",
      "province": "Hồ Chí Minh",
      "addressLine": "Quận 1"
    }
  }
  ```
- Commerce Service sẽ xử lý sinh mã QR PayOS và xác nhận đơn hàng bình thường.

---

### 3.3. API Tra cứu phiên đấu giá (Auction Service cung cấp)

- **Phương thức:** `GET`
- **Endpoint đề xuất:** `/api/v1/auctions/:id`
- **Mục đích:** Để Commerce Service xác minh người dùng đang thanh toán có đúng là người trả giá cao nhất (`winningBidderId`) của phiên đấu giá hay không, tránh gian lận.

---

## 4. TỔNG KẾT BẢN ĐỒ PHÂN VAI & TRÁCH NHIỆM

| Phân hệ / Bounded Context | Người phụ trách          | Trách nhiệm chính                                              | Giao tiếp với Commerce                      |
| :------------------------ | :----------------------- | :------------------------------------------------------------- | :------------------------------------------ |
| **Commerce Service**      | **Đào Lý Phi Hùng**      | Giỏ hàng, Báo giá, Đặt hàng (COD/PayOS), Quản lý đơn mua Buyer | Độc lập, chỉ gọi API đọc hoặc nhận Event    |
| **Catalog Service**       | **Nhóm Catalog (Thành)** | Danh mục, Sản phẩm, Tồn kho gốc Catalog, Danh mục yêu thích    | Cung cấp `GET /products/:id` và API trừ kho |
| **Auction Service**       | **Nhóm Auction**         | Đặt giá (Bidding), Quản lý phòng đấu giá, Xác định người thắng | Cung cấp thông tin phiên thắng để chốt đơn  |
