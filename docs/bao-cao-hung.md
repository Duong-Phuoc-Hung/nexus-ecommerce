# Báo Cáo Tiến Độ Công Việc – Đào Lý Phi Hùng (Backend Buyer & Commerce)

- **Họ và tên:** Đào Lý Phi Hùng (`hungdlpse172826@fpt.edu.vn`)
- **Phân hệ phụ trách:** Buyer Cart, Orders, Checkout & Thanh toán PayOS (SRS 3.4)
- **Nhánh Git:** `feat/be-commerce-buyer-apis` — **Merge Request:** [!91 trên GitLab](https://git.fsoft-academy.edu.vn/hcm26_cpl_nodejs_01/team1/nexus-ecommerce/-/merge_requests/91)

---

## 1. Tổng hợp các việc đã làm & Vị trí code cụ thể

### 🛒 A. Phân hệ Giỏ hàng (Cart Service)

| Việc đã làm                | Ý nghĩa ngắn gọn                                                                                                  | File thực hiện (Ở đâu)                                                                                                                              |
| :------------------------- | :---------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Trọn bộ 5 API Giỏ hàng** | Thêm, sửa số lượng, xóa 1 món, xóa sạch giỏ, xem giỏ hàng                                                         | `backend/commerce-service/src/interfaces/http/controllers/CartController.ts`<br>`backend/commerce-service/src/interfaces/http/routes/CartRoutes.ts` |
| **Chống Race Condition**   | Dùng PostgreSQL Advisory Lock (`pg_advisory_xact_lock`) để khách bấm thêm giỏ liên tục không bị nhân đôi giỏ hàng | `backend/commerce-service/src/infrastructure/repositories/PostgresCartRepository.ts`                                                                |
| **Kiểm tra tồn kho thật**  | Gọi Catalog Service kiểm tra `stockQuantity`, tự động chặn nếu hết hàng hoặc mua vượt số lượng kho                | `backend/commerce-service/src/application/cart/CartService.ts`                                                                                      |
| **Chuẩn hóa DDD (DIP)**    | Tạo interface `ICartRepository` tách rời lớp lưu trữ, giúp code linh hoạt và dễ test                              | `backend/commerce-service/src/domain/repositories/ICartRepository.ts`                                                                               |

---

### 📦 B. Phân hệ Quản lý Đơn hàng cho Buyer (Order Service)

| Việc đã làm                      | Ý nghĩa ngắn gọn                                                                                      | File thực hiện (Ở đâu)                                                                                                                                     |
| :------------------------------- | :---------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Xem lịch sử đơn mua (200 OK)** | Mở quyền cho Buyer gọi `GET /api/v1/orders` xem danh sách đơn hàng đã mua                             | `backend/commerce-service/src/infrastructure/security/auth.ts`<br>`backend/commerce-service/src/interfaces/http/controllers/OrderController.ts`            |
| **Bảo mật chống IDOR**           | Tự động ép `buyerId = req.user.sub` trong token, Buyer không bao giờ xem trộm được đơn của khách khác | `backend/commerce-service/src/interfaces/http/controllers/OrderController.ts`                                                                              |
| **Xem chi tiết & Timeline**      | Trả về thông tin đơn hàng kèm 9 bước trạng thái và lịch sử cập nhật thời gian thực                    | `backend/commerce-service/src/application/use-cases/GetOrderDetailUseCase.ts`                                                                              |
| **Tự hủy đơn & Khiếu nại**       | Cho phép Buyer tự hủy đơn khi chưa giao (`/cancel`) và gửi yêu cầu hoàn tiền (`/refund/request`)      | `backend/commerce-service/src/application/use-cases/CancelOrderUseCase.ts`<br>`backend/commerce-service/src/application/use-cases/RequestRefundUseCase.ts` |

---

### 💳 C. Phân hệ Thanh toán & Khấu trừ kho (Checkout & Stock)

| Việc đã làm                    | Ý nghĩa ngắn gọn                                                                        | File thực hiện (Ở đâu)                                                                                              |
| :----------------------------- | :-------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------ |
| **Tự động trừ tồn kho**        | Khi đơn thanh toán COD hoặc PayOS thành công, tự động gọi Catalog trừ tồn kho tương ứng | `backend/commerce-service/src/application/checkout/CheckoutService.ts`                                              |
| **Chốt đơn trúng đấu giá**     | Hỗ trợ luồng `AUCTION_SETTLEMENT` thanh toán đúng giá thắng cuộc từ sàn đấu giá         | `backend/commerce-service/src/application/checkout/CheckoutService.ts`                                              |
| **Kiến trúc trừ kho phân tán** | Phase 1 gọi REST an toàn kèm log; Phase 2 định hướng Transactional Outbox qua RabbitMQ  | `backend/commerce-service/src/application/checkout/CheckoutService.ts`<br>`docs/be-commerce-shared-changes-note.md` |

---

### 🗄️ D. Chuẩn hóa Prisma ORM (Theo nhận xét của Thầy & Team)

| Việc đã làm                        | Ý nghĩa ngắn gọn                                                                                | File thực hiện (Ở đâu)                                                                                                                                                                                                                                                    |
| :--------------------------------- | :---------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Chuyển đổi 100% ORM**            | Thay thế toàn bộ SQL thô bằng Prisma Client (`findUnique`, `findMany`, `transaction`)           | `backend/commerce-service/src/infrastructure/repositories/PostgresOrderRepository.ts`<br>`backend/commerce-service/src/infrastructure/repositories/PostgresCartRepository.ts`<br>`backend/commerce-service/src/infrastructure/repositories/PostgresCheckoutRepository.ts` |
| **Chống lỗi môi trường Docker/CI** | Tạo client cô lập tại `generated/client` kèm binary Alpine musl, không bao giờ bị crash OpenSSL | `backend/commerce-service/prisma/schema.prisma`<br>`backend/commerce-service/src/infrastructure/database/PrismaClient.ts`                                                                                                                                                 |

---

### 🧪 E. Kiểm thử tự động & CI/CD

- **Unit test nội bộ Commerce:** Đạt **21/21 passed (100%)** với lệnh `pnpm test`.
- **Kiểm thử kiến trúc toàn dự án:** Đạt **112/112 passed (100%)** qua `npm test`.
- **An toàn code:** Tuân thủ 100% `AI_RULES.md`, chỉ sửa đổi trong `commerce-service` và lockfile, không ảnh hưởng code của bạn khác.

---

## 2. Tiến độ triển khai mới nhất trên nhánh mở rộng (`feat/be-commerce-buyer-extensions`)

| Mã Ticket Jira       | Tên công việc & Tính năng                                                                                                                                                                                                                                                                    | Trạng thái          | Vị trí code triển khai                                                                                                                                                                                                                                                                        |
| :------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SCRUM-167**        | **Gộp giỏ hàng Guest Cart khi Login (`POST /api/v1/cart/merge`)**<br>- Cho phép Buyer lướt xem và nhặt hàng khi chưa đăng nhập (lưu localStorage). Khi Login, BE tự động gộp mảng items vào DB, kiểm tra tồn kho Catalog và cộng dồn số lượng.                                               | **HOÀN THÀNH 100%** | `backend/commerce-service/src/interfaces/http/controllers/CartController.ts`<br>`backend/commerce-service/src/application/cart/CartService.ts`<br>`backend/commerce-service/src/application/cart/dtos/AddToCartDto.ts`<br>`backend/commerce-service/src/interfaces/http/routes/CartRoutes.ts` |
| **SCRUM-173**        | **Background Worker quét hủy đơn quá hạn 15 phút**<br>- Chạy định kỳ mỗi 1 phút quét các đơn `PENDING`/`PENDING_PAYMENT` quá hạn 15 phút chưa thanh toán.<br>- Tự động đổi trạng thái đơn sang `CANCELLED`, ghi timeline, và giải phóng tồn kho `StockReservation` (`ACTIVE` -> `RELEASED`). | **HOÀN THÀNH 100%** | `backend/commerce-service/src/infrastructure/workers/ExpiredOrderCleanupWorker.ts`<br>`backend/commerce-service/src/index.ts`<br>`backend/commerce-service/src/app.ts`                                                                                                                        |
| **SCRUM-290**        | **Chặn xóa địa chỉ mặc định duy nhất (User Service)**<br>- Nghiệp vụ bảo vệ: Không cho phép xóa địa chỉ giao hàng nếu đó là địa chỉ mặc định duy nhất còn lại trong sổ địa chỉ.                                                                                                              | **HOÀN THÀNH 100%** | `backend/user-service/src/application/use-cases/DeleteAddressUseCase.ts`<br>`backend/user-service/src/address-and-profile.test.ts`                                                                                                                                                            |
| **Kiểm thử tự động** | **Suite test tự động toàn diện**<br>- Bao phủ validation DTO, gộp giỏ hàng, hủy đơn hết hạn và nhả kho: **100% PASS**.                                                                                                                                                                       | **HOÀN THÀNH 100%** | `backend/commerce-service/src/order-expiration-and-merge-cart.test.ts`                                                                                                                                                                                                                        |

---

## 3. Tổng kết hiện trạng Git & Merge Requests

1. **Merge Request !91 (`feat/be-commerce-buyer-apis` -> `main`):**
   - **Trạng thái:** Sạch sẽ 100%, đúng chuẩn **33 files** (+7671 -567), **0 conflict**.
   - **Nội dung:** Toàn bộ core Cart (5 API + Advisory Lock), Orders (Postgres + IDOR security), Checkout PayOS/COD, chuẩn hóa UUIDv7.
2. **Merge Request !111 (`feat/be-commerce-buyer-extensions` -> `main`):**
   - **Trạng thái:** [MR !111 trên GitLab](https://git.fsoft-academy.edu.vn/hcm26_cpl_nodejs_01/team1/nexus-ecommerce/-/merge_requests/111) đã giải quyết sạch merge conflict với `main`, commit mới nhất: `4de03da`.
   - **Nội dung hoàn tất:**
     - **SCRUM-167:** Gộp giỏ hàng Guest Cart khi Login (`POST /api/v1/cart/merge`), tự động đối soát tồn kho Catalog và cộng dồn.
     - **SCRUM-173:** Background worker quét hủy đơn quá hạn 15 phút, giải phóng kho tạm giữ, bọc Prisma `$transaction` và atomic conditional update chống race condition với PayOS webhook.
     - **SCRUM-290:** Chặn xóa địa chỉ mặc định duy nhất bên `user-service`.
     - **Fix ranh giới:** Chặn worker khởi chạy khi dùng `USE_IN_MEMORY_DB=true`.
     - **Kiểm thử:** 31/31 unit test `commerce-service` pass, toàn bộ pre-push test pass 100%.

---

## 4. Tiến độ tính năng Hỗ trợ & Trọng tài Chatbot AI (Nhánh `feat/be-chat-ai-verdict-escalation`)

| Mã Task                  | Tên công việc & Tính năng                                                                                                                                                                                                                                                                                                                                                                            | Trạng thái          | Vị trí code triển khai                                                                                                                                                                                            |
| :----------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Task BE-02**           | **Tích hợp Kết quả Thẩm Định AI vào EscalateDisputeUseCase**<br>- Mở rộng DTO `AiVerdictDto` tiếp nhận phân tích mức độ hư hại từ AI.<br>- Tự động đóng gói `aiVerdict` gửi sang Fulfillment Service (`POST /api/v1/support/cases`) và kẹp vào hồ sơ bằng chứng `buyerEvidence`.<br>- Bảo toàn rào chắn an toàn: MIME file, dung lượng $\le$ 20MB, khóa chống trùng lặp `Idempotency-Key` qua Redis. | **HOÀN THÀNH 100%** | `backend/chat-service/src/application/dtos/ChatDtos.ts`<br>`backend/chat-service/src/application/use-cases/EscalateDisputeUseCase.ts`<br>`backend/chat-service/src/interfaces/http/controllers/ChatController.ts` |
| **Session Support Chat** | **Kênh trao đổi Support Staff & Buyer Polling**<br>- Cung cấp bộ endpoint alias `/sessions/:id/messages` (POST/GET) chuẩn REST cho Support Staff gửi phản hồi và Buyer Polling.<br>- Bảo mật Anti-IDOR: Phân quyền phòng chat cô lập, chặn người ngoài truy cập trái phép.                                                                                                                           | **HOÀN THÀNH 100%** | `backend/chat-service/src/interfaces/http/routes/ChatRoutes.ts`<br>`backend/chat-service/src/interfaces/http/controllers/ChatController.ts`                                                                       |
| **Kiểm thử tự động**     | **Suite test tự động toàn diện Chat Service & ArchUnit**<br>- 6/6 Unit tests trong `chat.test.ts` PASS 100%.<br>- Toàn bộ 295 files TypeScript tuân thủ 100% ranh giới kiến trúc Modular Monolith (8/8 ArchUnit tests pass).                                                                                                                                                                         | **HOÀN THÀNH 100%** | `backend/chat-service/src/chat.test.ts`                                                                                                                                                                           |

---

## 5. Tiến độ bổ sung API sau đặt hàng phía Buyer & Cart Proxy (Nhánh `feat/be-buyer-post-order-gaps`)

| Phân hệ / Dịch vụ       | Tên công việc & Tính năng                                                                                                                                                                                                                                                                                                           | Trạng thái          | Vị trí code triển khai                                                                                                                                                                                                                                                                                                                                                      |
| :---------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **API Gateway**         | **Proxy giỏ hàng `/api/v1/cart`**<br>- Định tuyến toàn bộ request `/api/v1/cart` sang Commerce Service (Port 4003).                                                                                                                                                                                                                 | **HOÀN THÀNH 100%** | `backend/api-gateway/src/app.ts`                                                                                                                                                                                                                                                                                                                                            |
| **Commerce Service**    | **Xác nhận nhận hàng & Trả `buyerReceivedAt`**<br>- Thêm endpoint `POST /api/v1/orders/:id/confirm-receipt` (xác thực `BUYER`, chống IDOR, kiểm tra đơn `DELIVERED`, idempotent).<br>- Trả trường `buyerReceivedAt` trong `GET /orders/:id` và `GET /orders`.<br>- Hỗ trợ `GET /api/v1/orders/:id/cases` tra cứu khiếu nại của đơn. | **HOÀN THÀNH 100%** | `backend/commerce-service/src/domain/entities/Order.ts`<br>`backend/commerce-service/src/application/use-cases/ConfirmOrderReceiptUseCase.ts`<br>`backend/commerce-service/src/application/dtos/OrderDetailDto.ts`<br>`backend/commerce-service/src/interfaces/http/controllers/OrderController.ts`<br>`backend/commerce-service/src/interfaces/http/routes/OrderRoutes.ts` |
| **Fulfillment Service** | **Tra cứu khiếu nại theo đơn & Idempotency**<br>- Mở rộng `GET /api/v1/support/cases?orderId=:id` và alias `GET /orders/:id/cases` cho `BUYER` (chống IDOR).<br>- Xử lý `Idempotency-Key` trong `POST /api/v1/support/cases` chống tạo trùng ticket khi mạng lag.                                                                   | **HOÀN THÀNH 100%** | `backend/fulfillment-service/src/domain/repositories/ISupportCaseRepository.ts`<br>`backend/fulfillment-service/src/infrastructure/repositories/PostgresSupportCaseRepository.ts`<br>`backend/fulfillment-service/src/interfaces/http/controllers/SupportCaseController.ts`<br>`backend/fulfillment-service/src/interfaces/http/routes/SupportCaseRoutes.ts`                |
| **Chat Service**        | **Đồng bộ Case ID & Hàng chờ Support Staff**<br>- Nhận đúng mã `caseId` thực tế từ Fulfillment trả về thay vì tự sinh cục bộ.<br>- Đặt trạng thái ban đầu `WAITING_STAFF` cho kênh `BUYER_SUPPORT` để tự động nổi lên queue của Support Staff.                                                                                      | **HOÀN THÀNH 100%** | `backend/chat-service/src/application/use-cases/EscalateDisputeUseCase.ts`<br>`backend/chat-service/src/application/use-cases/GetOrCreateConversationUseCase.ts`<br>`backend/chat-service/src/infrastructure/database/PostgresChatRepositories.ts`                                                                                                                          |
| **Kiểm thử tự động**    | **Suite test toàn diện 3 service & ArchUnit**<br>- Commerce: 33/33 pass.<br>- Fulfillment: 17/17 pass.<br>- Chat: 55/55 pass.<br>- ArchUnit ranh giới kiến trúc: 103/103 pass (0 vi phạm).                                                                                                                                          | **HOÀN THÀNH 100%** | `backend/commerce-service/src/application/use-cases/ConfirmOrderReceiptUseCase.test.ts`<br>`backend/fulfillment-service/src/inventory-and-support.test.ts`                                                                                                                                                                                                                  |

---

## 6. Giỏ Hàng Nâng Cao, Mã Giảm Giá & Chọn Gói Vận Chuyển (Nhánh `feat/be-commerce-cart-promotions-shipping`)

### 📌 A. Bảng tổng hợp API đã thực hiện & Chức năng

| Endpoint                               | Method | Phân hệ / Chức năng                                | Nghiệp vụ chi tiết                                                                                                                                                                                                                                                                   |
| :------------------------------------- | :----: | :------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/v1/cart`                         | `GET`  | **Giỏ hàng nâng cao (B05)**                        | Đối chiếu Catalog thời gian thực, phát hiện biến động `itemStatus`: `OK`, `PRICE_CHANGED` (kèm cảnh báo giá cũ/mới), `INSUFFICIENT_STOCK`, `OUT_OF_STOCK`, `UNAVAILABLE`. Trả về `canCheckout`, khối `summary` (subtotal, discount, tax, shipping, total) và cờ `hasBlockingIssues`. |
| `/api/v1/cart/validate`                | `POST` | **Xác thực giỏ hàng một phần (B05)**               | Cho phép Buyer tích chọn mua 1 phần giỏ hàng hoặc nhập mã voucher trước khi thanh toán. Trả về trạng thái hợp lệ, thông báo cảnh báo và tổng tiền ước tính sau giảm giá.                                                                                                             |
| `/api/v1/checkout/promotions`          | `GET`  | **Danh sách khuyến mãi (B14)**                     | Liệt kê các voucher công khai đang có hiệu lực (`ACTIVE`, trong thời hạn, còn quota). Nhận query `?subtotal=...` để tính toán sẵn trạng thái đủ điều kiện (`eligible: true/false`, kèm `ineligibleReason` và `estimatedDiscount`).                                                   |
| `/api/v1/checkout/promotions/validate` | `POST` | **Kiểm tra mã giảm giá gõ tay (B14)**              | Kiểm tra mã voucher, tính toán tiền giảm (cố định `FIXED` hoặc phần trăm `PERCENT` kèm trần `maxDiscountAmount`). Trả về mã lỗi chuẩn hóa nếu không hợp lệ: `PROMO_NOT_FOUND`, `PROMO_EXPIRED`, `PROMO_OUT_OF_QUOTA`, `PROMO_USER_LIMIT_REACHED`, `PROMO_MIN_ORDER_NOT_MET`.         |
| `/api/v1/checkout/quote`               | `POST` | **Báo giá & Chọn gói vận chuyển (B06 / B08)**      | Mở rộng tính cước hỗ trợ nhiều hãng vận chuyển (`GHN_STANDARD` Tiêu chuẩn, `GHTK_FAST` Giao nhanh) kèm ETA dự kiến. Áp dụng mã giảm giá `promoCode` và lưu snapshot vào `commerce_checkout_quotes`.                                                                                  |
| `/api/v1/orders/checkout`              | `POST` | **Chốt đơn hàng & Lưu Snapshot (B06 / B08 / B14)** | Tạo đơn hàng, trừ lượt mã giảm giá (`commerce_promotion_usages`) ngay trong transaction DB chống gian lận. Lưu cố định snapshot: `promoCode`, `discountAmount`, `taxAmount`, `shippingCarrier`, `shippingServiceName`, `estimatedDeliveryAt`.                                        |
| `/api/v1/orders/:id`                   | `GET`  | **Xem chi tiết & Biên nhận điện tử**               | Trả đầy đủ snapshot khuyến mãi và gói vận chuyển đã chốt, đảm bảo biên nhận điện tử của Buyer khớp 100% số tiền đã trả.                                                                                                                                                              |

---

### 📁 B. Danh sách File tạo mới & Chỉnh sửa

1. **File tạo mới:**
   - `backend/commerce-service/prisma/V8__promotions_and_shipping_options.sql`: Migration tạo bảng `commerce_promotions`, `commerce_promotion_usages`, thêm cột snapshot cho `commerce_orders` & `commerce_checkout_quotes`, seed 3 voucher mẫu (`NEXUS50K`, `FREESHIP`, `WELCOME10`).
   - `backend/commerce-service/src/domain/entities/Promotion.ts`: Domain Entity & logic tính giảm giá, kiểm tra thời hạn, quota.
   - `backend/commerce-service/src/domain/repositories/IPromotionRepository.ts`: Interface repository cho Promotion.
   - `backend/commerce-service/src/infrastructure/repositories/PostgresPromotionRepository.ts`: Triển khai repository truy vấn PostgreSQL thật cho promotions và usages.
   - `backend/commerce-service/src/application/promotion/PromotionService.ts`: Nghiệp vụ xác thực voucher, tính toán giảm giá, danh sách mã hợp lệ.
   - `backend/commerce-service/src/cart-promotions-shipping.test.ts`: Bộ 8 bài test tự động bao phủ trọn vẹn toàn bộ tính năng và kết nối DB thật PostgreSQL.

2. **File chỉnh sửa:**
   - `backend/commerce-service/prisma/schema.prisma`: Thêm model `Promotion`, `PromotionUsage` và các trường snapshot trong `Order`, `CheckoutQuote`.
   - `backend/commerce-service/src/domain/entities/Order.ts`: Bổ sung các trường snapshot và getters (`promoCode`, `taxAmount`, `shippingCarrier`, `shippingServiceName`, `estimatedDeliveryAt`).
   - `backend/commerce-service/src/application/dtos/OrderDetailDto.ts`: Bổ sung các trường snapshot vào DTO chi tiết đơn hàng.
   - `backend/commerce-service/src/application/use-cases/GetOrderDetailUseCase.ts`: Trả về snapshot khuyến mãi & vận chuyển trong chi tiết đơn.
   - `backend/commerce-service/src/application/cart/dtos/AddToCartDto.ts`: Thêm enum `CartItemStatus`, DTO validation cho `POST /api/v1/cart/validate`, mở rộng `CartDto` & `CartItemDto`.
   - `backend/commerce-service/src/application/cart/CartService.ts`: Nâng cấp `getCart` nhận diện biến động giá/tồn kho/trạng thái và thêm hàm `validateCart`.
   - `backend/commerce-service/src/interfaces/http/controllers/CartController.ts`: Bổ sung controller handler `validateCart`.
   - `backend/commerce-service/src/interfaces/http/routes/CartRoutes.ts`: Đăng ký route `POST /validate`.
   - `backend/commerce-service/src/application/checkout/ports.ts`: Bổ sung `ShippingOption`, cập nhật `QuoteRecord`, `OrderRecord`, `CreateOrderParams`.
   - `backend/commerce-service/src/application/checkout/CheckoutService.ts`: Cung cấp `buildShippingOptions`, tích hợp mã giảm giá và gói ship vào `quote`, `checkout`, `getPromotions`, `validatePromotion`.
   - `backend/commerce-service/src/infrastructure/repositories/PostgresCheckoutRepository.ts`: Lưu và nạp snapshot khuyến mãi, gói vận chuyển; trừ lượt voucher trong cùng transaction tạo đơn.
   - `backend/commerce-service/src/infrastructure/repositories/PostgresOrderRepository.ts`: Ánh xạ snapshot từ PostgreSQL sang Domain Entity `Order`.
   - `backend/commerce-service/src/interfaces/http/controllers/CheckoutController.ts`: Bổ sung handler `getPromotions` và `validatePromotion`.
   - `backend/commerce-service/src/interfaces/http/routes/CheckoutRoutes.ts`: Mount các route `/checkout/promotions` và `/checkout/promotions/validate`.
   - `backend/commerce-service/src/app.ts`: Khởi tạo và liên kết `PromotionService` vào `CartService` và `CheckoutService`.

---

### 🧪 C. Kết quả kiểm thử

- **Commerce Service Test Suite:** Đạt **45/45 tests PASS 100%** (0 failed).
- **Kiểm thử Database thật 100% (PostgreSQL `nexus_commerce_db`):** Đã loại bỏ hoàn toàn mock data trong test, 100% bài test trong `cart-promotions-shipping.test.ts` truy vấn và ghi nhận trực tiếp vào các bảng thật: `commerce_promotions`, `commerce_promotion_usages`, `commerce_checkout_quotes`, `commerce_carts`, `commerce_orders`.

---

## 7. Khắc phục 6 vấn đề kỹ thuật sau Code Review Kỹ Thuật

| Mã lỗi     | Mức độ       | Tóm tắt giải pháp đã thực hiện                                                                                                                                                                                                                            | Vị trí file                                                                                                                                                                 |
| :--------- | :----------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **BUG-01** | **CRITICAL** | Khóa theo `promotionId` bằng PostgreSQL Advisory Lock `pg_advisory_xact_lock(hashtext(promotionId))`, kiểm tra lại `usedCount >= usageLimit` và `userCount >= perUserLimit` trực tiếp bên trong transaction trước khi ghi nhận usage và tăng `usedCount`. | `backend/commerce-service/src/infrastructure/repositories/PostgresCheckoutRepository.ts`                                                                                    |
| **BUG-02** | **CRITICAL** | Bổ sung logic tự động hoàn trả voucher (`usedCount` decrement 1, xóa bản ghi `promotionUsage`) khi đơn hàng quá hạn 15 phút hoặc bị hủy.                                                                                                                  | `backend/commerce-service/src/infrastructure/workers/ExpiredOrderCleanupWorker.ts`<br>`backend/commerce-service/src/infrastructure/repositories/PostgresOrderRepository.ts` |
| **BUG-03** | **MAJOR**    | Cập nhật hàm sắp xếp số phiên bản migration trong `scripts/migrate-all-databases.js` để đảm bảo `V8__promotions_and_shipping_options.sql` luôn được thực thi đầy đủ trên mọi môi trường DB sạch.                                                          | `scripts/migrate-all-databases.js`                                                                                                                                          |
| **BUG-04** | **MEDIUM**   | Chuẩn hóa DDD: Bổ sung method công khai `getPromotionByCode` trên `PromotionService`, loại bỏ hoàn toàn ép kiểu `as any` trong `CheckoutService.ts`.                                                                                                      | `backend/commerce-service/src/application/promotion/PromotionService.ts`<br>`backend/commerce-service/src/application/checkout/CheckoutService.ts`                          |
| **BUG-05** | **MEDIUM**   | Thêm type annotation tường minh `(r: any)` trong hàm map của `PostgresPromotionRepository.ts`, giải quyết triệt để lỗi TS7006 khi biên dịch tĩnh.                                                                                                         | `backend/commerce-service/src/infrastructure/repositories/PostgresPromotionRepository.ts`                                                                                   |
| **BUG-06** | **MINOR**    | Lấy ưu tiên hãng vận chuyển từ `order.shippingCarrier` khi Seller dispatch đơn hàng, tránh bị ép cứng về `'GHN'`.                                                                                                                                         | `backend/commerce-service/src/application/use-cases/DispatchOrderUseCase.ts`                                                                                                |

---

## 8. Khắc phục triệt để 5 lỗi P1 sau Đợt Review Bổ Sung (Edge Cases & Resilience)

| Mã lỗi   | Mức độ | Vấn đề phát hiện                                                                        | Giải pháp kỹ thuật xử lý triệt để                                                                                                                                     | Vị trí file                                                           |
| :------- | :----- | :-------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------- |
| **P1-1** | **P1** | Voucher bị từ chối (không đạt min-spend) vẫn bị trừ lượt trong DB                       | Chỉ gán `finalPromoCode` và `finalPromotionId` khi `finalDiscountAmount > 0`; bổ sung guard tại repository chặn hoàn toàn ghi nhận usage khi tiền giảm là 0đ.         | `CheckoutService.ts`<br>`PostgresCheckoutRepository.ts`               |
| **P1-2** | **P1** | Retry checkout cùng Idempotency-Key bị lỗi 409 do đổi `requestHash`                     | Chuẩn hóa `requestHash` sinh ra từ Client Input Payload (không băm derived total amount); nhận diện và trả về ngay đơn đã tạo trước khi chạy lại luồng tính voucher.  | `CheckoutService.ts`<br>`PostgresCheckoutRepository.ts`<br>`ports.ts` |
| **P1-3** | **P1** | Đổi địa chỉ nhận hàng vẫn ăn theo phí ship của báo giá cũ                               | Ràng buộc `quoteId`: kiểm tra tính toàn vẹn giỏ hàng, địa chỉ và gói ship. Nếu đổi địa chỉ làm đổi phí ship hoặc đổi mặt hàng, từ chối với `409 QUOTE_PRICE_CHANGED`. | `CheckoutService.ts`                                                  |
| **P1-4** | **P1** | Khách trả phí GHTK nhưng vận đơn lại tạo qua GHN                                        | Tạm ẩn lựa chọn `GHTK_FAST` trong `buildShippingOptions`; đồng bộ `DispatchOrderUseCase` chỉ kích hoạt client vận chuyển với carrier GHN đã tích hợp.                 | `CheckoutService.ts`<br>`DispatchOrderUseCase.ts`                     |
| **P1-5** | **P1** | Hoàn voucher khi hủy thủ công tách rời khỏi transaction, nguy cơ mất đồng bộ và trừ đúp | Đưa cập nhật trạng thái hủy và hoàn trả voucher vào cùng một Database Transaction; bổ sung guard kiểm tra trạng thái trước đó chống hoàn voucher lặp khi retry hủy.   | `PostgresOrderRepository.ts`                                          |

---

## 8. Khắc phục triệt để 5 lỗi P1 sau Đợt Review Bổ Sung (Edge Cases & Resilience)

| Mã lỗi   | Mức độ | Vấn đề phát hiện                                                                        | Giải pháp kỹ thuật xử lý triệt để                                                                                                                                     | Vị trí file                                                           |
| :------- | :----- | :-------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------- |
| **P1-1** | **P1** | Voucher bị từ chối (không đạt min-spend) vẫn bị trừ lượt trong DB                       | Chỉ gán `finalPromoCode` và `finalPromotionId` khi `finalDiscountAmount > 0`; bổ sung guard tại repository chặn hoàn toàn ghi nhận usage khi tiền giảm là 0đ.         | `CheckoutService.ts`<br>`PostgresCheckoutRepository.ts`               |
| **P1-2** | **P1** | Retry checkout cùng Idempotency-Key bị lỗi 409 do đổi `requestHash`                     | Chuẩn hóa `requestHash` sinh ra từ Client Input Payload (không băm derived total amount); nhận diện và trả về ngay đơn đã tạo trước khi chạy lại luồng tính voucher.  | `CheckoutService.ts`<br>`PostgresCheckoutRepository.ts`<br>`ports.ts` |
| **P1-3** | **P1** | Đổi địa chỉ nhận hàng vẫn ăn theo phí ship của báo giá cũ                               | Ràng buộc `quoteId`: kiểm tra tính toàn vẹn giỏ hàng, địa chỉ và gói ship. Nếu đổi địa chỉ làm đổi phí ship hoặc đổi mặt hàng, từ chối với `409 QUOTE_PRICE_CHANGED`. | `CheckoutService.ts`                                                  |
| **P1-4** | **P1** | Khách trả phí GHTK nhưng vận đơn lại tạo qua GHN                                        | Tạm ẩn lựa chọn `GHTK_FAST` trong `buildShippingOptions`; đồng bộ `DispatchOrderUseCase` chỉ kích hoạt client vận chuyển với carrier GHN đã tích hợp.                 | `CheckoutService.ts`<br>`DispatchOrderUseCase.ts`                     |
| **P1-5** | **P1** | Hoàn voucher khi hủy thủ công tách rời khỏi transaction, nguy cơ mất đồng bộ và trừ đúp | Đưa cập nhật trạng thái hủy và hoàn trả voucher vào cùng một Database Transaction; bổ sung guard kiểm tra trạng thái trước đó chống hoàn voucher lặp khi retry hủy.   | `PostgresOrderRepository.ts`                                          |
