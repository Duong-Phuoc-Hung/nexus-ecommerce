# Tài liệu nối API cho FE — Profile, địa chỉ, uy tín và đánh giá Seller

Tất cả các đường dẫn dưới đây dùng prefix `/api/v1/users` qua Gateway. Gửi JSON với `Content-Type: application/json`. API riêng tư yêu cầu `Authorization: Bearer <accessToken>`. GET hồ sơ công khai và GET đánh giá Seller dùng được khi chưa đăng nhập. Dữ liệu lấy từ PostgreSQL. JSON minh họa chỉ mô tả contract.

## B01 — Hồ sơ và mật khẩu

| Method và path | Body | Kết quả |
| --- | --- | --- |
| `GET /profile` | — | `200 { success, data }` với hồ sơ tài khoản trong token. |
| `PATCH /profile` | `{ fullName?, phone?, dateOfBirth?, gender? }` | `200 { success, data }` với hồ sơ sau cập nhật. Gửi riêng các field cần đổi. |
| `POST /change-password` | `{ currentPassword, newPassword }` | `200 { success: true, message }`. |

`data` của Profile có `id, email, fullName, phone?, role, status, reputationScore, createdAt, updatedAt, dateOfBirth, gender`. `dateOfBirth` là `YYYY-MM-DD` hoặc `null`. `gender` là `MALE | FEMALE | OTHER | UNSPECIFIED` hoặc `null`. Gửi `null` để xóa ngày sinh hoặc giới tính. Ngày sinh phải có thật và tuổi từ 13 đến 120, lỗi `400 INVALID_DATE_OF_BIRTH`. SĐT giữ quy tắc cũ của User Service và được chuẩn hóa thành đầu số `0`.

Đổi mật khẩu trả `400 INVALID_CURRENT_PASSWORD`, `400 PASSWORD_REUSED`, `400 WEAK_PASSWORD` hoặc `409 PASSWORD_CHANGED` nếu mật khẩu bị đổi đồng thời. Mật khẩu mới cần 8–64 ký tự, tối đa 72 byte, gồm chữ hoa, chữ thường và số. Phiên hiện tại vẫn dùng được. Sau thành công, xóa giá trị hai ô mật khẩu trên màn hình.

## B02 — Sổ địa chỉ

| Method và path | Kết quả |
| --- | --- |
| `GET /me/addresses` | `200 { success, data: Address[], meta }` |
| `POST /me/addresses` | `201 { success, data: Address, meta }` |
| `PATCH /me/addresses/:addressId` | `200 { success, data: Address, meta }` |
| `PUT /me/addresses/:addressId/default` | `200 { success, data: Address, meta }` |
| `DELETE /me/addresses/:addressId` | `200 { success, message, data: Address[], meta }` |

`Address` giữ cấu trúc đang dùng, gồm `id, userId, label?, recipientName, phone, provinceCode, provinceName, wardCode, wardName, street, note?, isDefault, createdAt, updatedAt`. POST nhận dữ liệu người nhận và địa chỉ, có thể gửi `isDefault`. Dùng PUT để đặt địa chỉ hiện hữu làm mặc định.

`meta` có `source: "SERVER"`, `syncedAt` dạng ISO và `maxAddresses: 5`. Chỉ hiển thị đã đồng bộ khi server phản hồi thành công. Xóa địa chỉ mặc định trả luôn danh sách mới. Sau khi đổi mặc định bằng PUT, tải lại danh sách để lấy trạng thái mới của các địa chỉ khác.

Giữ contract hiện tại để FE cũ tiếp tục hoạt động. Quá 5 địa chỉ trả `422 ADDRESS_LIMIT_REACHED`, sai chủ trả `403`, không tìm thấy trả `404`. Nếu còn nhiều địa chỉ, xóa mặc định sẽ chọn địa chỉ tạo sớm nhất trong cùng transaction. Xóa địa chỉ mặc định duy nhất vẫn bị chặn.

## B04 — Uy tín cá nhân

`GET /me/reputation` trả `{ success, data }`. `data` có `userId, reputationScore, trustTier, trustTierLabel, stats, biddingEligible, minScoreRequiredToBid, activeRestrictions, recentHistory`.

- Cấp uy tín theo điểm: `HIGH` từ 90, `STANDARD` từ 70, `WATCH` từ 50, dưới 50 là `RESTRICTED`.
- `activeRestrictions[]` gồm `feature, reason, expiresAt`. Hạn chế hết hạn không xuất hiện. `BAN_BIDDING` được trả thành `AUCTION_BID`.
- `recentHistory[]` gồm `id, delta, reason, createdAt`, tối đa 20 mục mới nhất.
- `stats.averageRatingReceived` và `stats.totalRatingsReceived` lấy từ DB. `completedTransactions`, `failedTransactions` và `successRate` là `null` cho đến khi có nguồn tổng hợp đơn được duyệt. FE có thể hiển thị “Chưa có dữ liệu” cho giá trị `null`.
- `biddingEligible` dùng cho hiển thị theo ngưỡng 50 và hạn chế đang hiệu lực. Quyết định nhận bid thuộc Auction Service.

Luồng Admin/Support hiện có ghi điểm, lịch sử và hạn chế vào PostgreSQL để endpoint này đọc cùng nguồn.

## B04 — Hồ sơ công khai và review Seller

| Method và path | Dữ liệu trả về |
| --- | --- |
| `GET /:sellerId/public-profile` | `sellerId, displayName, status, joinedAt, reputationScore, trustTier, trustTierLabel, averageRating, totalReviews, ratingBreakdown, completedOrders, successRate` |
| `GET /:sellerId/reviews?page=1&limit=10&rating=5` | `data: { items, pagination }`. `rating` tùy chọn, `limit` tối đa 100. |
| `POST /:sellerId/reviews` | Body `{ orderId, rating, comment? }`, trả `201 { success: true, data: { id, rating, comment, createdAt } }`. |

Danh sách công khai có `id, buyerAlias, rating, comment, createdAt`. BE dùng nhãn “Người mua đã xác minh” và giữ ID đơn trong kho dữ liệu nội bộ. Profile công khai chỉ trả các trường trong bảng trên. Seller chưa có review nhận `averageRating: null`, `totalReviews: 0`, phân bố sao bằng 0 và danh sách rỗng. `completedOrders` và `successRate` hiện là `null`.

POST chỉ dành cho Buyer đang hoạt động. Điểm là số nguyên 1–5 và nhận xét tối đa 500 ký tự. BE xác minh đơn từ Commerce, kiểm tra đúng Buyer và Seller, đơn `DELIVERED` hoặc `COMPLETED`, rồi kiểm tra khiếu nại đang mở. Sau khi gửi thành công, tải lại profile và danh sách để thấy số sao mới. Review cập nhật thống kê sao. Điểm uy tín vẫn đến từ nguồn điểm hiện hành vì nhóm chưa có công thức quy đổi sao sang điểm.

API tra cứu khiếu nại hiện tại trả hồ sơ mới nhất của đơn. Nếu cần kiểm tra toàn bộ hồ sơ khi một đơn có nhiều khiếu nại, cần thống nhất contract với Commerce/Fulfillment.

| HTTP | Mã | FE xử lý |
| --- | --- | --- |
| 400 | `INVALID_REVIEW`, `INVALID_PAGINATION` | Kiểm tra input. |
| 403 | `SELF_REVIEW_FORBIDDEN`, `FORBIDDEN` | Chặn thao tác và hiện lý do. |
| 404 | `SELLER_NOT_FOUND` | Ẩn panel hoặc báo gian hàng không khả dụng. |
| 409 | `DUPLICATE_REVIEW` | Hiển thị đơn đã được đánh giá. |
| 422 | `ORDER_NOT_ELIGIBLE_FOR_REVIEW` | Thông báo điều kiện đánh giá chưa đạt. |
| 503 | `COMMERCE_UNAVAILABLE` | Cho thử lại khi dịch vụ xác minh sẵn sàng. |

## Chạy BE ở môi trường tích hợp

Áp dụng `prisma/V5__profile_reputation_and_seller_reviews.sql` lên PostgreSQL User Service trước khi kiểm thử FE. Migration mở rộng cột giới tính, thêm lưu trữ lịch sử/hạn chế và đánh dấu các review Seller mới trên bảng `user_ratings`. Rating cũ vẫn tồn tại, chỉ hiện trong thống kê cá nhân nếu đã được ghi cho user đó. Các API mới sử dụng chế độ PostgreSQL. Đặt `COMMERCE_SERVICE_URL` trỏ tới Commerce, với Commerce và Fulfillment cùng hoạt động để xác minh review.

Code bắt đầu ở `src/interfaces/http/routes/AccountExtensionsRoutes.ts` cho 5 route mới và `src/interfaces/http/controllers/UserController.ts` cho Profile và sổ địa chỉ.
