# Commerce Checkout, Orders & Cart (Admin/Buyer — Hùng)

Nhánh: `feat/be-commerce-checkout-order`.

## Đã làm

| #   | Endpoint                                | Ghi chú                                                                                                                                                       |
| --- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `GET /api/v1/orders`                    | Nối PostgreSQL `commerce_orders`; tự động gán `buyerId` nếu là Buyer; phân trang, lọc status, search `q`, sort.                                               |
| 2   | `GET /api/v1/orders/:id`                | Nối PostgreSQL, kiểm tra quyền sở hữu (Buyer chỉ xem đơn của mình, Staff/Admin xem toàn sàn).                                                                 |
| 3   | `POST /api/v1/orders/:id/cancel`        | Hỗ trợ Buyer tự hủy đơn khi đơn chưa giao (PENDING/PROCESSING), giải phóng tồn kho giữ trong DB. Staff/Admin vẫn giữ nguyên quyền hủy.                        |
| 4   | `POST /api/v1/checkout/quote`           | Buyer JWT; tính hàng + ship; `quoteId`, `expiresAt` (15'), `VND`; 422 `SHIPPING_NOT_SUPPORTED`, `MIXED_SELLERS_NOT_SUPPORTED`.                                |
| 5   | `POST /api/v1/orders/checkout`          | Hỗ trợ `paymentMethod: 'PAYOS' \| 'COD'`. COD tạo đơn `PROCESSING` ngay không cần QR; PayOS giữ nguyên link thanh toán.                                       |
| 6   | `POST /api/v1/orders/:id/payment-link`  | Tái dùng link đang mở; `{ "renew": true }` tạo link mới; tối đa 3 lần/đơn; đơn đã trả/hết hạn bị từ chối.                                                     |
| 7   | `POST /api/v1/payments/payos/webhook`   | Xác thực chữ ký HMAC-SHA256 (sai → 401); khớp `orderCode` + số tiền; idempotent (`PAID`/`DUPLICATE`/`AMOUNT_MISMATCH`/`UNKNOWN_ORDER_CODE`/`PAYMENT_FAILED`). |
| 8   | `GET /api/v1/orders/:id/payment-status` | Đọc từ DB, chỉ Buyer sở hữu đơn (người khác → 404).                                                                                                           |
| 9   | `GET/POST/PUT/DELETE /api/v1/cart`      | Bộ API Giỏ hàng đồng bộ PostgreSQL (`commerce_carts` & `commerce_cart_items`), tra cứu giá/tồn kho Catalog thời gian thực; đã bổ sung `imageUrl: string       | null`, `availability`, và fallback an toàn khi Catalog lỗi (Commit `5cf7ac2`). |

File mới:

- `backend/commerce-service/src/infrastructure/repositories/PostgresOrderRepository.ts`
- `backend/commerce-service/src/infrastructure/repositories/PostgresCartRepository.ts`
- `backend/commerce-service/src/application/cart/CartService.ts`
- `backend/commerce-service/src/interfaces/http/controllers/CartController.ts`
- `backend/commerce-service/src/interfaces/http/routes/CartRoutes.ts`
- `docs/be-commerce-shared-changes-note.md` (Tài liệu chi tiết gửi Nhóm 1)
- `frontend/docs/api-handoff-buyer-orders.md` (Tài liệu bàn giao FE)

## Thông báo thay đổi cho Nhóm 1 (Seller & Support Staff)

Chi tiết xem tại file: [`docs/be-commerce-shared-changes-note.md`](./be-commerce-shared-changes-note.md).

- Đã chuyển `orderRepository` trong `app.ts` từ `InMemoryOrderRepository` sang `PostgresOrderRepository` để đồng bộ đơn hàng thật của Buyer.
- Support Staff và Admin vẫn có toàn quyền tra cứu, xem chi tiết, hủy và hoàn tiền toàn bộ đơn hàng trên hệ thống.
- Cập nhật `requireOrderPermission` trong `auth.ts` cấp thêm quyền `LIST` và `CANCEL` cho Buyer (không ảnh hưởng quyền cũ của Staff/Seller/Admin).

## Chưa làm / Tạm hoãn theo chỉ đạo

- `POST /orders/:id/checkout` (đơn thắng đấu giá): thuộc Auction Service, không đụng vào.
- Trừ tồn kho Catalog sau khi thanh toán: dính tới Catalog Service của Thành, tạm hoãn để phối hợp chốt contract.
