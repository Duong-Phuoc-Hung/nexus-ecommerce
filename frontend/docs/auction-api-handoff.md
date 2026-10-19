# Đấu giá — phần FE đã làm và API cần BE bàn giao

Trạng thái: 19/10/2026. Triển khai trực tiếp trong `frontend/web`, không chia thư mục theo tuần. Phạm vi hiện tại dùng mock adapter; chưa gọi API Auction hoặc gửi giao dịch thật.

## UI có thể xem ngay

- `/auctions`: danh sách chung với Admin, tìm kiếm tên/người bán, lọc 4 trạng thái, sắp xếp và phân trang.
- `/auctions/NX-101`: chi tiết, thời gian, mức giá tối thiểu, gợi ý giá, Dialog xác nhận, lịch sử phân trang.
- `/auctions/NX-CLOSED`: ví dụ phiên kết thúc không có bid.
- `/admin/auctions`: tổng quan số phiên theo trạng thái, danh sách, tìm kiếm/lọc, xem/sửa/hủy.
- `/admin/auctions/new`: chọn sản phẩm, giá khởi điểm, bước giá và thời gian.
- `/admin/auctions/:id/edit`: chỉ sửa phiên chưa bắt đầu. Hủy cần lý do và xác nhận.
- Homepage dẫn sang chi tiết, cập nhật giá/trạng thái các phiên hiện có từ cùng adapter. Phiên mới tạo xuất hiện ở danh sách `/auctions`.

## Cách mock hoạt động và giới hạn

- Adapter: `src/modules/auction/api/auction.api.ts`; localStorage key `nexus.auctions.v1`. Dữ liệu giữ qua reload, dùng chung các tab cùng origin/trình duyệt; không đồng bộ giữa máy/người dùng thật.
- Có kiểm tra giá nguyên VND, minNextBid, trạng thái/thời gian, version khi gửi, idempotency key. Web Locks tuần tự hóa ghi giữa tab nếu trình duyệt hỗ trợ; fallback không bảo đảm cạnh tranh nhiều tab. Đây không thay thế transaction/Redis của BE.
- Poll mỗi 3 giây và nghe thay đổi storage. `serverTime` của mock lấy đồng hồ thiết bị, không phải thời gian máy chủ thật.
- Chỉ bật các thao tác ghi ở development. Khách development dùng danh tính thử riêng, không tạo JWT, không giả phiên đăng nhập. Nếu đã đăng nhập, chỉ Buyer ACTIVE được đặt giá trên UI. Admin route vẫn là không gian xem UI development, chưa xác thực quản trị thật.
- Hộp xác nhận nói rõ chỉ lưu trên trình duyệt. Không giả thanh toán, đơn hàng, hoàn tiền hoặc quyền sở hữu sản phẩm.
- Chưa có anti-sniping, kiểm tra reputation/đặt cọc/ownership đầy đủ, giới hạn phiên mỗi Seller, scheduler bền vững, sự kiện/audit BE, SSE/WebSocket, kết quả đấu chính thức và 2 người dùng từ 2 máy cạnh tranh thật.

## API cần hoàn thiện

Tiền tố `/api/v1`. Trạng thái BE căn cứ main `f47264f` đã kéo; URL/field mới bên dưới là đề xuất cần chốt. Quyền và trạng thái phải kiểm tra ở BE, không tin role hoặc bidderId do client gửi.

| API                               | BE hiện tại                        | BE cần hoàn thiện để nối FE                                                                                                                                                       |
| --------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET `/auctions`                   | Đọc InMemory cơ bản                | DB, paging, search, status, sort, product summary/ảnh, currency, serverTime. Public chỉ trả dữ liệu được phép                                                                     |
| GET `/auctions/:id`               | Đọc cơ bản                         | DTO đầy đủ; start/end, startingPrice, currentPrice, increment, minNextBid, bidCount, version, eligibility; 404/403 rõ                                                             |
| POST `/auctions/:id/bids`         | Skeleton trả ACCEPTED; chưa engine | Auth Buyer/AUCTION.BID, kiểm tra điều kiện SRS và seller không tự bid; amount, version, idempotency key; atomic với end/cancel race; DB/Redis; trả giá mới và endTime nếu gia hạn |
| GET `/auctions/:id/bids`          | Chưa có                            | Lịch sử phân trang/cursor, bidder display che thông tin, amount/time, tổng số hoặc nextCursor                                                                                     |
| POST `/auctions`                  | Chưa có                            | AUCTION.CREATE, product/seller/ownership, min/max duration theo config, max active per seller, giá/currency, DB và event/audit; 201 + ID thật                                     |
| PATCH `/auctions/:id`             | Chưa có                            | AUCTION.UPDATE; chỉ trước bắt đầu; version/409; không đổi giá/thời gian phiên đã active/ended; DB + event/audit                                                                   |
| POST `/auctions/:id/admin-cancel` | Chưa có                            | AUCTION.ADMIN_CANCEL; lý do, transition, idempotency, xử lý bid cạnh tranh, audit và hậu quả nghiệp vụ; không đơn thuần đổi nhãn                                                  |
| GET `/auctions/:id/result`        | Chưa có                            | Server chốt winner/no-bid/cancelled, giá cuối, trạng thái settlement và hạn thanh toán theo quyền; không lộ bidder ID cho mọi khách                                               |

Việc nền: Gateway proxy Auction; JWT/RBAC; seed Catalog hợp lệ; scheduler bắt đầu/kết thúc; thống nhất anti-sniping (mặc định SRS bật, gia hạn 5 phút — nhóm cần chốt cửa sổ kích hoạt); audit/event và contract lỗi.

## Contract nối FE đề xuất

Chi tiết trả `{success:true,data:{id,productId,title,image,seller,condition,description,status,startingPrice,currentPrice,increment,minNextBid,currency,startAt,endAt,bidCount,version,serverTime,eligibility}}`. Giá decimal/chuỗi và timestamp ISO UTC cần normalize trong adapter; không dùng number float cho tiền ở BE. UI hiện dùng VND nguyên.

Bid body `{amount,version}` và header `Idempotency-Key`; bidder lấy token. Response chứa snapshot giá/phiên mới. History tách endpoint, không trả toàn bộ lịch sử trong detail như adapter local đang làm. Create/update body `{productId,startingPrice,increment,startAt,endAt}`; update thêm version. Cancel body `{reason,version}`.

Lỗi cần chốt: 400/422 validation, 401 hết phiên, 403 không đủ quyền/điều kiện, 404 không tồn tại, 409 stale version/đã đóng/giá mới cao hơn, 429 rate limit. FE giữ giá nhập và tải lại trạng thái khi 409. Timeout bid cần truy vấn trạng thái bằng idempotency key trước khi thử lại; không retry mù.

## Thứ tự nối API tiếp theo

1. Q01/Q02/Q04: Gateway + DB + list/detail/history để bỏ nguồn dữ liệu local.
2. Q03: engine bid thật, xác thực, cạnh tranh/idempotency; kiểm tra 2 Buyer và sát giờ kết thúc.
3. Q06/Q07/Q09: nối form Admin với guard thật; bỏ quyền ghi development trước production.
4. Q10 + scheduler/anti-sniping: kết quả chính thức, trạng thái kết thúc/hủy; SSE hoặc polling server.

Không đánh dấu tuần 2 hoàn tất backend: lần này bàn giao UI và mô phỏng quy trình, không phải hệ thống đấu giá production.
