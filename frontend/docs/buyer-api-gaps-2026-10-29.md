# Buyer API cần hoàn thiện — 29/10/2026

Đối chiếu với `origin/main` tại commit `226fe09`, sau khi đã nhập vào nhánh FE. Đường dẫn dưới đây tính từ Gateway `/api/v1`. **Có route** không đồng nghĩa FE đã dùng hoặc luồng đã chạy thật.

## Đã có trên BE

| Nghiệp vụ                 | Route hiện có                                                                                                                     | Trạng thái FE                                                                                                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Đăng ký, đăng nhập, hồ sơ | `POST /auth/register`, `POST /auth/login`, `GET /users/profile`, `PATCH /users/profile`                                           | Đăng nhập và đọc hồ sơ đã gọi API; chỉnh sửa hồ sơ/điện thoại chưa nối vào giao diện.                                                                                        |
| Sổ địa chỉ Buyer          | `GET`, `POST /users/me/addresses`; `PATCH`, `DELETE /users/me/addresses/:addressId`; `PUT /users/me/addresses/:addressId/default` | FE vẫn đọc/ghi `localStorage`; cần thay bằng các route này.                                                                                                                  |
| Khám phá sản phẩm         | `GET /products`, `/products/search`, `/products/:id`, `/categories`                                                               | Trang chủ và danh sách/chi tiết dùng Catalog API.                                                                                                                            |
| Xem phiên đấu             | `GET /auctions`, `GET /auctions/:id`                                                                                              | FE dùng Auction API.                                                                                                                                                         |
| Thanh toán chuyển khoản   | `POST /checkout/quote`, `POST /orders/checkout`, `POST /orders/:id/payment-link`, `GET /orders/:id/payment-status`                | Route BE có nhưng FE chưa gọi quote/trạng thái; payload checkout FE dùng `street`, `city` trong khi BE yêu cầu `addressLine`, `province`. Cần tích hợp và kiểm tra PayOS/DB. |

## BE còn thiếu hoặc route chưa hoàn thiện

| Ưu tiên | Nhu cầu Buyer                         | Việc BE cần làm                                                                                                                                                                                                                                                     |
| ------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0      | Đơn mua và chi tiết đơn               | Cho Buyer xem **đơn của chính mình** từ cùng Postgres với checkout, có phân trang/trạng thái; `GET /orders` và `GET /orders/:id` hiện đọc repository in-memory nên có thể không thấy đơn vừa thanh toán. Kiểm tra ownership bằng JWT, không tin `buyerId` từ query. |
| P0      | Đặt giá đấu giá                       | `POST /auctions/:id/bids` hiện trả kết quả skeleton. Cần xác thực Buyer, kiểm tra phiên/giá/bước giá, chống đặt trùng, lưu giá và trả trạng thái thật; không nhận `bidderId` từ client.                                                                             |
| P0      | Thanh toán đơn thắng đấu giá          | Tạo đơn khi phiên kết thúc và endpoint xác nhận địa chỉ/thanh toán cho người thắng; bảo đảm idempotency, hạn thanh toán và đồng bộ Auction–Commerce.                                                                                                                |
| P0      | Hoàn tất checkout                     | Chốt giữ/trừ/hoàn tồn kho và xử lý đơn hết hạn; phí vận chuyển/vùng giao hiện dùng mức cố định tạm. Kiểm thử PayOS sandbox và webhook thật trước khi nhận tiền.                                                                                                     |
| P1      | Giỏ hàng đồng bộ tài khoản            | Thêm API đọc/thêm/đổi số lượng/xóa mặt hàng, ví dụ `GET /cart`, `PUT /cart/items/:productId`, `DELETE /cart/items/:productId`. Ràng buộc Buyer từ JWT, kiểm tra tồn kho; chốt cách nhập giỏ cục bộ khi đăng nhập. FE hiện chỉ dùng `localStorage`.                  |
| P1      | Danh sách yêu thích đồng bộ tài khoản | Thêm `GET /favorites`, `PUT /favorites/:productId`, `DELETE /favorites/:productId` (hoặc contract tương đương); chỉ Buyer sở hữu được sửa. FE hiện chỉ dùng `localStorage`.                                                                                         |
| P1      | Thanh toán khi nhận hàng (COD)        | Chốt điều kiện COD theo sản phẩm, vùng giao và giá trị đơn; mở rộng quote/checkout để nhận `paymentMethod=COD`, tạo đơn không cần link PayOS và quy trình xác nhận thu tiền. UI hiện có lựa chọn nhưng chặn gửi.                                                    |
| P1      | Buyer hủy đơn hợp lệ                  | Route `POST /orders/:id/cancel` đã có nhưng cần chính sách trạng thái, ownership, tồn kho, thanh toán và lưu DB cho đơn checkout thật.                                                                                                                              |
| P2      | Danh mục địa danh                     | Tùy chọn `GET /locations/provinces` và `/locations/provinces/:code/wards` cùng version/effective date. FE đang có snapshot địa danh; BE vẫn phải xác nhận mã tỉnh/phường khi lưu địa chỉ/checkout.                                                                  |

## Việc FE cần làm khi BE chốt contract

1. Chuyển hồ sơ và sổ địa chỉ từ `localStorage` sang User API; giữ loading, lỗi và dữ liệu cũ có chủ đích khi chuyển đổi.
2. Gọi quote trước checkout; gửi địa chỉ đúng DTO BE và `Idempotency-Key`; chỉ chuyển đến link PayOS hợp lệ. Sau khi quay về, đọc `payment-status` từ BE thay vì tin query URL.
3. Sau khi có API cart/favorites, thay kho cục bộ bằng adapter dùng JWT và xử lý đồng bộ khi Buyer đăng nhập.
4. Không bật nút đặt giá hoặc COD như giao dịch thật trước khi các route P0/P1 tương ứng hoàn thiện.

Các route được đối chiếu từ `backend/user-service/src/interfaces/http/routes/UserRoutes.ts`, `backend/catalog-service/src/interfaces/http/routes`, `backend/auction-service/src/interfaces/http/routes/AuctionRoutes.ts`, `backend/auction-service/src/interfaces/http/controllers/AuctionController.ts` và `backend/commerce-service/src/interfaces/http/routes`.
