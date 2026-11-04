# Commerce Checkout & PayOS (Admin/Buyer — Hùng)

Nhánh: `feat/be-commerce-checkout-payos`. Chỉ thêm file mới, không sửa code Seller/Staff/Auction.

## Đã làm

| #   | Endpoint                                | Ghi chú                                                                                                                                                      |
| --- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 8   | `POST /api/v1/checkout/quote`           | Buyer JWT; tính hàng + ship; `quoteId`, `expiresAt` (15'), `VND`; 422 `SHIPPING_NOT_SUPPORTED`, `MIXED_SELLERS_NOT_SUPPORTED`                                |
| 9   | `POST /api/v1/orders/checkout`          | Buyer JWT bắt buộc; giá tính lại ở server; giữ hàng 30'; snapshot địa chỉ; `Idempotency-Key`; trả `orderId`, `checkoutUrl`. 503 nếu chưa cấu hình PayOS      |
| 10  | `POST /api/v1/orders/:id/payment-link`  | Tái dùng link đang mở; `{ "renew": true }` tạo link mới; tối đa 3 lần/đơn; đơn đã trả/hết hạn bị từ chối                                                     |
| 11  | `POST /api/v1/payments/payos/webhook`   | Xác thực chữ ký HMAC-SHA256 (sai → 401); khớp `orderCode` + số tiền; idempotent (`PAID`/`DUPLICATE`/`AMOUNT_MISMATCH`/`UNKNOWN_ORDER_CODE`/`PAYMENT_FAILED`) |
| 12  | `GET /api/v1/orders/:id/payment-status` | Đọc từ DB, chỉ Buyer sở hữu đơn (người khác → 404)                                                                                                           |

File mới: `application/checkout/*`, `infrastructure/clients/{HttpCatalogClient,PayOsGateway,FlatRateShippingQuote}.ts`, `infrastructure/repositories/PostgresCheckoutRepository.ts`, `interfaces/http/{controllers/CheckoutController,routes/CheckoutRoutes}.ts`, `prisma/V2__checkout_quotes_payos.sql`, `src/checkout.db.test.ts`.

Chỉnh file dùng chung (đã được duyệt): thêm 1 import + 1 dòng `app.use` trong `commerce-service/src/app.ts`; thêm 2 dòng proxy `/api/v1/checkout`, `/api/v1/payments` trong `api-gateway/src/app.ts`; thêm `pg`, `@types/pg`.

## Chưa làm / hạn chế

- `POST /orders/:id/checkout` (đơn thắng đấu giá): phụ thuộc `auction.won`, chưa làm.
- Đơn tạo bởi checkout nằm trong Postgres; API đơn của Staff đọc repo in-memory nên chưa thấy các đơn này.
- Phí ship và giữ hàng đang dùng adapter tạm (`FlatRateShippingQuote`: `SHIPPING_FLAT_FEE`, mặc định 30000; `SHIPPING_UNSUPPORTED_PROVINCES`). Cần Fulfillment cung cấp API GHN/reservation thật.
- Chưa có job dọn đơn/reservation hết hạn (reservation tự hết hiệu lực theo `expires_at`); chưa trừ tồn kho Catalog sau khi thanh toán.
- Chưa test với PayOS sandbox thật (test dùng gateway giả + chữ ký thật).

## Biến môi trường (không commit giá trị thật)

`PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`, `PAYOS_RETURN_URL`, `PAYOS_CANCEL_URL`, `CATALOG_SERVICE_URL`, `COMMERCE_DB_HOST/PORT/USER/PASSWORD/NAME`. Webhook thật cần URL public.

## Gợi ý cho nhóm 1

- `GET /orders/:id` (code cũ) chưa kiểm tra quyền sở hữu của Buyer.
- `POST /orders/checkout` skeleton cũ nay bị route mới che (không bị xóa).

## Chạy test

```
$env:COMMERCE_DB_TEST='true'; npx --no-install tsx --test src/checkout.db.test.ts
```

(Docker `nexus-postgres-commerce`, đã áp dụng V1 + V2.)
