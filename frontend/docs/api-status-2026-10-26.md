# Trạng thái API FE/BE — 26/10/2026

Đối chiếu source local sau khi fetch GitLab: `main` và branch FE cùng ở commit `07a2ee6` (merge `feat/be-seller-catalog-apis`). Chưa chạy nghiệm thu end-to-end với database/Gateway đang hoạt động.

## FE đã nối

- Homepage/Buyer: đọc danh sách sản phẩm, chi tiết sản phẩm và danh mục qua API Gateway; truy vấn có từ khóa dùng `/products/search`, map `pageSize` thành `limit` và đọc `meta` theo response của BE.
- Admin: đọc danh sách và chi tiết sản phẩm; form sửa dùng `PUT /products/:id`, gửi đúng `allowAuction`, `stockQuantity` và `price` mà BE nhận.
- Buyer chỉ hiển thị sản phẩm `ACTIVE` và không phải `AUCTION` ở luồng hàng thường. Đây là lọc giao diện; BE vẫn phải bảo vệ dữ liệu ở endpoint.
- Auction: Buyer và Admin đã có adapter đọc `GET /auctions`, Buyer đọc `GET /auctions/:id` khi `NEXT_PUBLIC_AUCTION_SOURCE=api`. Gateway đã proxy `/api/v1/auctions`. Không gửi bid hoặc thao tác quản trị vào các route chưa có xử lý thật.

## BE còn thiếu hoặc cần hoàn thiện — tuần 1

1. **P0 — Phân quyền và phạm vi danh sách Catalog:** `GET /products` hiện công khai, trả tất cả sản phẩm; `scope=admin` không được xác minh. Cần endpoint public chỉ trả sản phẩm được phép hiển thị và endpoint Admin có `requireAuth`/permission, kèm lọc trạng thái và phân trang.
2. **P0 — Tìm kiếm/danh sách thống nhất:** `/products/search` có tìm từ khóa, danh mục, giá, `page`, `limit`; nhưng list không từ khóa chưa phân trang. Bổ sung/chốt `condition`, `status`, `sort`, loại giao dịch và cách trả `meta`; xác thực quyền khi xem bản nháp/inactive.
3. **P0 — Quyền Catalog theo SRS:** route ghi hiện kiểm tra role Seller/Admin; cần xác minh permission `PRODUCT.CREATE/UPDATE/DELETE`, quyền ownership seller và phạm vi Admin ở mọi đường dẫn.
4. **P0 — Admin tạo sản phẩm đúng Seller:** `POST /products` đã có nhưng controller ưu tiên ID người đăng nhập làm `sellerId`. Cần hỗ trợ Admin chọn Seller hợp lệ hoặc chốt quy tắc gán chủ sở hữu trước khi bật form tạo.
5. **P1 — Chuẩn hóa trường và lỗi:** chốt currency (hiện response gắn `VND`), điều kiện/trạng thái, ảnh; trả lỗi field-level ổn định và mã 401/403/404/409. Tạo/sửa/xóa phải được lưu bền vững và kiểm tra lại sau restart.
6. Nghiệm thu thực tế qua Gateway + Postgres: danh mục, list/search/detail, Admin update, Buyer bị từ chối ghi; hiện source có route/use case nhưng kết quả local còn phụ thuộc service, migration, seed và token.

## BE còn thiếu — tuần 2 Auction

- Hoàn thiện DB-backed `GET /auctions` và `GET /auctions/:id`: phân trang/lọc, thông tin sản phẩm đầy đủ, `serverTime`, `minNextBid`, trạng thái và version nhất quán.
- Thay `POST /auctions/:id/bids` skeleton bằng bid thật: Buyer từ JWT, permission, kiểm tra thời gian/giá/điều kiện, giao dịch atomic, idempotency và lưu bền vững.
- Thêm `GET /auctions/:id/bids` có phân trang và ẩn dữ liệu nhạy cảm.
- Thêm `POST /auctions`, `PATCH /auctions/:id`, `POST /auctions/:id/admin-cancel` (lý do + audit), `GET /auctions/:id/result` theo quyền/trạng thái.
- Bổ sung scheduler bắt đầu/kết thúc, chốt kết quả trên server, xử lý cạnh tranh và nghiệm thu nhiều Buyer. Gateway đã có proxy Auction; cần smoke-test khi các service cùng chạy.
- FE Auction tuần 2 có UI; các thao tác bid/create/edit/cancel/result hiện chưa thể coi là tích hợp BE hoàn chỉnh. Không giả lập thành công khi chưa có contract và xử lý server.
