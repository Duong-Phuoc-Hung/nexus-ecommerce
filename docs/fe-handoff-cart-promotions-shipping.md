# Tài Liệu Bàn Giao API Cho Frontend (FE Handoff)

## Phân Hệ: Giỏ Hàng Nâng Cao, Mã Giảm Giá & Chọn Gói Vận Chuyển

> **Người thực hiện:** Đào Lý Phi Hùng (Backend Buyer & Commerce)  
> **Nhánh Git Backend:** `feat/be-commerce-cart-promotions-shipping`  
> **Mục tiêu:** Cung cấp tài liệu tích hợp API chi tiết (Request, Response, Enum, Error Code) cho đội ngũ Frontend triển khai giao diện theo đúng hợp đồng dữ liệu.

---

## 📌 Tổng Quan Cổng API & Xác Thực

- **Base URL Gateway:** `http://localhost:4000/api/v1` (toàn bộ proxy đã tự động trỏ về Commerce Service).
- **Headers bắt buộc (cho tất cả API của Buyer):**
  ```http
  Authorization: Bearer <buyer_jwt_token>
  Content-Type: application/json
  ```
- **Quyền hạn yêu cầu:** Role `BUYER`.

---

## 1. 🛒 Màn Hình Giỏ Hàng (SRS B05)

### 1.1. Lấy thông tin giỏ hàng & Biến động tồn kho / giá

- **Endpoint:** `GET /api/v1/cart`
- **Mục đích:** Khi người dùng mở trang giỏ hàng (`/cart`), gọi API này để hệ thống tự động đối chiếu thời gian thực với Catalog Service.
- **Response (`200 OK`):**

```json
{
  "success": true,
  "data": {
    "id": "1",
    "userId": "01932f01-0001-7000-8000-000000000001",
    "totalItems": 2,
    "items": [
      {
        "id": "1",
        "productId": "01932f01-0001-7000-8000-000000000001",
        "title": "iPhone 15 Pro Max 256GB",
        "imageUrl": "https://example.com/iphone15.jpg",
        "sellerId": "seller-001",
        "quantity": 1,
        "snapshotUnitPrice": 28990000,
        "currentUnitPrice": 29490000,
        "availableStock": 10,
        "productStatus": "ACTIVE",
        "itemStatus": "PRICE_CHANGED",
        "warningMessage": "Giá sản phẩm vừa tăng từ 28.990.000 ₫ lên 29.490.000 ₫.",
        "canCheckout": true,
        "subtotal": 29490000
      }
    ],
    "summary": {
      "subtotal": 29490000,
      "estimatedDiscount": 0,
      "estimatedTax": 0,
      "estimatedShipping": null,
      "estimatedTotal": 29490000,
      "currency": "VND"
    },
    "hasBlockingIssues": false,
    "validatedAt": "2026-11-22T12:00:00.000Z"
  }
}
```

- **Hướng dẫn xử lý cho Frontend:**
  - `hasBlockingIssues === true`: **Disable nút "Tiến hành thanh toán"**.
  - Kiểm tra `itemStatus` từng món để hiển thị badge và `warningMessage`:
    - `OK`: Bình thường, cho phép mua (`canCheckout: true`).
    - `PRICE_CHANGED`: Giá vừa đổi so với lúc bỏ vào giỏ (`canCheckout: true`, hiển thị tooltip cảnh báo giá cũ và giá mới).
    - `INSUFFICIENT_STOCK`: Số lượng đặt vượt tồn kho (`canCheckout: false`, yêu cầu giảm số lượng).
    - `OUT_OF_STOCK`: Tồn kho = 0 (`canCheckout: false`, hiển thị nhãn "Hết hàng").
    - `UNAVAILABLE`: Sản phẩm đã bị xóa hoặc ngừng bán (`canCheckout: false`).

---

### 1.2. Xác thực giỏ hàng khi chọn một phần / nhập voucher

- **Endpoint:** `POST /api/v1/cart/validate`
- **Mục đích:** Dùng khi người mua chỉ tích chọn mua một vài món trong giỏ (ví dụ giỏ có 5 món nhưng chỉ tích chọn 2 món), hoặc khi người mua nhập thử mã giảm giá ngay tại giỏ hàng.
- **Request Body:**

```json
{
  "items": [
    {
      "productId": "01932f01-0001-7000-8000-000000000001",
      "quantity": 1
    }
  ],
  "promoCode": "NEXUS50K"
}
```

- **Response (`200 OK`):** Trả về trạng thái của các món được chọn, `summary` có trừ `estimatedDiscount` và khối `promo`.

---

## 2. 🎟️ Mã Giảm Giá & Khuyến Mãi (SRS B14)

### 2.1. Lấy danh sách voucher công khai để chọn nhanh

- **Endpoint:** `GET /api/v1/checkout/promotions`
- **Query Params (tùy chọn nhưng khuyến nghị truyền):**
  - `?subtotal=600000`: Backend sẽ tính sẵn voucher nào đủ điều kiện dùng cho đơn hiện tại.
- **Response (`200 OK`):**

```json
{
  "success": true,
  "data": [
    {
      "code": "NEXUS50K",
      "name": "Giảm 50.000 ₫ cho đơn từ 500.000 ₫",
      "description": "Voucher ưu đãi mua sắm Nexus E-Commerce toàn sàn",
      "discountType": "FIXED",
      "discountValue": 50000,
      "maxDiscountAmount": 50000,
      "minOrderAmount": 500000,
      "endsAt": "2027-11-22T12:00:00.000Z",
      "eligible": true,
      "estimatedDiscount": 50000,
      "ineligibleReason": null
    },
    {
      "code": "FREESHIP",
      "name": "Giảm 30.000 ₫ phí vận chuyển cho đơn từ 200.000 ₫",
      "discountType": "FIXED",
      "discountValue": 30000,
      "minOrderAmount": 200000,
      "endsAt": "2027-11-22T12:00:00.000Z",
      "eligible": false,
      "estimatedDiscount": 0,
      "ineligibleReason": "Đơn tối thiểu 200.000 ₫"
    }
  ]
}
```

- **Hướng dẫn cho FE:**
  - Hiển thị danh sách dạng Card voucher.
  - Nếu `eligible === true`: Nổi bật nút **"Áp dụng"**.
  - Nếu `eligible === false`: Làm mờ nút và hiển thị `ineligibleReason` (ví dụ: _"Đơn tối thiểu 500.000 ₫"_ hoặc _"Bạn đã dùng hết lượt cho mã này"_).

---

### 2.2. Kiểm tra mã giảm giá người mua tự gõ tay

- **Endpoint:** `POST /api/v1/checkout/promotions/validate`
- **Request Body:**

```json
{
  "code": "NEXUS50K",
  "subtotal": 600000,
  "items": [{ "productId": "01932f01-0001-7000-8000-000000000001", "quantity": 1 }]
}
```

- **Response khi thành công (`200 OK` với `valid: true`):**

```json
{
  "success": true,
  "data": {
    "valid": true,
    "code": "NEXUS50K",
    "name": "Giảm 50.000 ₫ cho đơn từ 500.000 ₫",
    "discountAmount": 50000,
    "subtotal": 600000,
    "reasonCode": null,
    "message": "Áp dụng thành công mã NEXUS50K (-50.000 ₫)."
  }
}
```

- **Response khi không hợp lệ (`200 OK` với `valid: false`):**

```json
{
  "success": true,
  "data": {
    "valid": false,
    "code": "NEXUS50K",
    "name": "Giảm 50.000 ₫ cho đơn từ 500.000 ₫",
    "discountAmount": 0,
    "subtotal": 300000,
    "reasonCode": "PROMO_MIN_ORDER_NOT_MET",
    "message": "Đơn hàng chưa đạt giá trị tối thiểu 500.000 ₫ để áp dụng mã này."
  }
}
```

- **Bảng tra cứu `reasonCode` cho FE:**
  - `PROMO_NOT_FOUND`: Mã voucher không tồn tại.
  - `PROMO_EXPIRED`: Mã chưa đến giờ bắt đầu hoặc đã hết hạn.
  - `PROMO_OUT_OF_QUOTA`: Mã đã hết lượt sử dụng trên toàn sàn.
  - `PROMO_USER_LIMIT_REACHED`: Tài khoản người mua đã dùng hết số lần cho phép của mã này.
  - `PROMO_MIN_ORDER_NOT_MET`: Chưa đạt giá trị đơn tối thiểu.

---

## 3. 🚚 Báo Giá & Chọn Gói Vận Chuyển Tại Checkout (SRS B06 / B08)

### 3.1. Tính báo giá (`POST /api/v1/checkout/quote`)

- **Request Body:**

```json
{
  "items": [{ "productId": "01932f01-0001-7000-8000-000000000001", "quantity": 1 }],
  "shippingAddress": {
    "fullName": "Nguyễn Văn Buyer",
    "phone": "0901234567",
    "province": "Hồ Chí Minh",
    "addressLine": "123 Lê Duẩn",
    "country": "VN"
  },
  "promoCode": "NEXUS50K",
  "shippingOptionId": "GHTK_FAST"
}
```

- **Response (`200 OK`):**

```json
{
  "success": true,
  "data": {
    "quoteId": "01934000-0000-7000-8000-000000000099",
    "expiresAt": "2026-11-22T12:15:00.000Z",
    "currency": "VND",
    "sellerId": "seller-001",
    "subtotal": 800000,
    "discountAmount": 50000,
    "taxAmount": 0,
    "shippingFee": 48000,
    "totalAmount": 798000,
    "promo": {
      "code": "NEXUS50K",
      "applied": true,
      "discountAmount": 50000,
      "reasonCode": null
    },
    "selectedShippingOptionId": "GHTK_FAST",
    "shippingOptions": [
      {
        "optionId": "GHN_STANDARD",
        "carrier": "GHN",
        "carrierName": "Giao Hàng Nhanh",
        "serviceName": "Tiêu chuẩn",
        "fee": 32000,
        "etaDaysMin": 2,
        "etaDaysMax": 3,
        "etaText": "Dự kiến 2–3 ngày",
        "estimatedDeliveryAt": "2026-11-25T10:00:00.000Z",
        "recommended": true
      },
      {
        "optionId": "GHTK_FAST",
        "carrier": "GHTK",
        "carrierName": "Giao Hàng Tiết Kiệm",
        "serviceName": "Giao nhanh",
        "fee": 48000,
        "etaDaysMin": 1,
        "etaDaysMax": 2,
        "etaText": "Dự kiến 1–2 ngày",
        "estimatedDeliveryAt": "2026-11-24T10:00:00.000Z",
        "recommended": false
      }
    ]
  }
}
```

- **Hướng dẫn cho FE:**
  - Render Radio Group danh sách `shippingOptions`. Khi Buyer click chọn option khác (ví dụ chuyển từ `GHN_STANDARD` sang `GHTK_FAST`), FE gọi lại API `quote` với `shippingOptionId` mới để lấy tổng tiền chính xác.

---

### 3.2. Chốt đặt hàng (`POST /api/v1/orders/checkout`)

- **Request Body:**

```json
{
  "quoteId": "01934000-0000-7000-8000-000000000099",
  "items": [{ "productId": "01932f01-0001-7000-8000-000000000001", "quantity": 1 }],
  "shippingAddress": {
    "fullName": "Nguyễn Văn Buyer",
    "phone": "0901234567",
    "province": "Hồ Chí Minh",
    "addressLine": "123 Lê Duẩn",
    "country": "VN"
  },
  "paymentMethod": "COD"
}
```

- **Response (`201 Created`):**
  - Trả về `orderId`, `orderCode`, `totalAmount`, `discountAmount`, `shippingFee`, `promoCode`, `shippingCarrier`, `shippingServiceName`, `estimatedDeliveryAt`.
  - Backend tự động đóng băng (freeze snapshot) số tiền và trừ lượt voucher trong cùng transaction DB.

---

### 3.3. Xem chi tiết & Biên nhận điện tử (`GET /api/v1/orders/:id`)

- **Endpoint:** `GET /api/v1/orders/:id`
- **Response (`200 OK`):**
  - Khối biên nhận điện tử trả đầy đủ:
    - `totalAmount`: Tổng tiền thực tế khách đã trả.
    - `discountAmount`: Tiền voucher đã giảm.
    - `promoCode`: Mã voucher đã áp dụng (ví dụ: `"NEXUS50K"`).
    - `shippingCarrier`: Tên hãng ship (ví dụ: `"GHN"` hoặc `"GHTK"`).
    - `shippingServiceName`: Tên gói dịch vụ (ví dụ: `"Tiêu chuẩn"` hoặc `"Giao nhanh"`).
    - `estimatedDeliveryAt`: Ngày dự kiến giao hàng (ISO String).

---

## 4. 🏷️ Danh Sách Mã Voucher Thật Có Sẵn Trong Database Để Test

Frontend có thể dùng ngay 3 mã giảm giá thật đã được nạp sẵn trong DB PostgreSQL:

1. `NEXUS50K`: Giảm 50.000 ₫ cho đơn từ 500.000 ₫ (mỗi user dùng tối đa 2 lần).
2. `FREESHIP`: Giảm 30.000 ₫ cho đơn từ 200.000 ₫ (mỗi user dùng tối đa 3 lần).
3. `WELCOME10`: Giảm 10% (tối đa 100.000 ₫) cho đơn từ 100.000 ₫ (mỗi user dùng tối đa 1 lần).
