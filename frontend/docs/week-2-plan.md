# Tuần 2 — luồng đấu giá Customer và Admin

Thời gian theo kế hoạch một tháng: **26/10–01/11/2026**. Đối chiếu ngày 19/10 với `origin/main c3ad296`, SRS và kế hoạch đã lập. Tuần chỉ là mốc tiến độ; code đặt trong module `auction`, `admin` và route của web FE hiện có.

## Mục tiêu

Customer xem phiên và lịch sử, đặt giá thật khi đủ điều kiện. Admin tạo/sửa phiên trước khi bắt đầu, xử lý cưỡng chế hủy đúng quyền. Giữ homepage/video/branding; sau login mới mở thao tác có quyền, không tạo homepage riêng hoàn toàn.

Điều kiện vào tuần 2: chốt Auth/permissions; product/category thật có ID ổn định; Gateway Catalog hoạt động; các tồn đọng P0 tuần 1 có người chịu trách nhiệm. Nếu chưa có bid engine, chỉ bàn giao màn đọc và ghi rõ chưa đặt giá thật.

## API BE cần bàn giao

Tiền tố `/api/v1`. Tên endpoint mới là đề xuất theo kế hoạch, cần nhóm xác nhận.

| Mã  | API                               | Trạng thái mã hiện có                                 | Việc phải bổ sung                                                                                                                |
| --- | --------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Q01 | GET `/auctions`                   | Có InMemory, danh sách active cơ bản                  | DB, filter trạng thái, paging/sort, thông tin sản phẩm/ảnh/currency, serverTime                                                  |
| Q02 | GET `/auctions/:id`               | Có đọc cơ bản                                         | start/end, trạng thái, currentPrice, bidIncrement, minNextBid, điều kiện tham gia/quyền, version, serverTime                     |
| Q03 | POST `/auctions/:id/bids`         | **Skeleton trả ACCEPTED, chưa có xử lý đặt giá thật** | Lấy bidder từ token; Buyer + AUCTION.BID; kiểm tra active/time/giá/điều kiện; atomic, idempotency, lưu bid và trả trạng thái mới |
| Q04 | GET `/auctions/:id/bids`          | Chưa có route                                         | Lịch sử phân trang, thời điểm từ máy chủ, số tiền/currency, ẩn thông tin nhạy cảm người trả giá                                  |
| Q06 | POST `/auctions`                  | Chưa có route                                         | AUCTION.CREATE, xác minh product/ownership; giá/bước giá/thời gian; DB và trạng thái ban đầu                                     |
| Q07 | PATCH `/auctions/:id`             | Chưa có route                                         | AUCTION.UPDATE; chỉ sửa trước start theo SRS; chống ghi đè; phiên active/ended bị từ chối                                        |
| Q09 | POST `/auctions/:id/admin-cancel` | Chưa có route                                         | AUCTION.ADMIN_CANCEL chỉ Admin; lý do bắt buộc; trạng thái hợp lệ, audit và xử lý hậu quả theo SRS; không tự giả hoàn tiền       |
| Q10 | GET `/auctions/:id/result`        | Chưa có route                                         | Kết quả do server chốt, winner/giá cuối/no-bid/cancelled; dữ liệu riêng chỉ trả đúng người có quyền                              |

Các route Auction đang có chưa được Gateway proxy. BE cần thêm Gateway + scheduler bắt đầu/kết thúc phiên, cơ chế cạnh tranh và kết quả bền vững. Realtime SSE/WebSocket chốt sau; có thể polling trước. FE không tự tuyên bố thắng khi countdown bằng 0. Gửi bid phải xác nhận kết quả ở server; không retry mù khi timeout.

## Công việc FE từng ngày

| Ngày  | Customer                                                                                               | Admin / phối hợp BE                                                             | Kết quả cần xem được                                               |
| ----- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 26/10 | Chốt DTO auction và adapter; map list/detail                                                           | Chốt quyền, trạng thái, lỗi và contract Q01–Q10; xử lý phần API tuần 1 tồn đọng | Mẫu request/response được hai bên thống nhất                       |
| 27/10 | `/auctions/[id]`: gallery, thông tin phiên, giá/bước giá, countdown theo serverTime; loading/404/ended | Form tạo phiên gắn productId thật; validation thời gian/giá                     | Mở chi tiết từ homepage và danh sách                               |
| 28/10 | Lịch sử phân trang; form đặt giá; kiểm tra client và trạng thái đang gửi; giữ giá nhập khi lỗi         | Form sửa chỉ phiên trước start; xử lý 401/403/409                               | Không có nút giả báo đặt giá/lưu thành công                        |
| 29/10 | Đồng bộ giá, minNextBid; polling hoặc realtime đã chốt; reconnect/reload                               | Nối create/update; hủy cưỡng chế có Dialog xác nhận + lý do                     | Client cập nhật theo server, không ghi đè giá mới bằng response cũ |
| 30/10 | Nối bid engine thật; chống gửi lặp; timeout lấy lại trạng thái                                         | Nối result và scheduler; BE hoàn thành atomic bid                               | Hai Buyer đặt giá, server quyết định kết quả                       |
| 31/10 | Kiểm tra giá thấp, hết hạn, outbid, mất mạng, token hết hạn                                            | Kiểm tra Buyer bị chặn quản trị; Admin không có AUCTION.BID theo SRS; audit hủy | Lỗi rõ ràng, không mất dữ liệu form hoặc sai quyền                 |
| 01/11 | Kiểm tra mobile/bàn phím, sửa lỗi; demo trọn luồng                                                     | Ghi API done/blocked, tạo commit/MR khi được yêu cầu                            | Demo 2 Buyer, reload còn bid, race cuối phiên có đúng kết quả      |

## Tiêu chí nghiệm thu

- Khách đọc phiên theo chính sách public đã chốt; đặt giá phải đăng nhập Buyer hợp lệ. Không lấy bidderId tùy ý từ payload.
- Tối thiểu 2 request cạnh tranh: lưu nhất quán, không có 2 giá thắng sai; số tiền dùng decimal/currency thống nhất.
- Thời gian máy người dùng sai không làm mở bid ngoài giờ; backend kiểm tra thời điểm nhận/xử lý theo quy tắc đã chốt.
- Request lặp/timeout không tạo bid trùng; phiên kết thúc không nhận bid; kết quả không do FE suy ra.
- Admin bị chặn sửa cấu hình phiên đã chạy; hủy cưỡng chế ghi lý do và audit, không dùng quyền hủy thường thay thế.
- Refresh/restart không mất trạng thái đã lưu; 401/403/404/409 và lỗi validation có UI phù hợp.

Chưa đưa cart/checkout/payment vào tuần 2: các phần này thuộc tuần 3; kết quả phiên chỉ hiển thị trạng thái, không giả thanh toán/đơn hàng. Nếu thiếu API P0, ưu tiên đọc phiên → đặt giá an toàn → quản trị; báo rõ phần hoãn thay vì làm nút giả.
