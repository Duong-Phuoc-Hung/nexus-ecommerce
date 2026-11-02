# Tài liệu Bàn giao API Backend — Phân hệ Buyer & Commerce

**Người phụ trách BE:** Đào Lý Phi Hùng  
**Người nhận bàn giao (FE Buyer):** Nghi Phạm  
**Thời gian bàn giao:** 31/10/2026  
**Cổng API Gateway:** `http://localhost:4000/api/v1`  
**Swagger UI trực quan:** `http://localhost:4000/api-docs` (chọn tab _Commerce Service_)

---

## 1. Danh sách Endpoint hoàn chỉnh

Tất cả các route dưới đây đều yêu cầu Header:  
`Authorization: Bearer <accessToken>` (Tài khoản vai trò `BUYER`).

| #   | Chức năng                           | Phương thức | Endpoint Gateway            |      Trạng thái BE       |
| --- | ----------------------------------- | :---------: | --------------------------- | :----------------------: |
| 1   | **Xem lịch sử đơn mua**             |    `GET`    | `/api/v1/orders`            |    🟢 PostgreSQL thật    |
| 2   | **Xem chi tiết đơn hàng**           |    `GET`    | `/api/v1/orders/:id`        |    🟢 PostgreSQL thật    |
| 3   | **Người mua tự hủy đơn**            |   `POST`    | `/api/v1/orders/:id/cancel` |    🟢 PostgreSQL thật    |
| 4   | **Đặt hàng (Checkout PayOS & COD)** |   `POST`    | `/api/v1/orders/checkout`   | 🟢 Đã hỗ trợ COD & PayOS |
| 5   | **Tính trước giá & phí ship**       |   `POST`    | `/api/v1/checkout/quote`    |     🟢 Đã hoàn thành     |
| 6   | **Lấy giỏ hàng của tài khoản**      |    `GET`    | `/api/v1/cart`              |    🟢 PostgreSQL thật    |
| 7   | **Thêm sản phẩm vào giỏ**           |   `POST`    | `/api/v1/cart/items`        |    🟢 PostgreSQL thật    |
| 8   | **Cập nhật số lượng món hàng**      |    `PUT`    | `/api/v1/cart/items/:id`    |    🟢 PostgreSQL thật    |
| 9   | **Xóa món hàng khỏi giỏ**           |  `DELETE`   | `/api/v1/cart/items/:id`    |    🟢 PostgreSQL thật    |
| 10  | **Xóa sạch giỏ hàng**               |  `DELETE`   | `/api/v1/cart`              |    🟢 PostgreSQL thật    |

---

## 2. Chi tiết từng API & Mẫu dữ liệu

### 2.1. Xem danh sách đơn mua của tôi (`GET /api/v1/orders`)

- **Mô tả:** Trả về danh sách đơn hàng đã mua của Buyer đang đăng nhập (tự động lọc theo `buyer_id` trong JWT token, không lộ đơn của người khác).
- **Query Parameters:**
  - `page`: Số trang (mặc định `1`).
  - `limit`: Số đơn/trang (mặc định `10`).
  - `status`: Lọc theo trạng thái (`PENDING`, `PAID`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`).
  - `q`: Tìm kiếm theo mã đơn hoặc họ tên người nhận.
  - `sortBy`: `createdAt` (mặc định) hoặc `totalAmount`.
  - `sortOrder`: `desc` (mặc định) hoặc `asc`.

- **Response thành công (`200 OK`):**

```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "buyer": "Nguyễn Văn Buyer",
      "email": "0901234567",
      "seller": "Seller #1",
      "product": "Tai nghe không dây Nexus Air",
      "date": "31/10/2026",
      "total": 1320000,
      "totalAmount": 1320000,
      "status": "PROCESSING",
      "tracking": "ORD-20261031-000001",
      "itemsCount": 1,
      "createdAt": "2026-10-31T17:00:00.000Z",
      "updatedAt": "2026-10-31T17:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

### 2.2. Xem chi tiết đơn hàng (`GET /api/v1/orders/:id`)

- **Mô tả:** `:id` có thể truyền ID số (ví dụ `1`) hoặc mã đơn (`ORD-20261031-000001`).
- **Response thành công (`200 OK`):**

```json
{
  "success": true,
  "data": {
    "id": "1",
    "buyerId": "usr_buyer_01",
    "buyer": "Nguyễn Văn Buyer",
    "email": "0901234567",
    "sellerId": "1",
    "seller": "Seller #1",
    "product": "Tai nghe không dây Nexus Air",
    "date": "31/10/2026",
    "total": 1320000,
    "totalAmount": 1320000,
    "status": "PROCESSING",
    "tracking": "ORD-20261031-000001",
    "itemsCount": 1,
    "items": [
      {
        "productId": "1",
        "productName": "Tai nghe không dây Nexus Air",
        "quantity": 1,
        "unitPrice": 1290000,
        "totalPrice": 1290000
      }
    ],
    "timeline": [
      {
        "status": "CREATED",
        "title": "Đơn hàng được khởi tạo",
        "timestamp": "2026-10-31T17:00:00.000Z"
      }
    ],
    "createdAt": "2026-10-31T17:00:00.000Z",
    "updatedAt": "2026-10-31T17:00:00.000Z"
  }
}
```

---

### 2.3. Đặt hàng với COD hoặc PayOS (`POST /api/v1/orders/checkout`)

- **Mô tả:** Nhận thêm trường `paymentMethod: 'COD' | 'PAYOS'` (mặc định `'PAYOS'`).
- **Request Body mẫu cho COD:**

```json
{
  "paymentMethod": "COD",
  "items": [{ "productId": "1", "quantity": 1 }],
  "shippingAddress": {
    "fullName": "Nguyễn Văn Buyer",
    "phone": "0901234567",
    "province": "Hồ Chí Minh",
    "district": "Quận 1",
    "ward": "Bến Nghé",
    "addressLine": "123 Lê Lợi",
    "country": "VN"
  }
}
```

- **Response thành công COD (`201 Created`):**

```json
{
  "success": true,
  "data": {
    "orderId": "1",
    "orderCode": "ORD-20261031-000001",
    "status": "PROCESSING",
    "paymentMethod": "COD",
    "currency": "VND",
    "subtotal": 1290000,
    "shippingFee": 30000,
    "totalAmount": 1320000,
    "expiresAt": "2026-10-31T17:15:00.000Z",
    "checkoutUrl": null,
    "paymentLinkId": null
  }
}
```

_(Nếu `paymentMethod: 'PAYOS'`, BE sẽ trả link `checkoutUrl` để FE mở cổng quét QR như trước)._

---

### 2.4. Người mua tự hủy đơn (`POST /api/v1/orders/:id/cancel`)

- **Quy tắc nghiệp vụ:** Buyer chỉ được hủy đơn của chính mình khi đơn còn ở trạng thái `PENDING_PAYMENT` hoặc `PROCESSING` (chưa giao `SHIPPED`).
- **Request Body:**

```json
{
  "reason": "Tôi muốn đổi địa chỉ nhận hàng"
}
```

- **Response thành công (`200 OK`):**

```json
{
  "success": true,
  "message": "Đơn hàng đã được hủy thành công.",
  "data": {
    "id": "1",
    "status": "CANCELLED"
  }
}
```

---

### 2.5. Đồng bộ Giỏ hàng Backend (`/api/v1/cart`)

#### A. Lấy giỏ hàng (`GET /api/v1/cart`)

- **Response (`200 OK`):**

```json
{
  "success": true,
  "data": {
    "id": "1",
    "userId": "usr_buyer_01",
    "expiresAt": "2026-11-07T17:00:00.000Z",
    "totalItems": 2,
    "subtotal": 2580000,
    "currency": "VND",
    "items": [
      {
        "id": "1",
        "productId": "1",
        "title": "Tai nghe không dây Nexus Air",
        "sellerId": "1",
        "price": 1290000,
        "stockQuantity": 50,
        "status": "ACTIVE",
        "quantity": 2,
        "subtotal": 2580000,
        "imageUrl": "https://example.com/images/air.jpg",
        "availability": "AVAILABLE"
      }
    ]
  }
}
```

> [!NOTE] Cập nhật Contract Giỏ hàng mới nhất (Commit `5cf7ac2`):
>
> - **Ảnh đại diện (`imageUrl`)**: Đã bổ sung trường `imageUrl: string | null` trong mỗi item để FE render trực tiếp giao diện (tự động mapping từ `primaryImage` hoặc `images` của Catalog).
> - **Trạng thái khả dụng (`availability`)**: Bổ sung `availability: 'AVAILABLE' | 'UNAVAILABLE' | 'UNKNOWN'` để FE hiển thị rõ ràng trên UI và tạm khóa nút thanh toán nếu món hàng chưa xác minh được tồn kho.
> - **Fallback an toàn**: Khi Catalog gặp sự cố hoặc timeout, BE trả về `stockQuantity: 0`, `status: 'UNKNOWN'`, `availability: 'UNKNOWN'`, `imageUrl: null` (tuyệt đối không giả định `stockQuantity: 99`). Nếu gọi `POST /cart/items` trong lúc Catalog lỗi, BE trả về HTTP `503 CATALOG_UNAVAILABLE` rõ ràng để FE hiển thị thông báo.

#### B. Thêm vào giỏ (`POST /api/v1/cart/items`)

- **Request Body:**

```json
{
  "productId": "1",
  "quantity": 1
}
```

#### C. Sửa số lượng (`PUT /api/v1/cart/items/:id`)

- `:id` có thể là ID item trong giỏ hoặc `productId`.
- **Request Body:**

```json
{
  "quantity": 3
}
```

#### D. Xóa 1 món hàng (`DELETE /api/v1/cart/items/:id`)

---

## 3. Mã Axios mẫu cho Frontend (`src/modules/commerce/api/orders.api.ts`)

Bạn Nghi có thể copy trực tiếp đoạn mã này vào file adapter của FE:

```typescript
import { apiClient } from '@/lib/axios/api-client';

export const ordersApi = {
  // 1. Lấy danh sách đơn mua
  getMyOrders: async (params?: { page?: number; limit?: number; status?: string; q?: string }) => {
    const res = await apiClient.get('/orders', { params });
    return res.data;
  },

  // 2. Chi tiết đơn hàng
  getOrderDetail: async (orderId: string | number) => {
    const res = await apiClient.get(`/orders/${orderId}`);
    return res.data;
  },

  // 3. Người mua tự hủy đơn
  cancelOrder: async (orderId: string | number, reason?: string) => {
    const res = await apiClient.post(`/orders/${orderId}/cancel`, { reason });
    return res.data;
  },

  // 4. Đặt hàng (Checkout COD hoặc PayOS)
  checkout: async (payload: {
    paymentMethod: 'COD' | 'PAYOS';
    items: Array<{ productId: string; quantity: number }>;
    shippingAddress: {
      fullName: string;
      phone: string;
      province: string;
      district?: string;
      ward?: string;
      addressLine: string;
    };
  }) => {
    const res = await apiClient.post('/orders/checkout', payload);
    return res.data;
  },
};

export const cartApi = {
  // Lấy giỏ hàng
  getCart: async () => {
    const res = await apiClient.get('/cart');
    return res.data;
  },

  // Thêm vào giỏ
  addItem: async (productId: string | number, quantity: number = 1) => {
    const res = await apiClient.post('/cart/items', { productId: String(productId), quantity });
    return res.data;
  },

  // Sửa số lượng
  updateItem: async (itemIdOrProductId: string | number, quantity: number) => {
    const res = await apiClient.put(`/cart/items/${itemIdOrProductId}`, { quantity });
    return res.data;
  },

  // Xóa khỏi giỏ
  removeItem: async (itemIdOrProductId: string | number) => {
    const res = await apiClient.delete(`/cart/items/${itemIdOrProductId}`);
    return res.data;
  },
};
```
