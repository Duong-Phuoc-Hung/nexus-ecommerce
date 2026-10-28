# UI đấu giá tuần 2 — cập nhật 21/10/2026

## Các trang

| Đường dẫn                   | Phần hoàn thiện                                                                                                                                    |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/auctions`                 | Danh sách Buyer, tìm kiếm, trạng thái có nhãn màu, sắp xếp, phân trang, trạng thái lỗi và rỗng riêng biệt.                                         |
| `/auctions/[id]`            | Chi tiết, ảnh phóng lớn trong Dialog, giá/bước giá, đếm ngược, lịch sử phân trang; thông báo đang dẫn đầu/bị vượt giá; xác nhận trước khi đặt giá. |
| `/admin/auctions`           | Tổng quan bốn trạng thái có thể bấm lọc; tìm kiếm, bảng có ảnh sản phẩm, giá/lượt trả giá, phân trang, tải lại và đường dẫn tạo/chi tiết.          |
| `/admin/auctions/new`       | Form ba nhóm: sản phẩm, giá, lịch. Lỗi theo trường, xem trước bên cạnh, Dialog kiểm tra trước khi lưu.                                             |
| `/admin/auctions/[id]`      | Thông tin sản phẩm, thông số phiên, diễn biến/lịch sử, mở trang Buyer, sửa phiên sắp diễn ra, hủy có lý do và xác nhận.                            |
| `/admin/auctions/[id]/edit` | Điền dữ liệu hiện tại, giữ nội dung khi lỗi, kiểm tra version khi lưu, chặn sửa phiên đã bắt đầu.                                                  |

## Thiết kế và tương tác

- Giữ màu đỏ Nexus, nền sáng và logo/sidebar hiện tại. Không thay homepage/video, Seller hoặc Support.
- Dùng Button/Input/Select/Dialog shadcn/ui có sẵn; modal hỗ trợ bàn phím và giữ focus.
- Bảng Admin cuộn ngang trong khung trên màn nhỏ; form chuyển một cột; thông tin có nhãn thay vì chỉ dựa màu.
- Khách phải đăng nhập Buyer ACTIVE để đặt giá. Bỏ danh tính Buyer tự tạo trước đây. Admin không đặt giá.
- Kiểm tra quyền Admin và trạng thái ACTIVE ở adapter quản lý; áp dụng permissions nếu session cung cấp.
- Bắt đầu ở tương lai, thời lượng 1–168 giờ, giá/bước giá nguyên VND dương; chặn phiên trùng sản phẩm, dữ liệu cũ và hủy không có lý do.
- Polling mô phỏng tạm dừng khi tab bị ẩn; đồng bộ thay đổi local qua storage event. Không phải realtime giữa các thiết bị.
- Khi hết giờ có lượt bid, hiển thị chờ xác nhận kết quả; không tự xác nhận người thắng, tạo đơn hoặc hoàn tiền.

## Nguồn dữ liệu và cấu hình

`NEXT_PUBLIC_AUCTION_SOURCE=mock` mở luồng Admin mô phỏng trong development. Dữ liệu đấu giá dùng localStorage `nexus.auctions.v1`, chung giữa Buyer/Admin trên cùng trình duyệt và origin; vẫn còn sau reload. Không tự xóa dữ liệu cũ. Các phiên cũ hết hạn vẫn hiển thị đúng trạng thái; tạo phiên mới để thử luồng sắp diễn ra.

Đã đặt biến này trong `.env.local` trên máy (không đưa vào Git) và mô tả trong `.env.example`. Restart `npm run dev` để nhận biến, giữ cổng 3000.

`NEXT_PUBLIC_AUCTION_SOURCE=api` hoặc bỏ biến giữ bảng Admin gọi GET `/auctions` hiện có; tạo/sửa/chi tiết quản lý hiển thị chưa khả dụng. Customer auction hiện vẫn dùng adapter local đã có, chưa được chuyển sang HTTP. Biến này chưa phải một HTTP adapter đầy đủ cho Buyer.

Auth vẫn dùng session hiện tại, không thêm tài khoản hay bỏ guard. Dữ liệu Catalog/API sản phẩm giữ nguyên. Không ghi BE từ thao tác mô phỏng. Mutation local bị chặn trong production; route Admin vẫn giữ hạn chế development đã có trước task.

## API còn cần để nghiệm thu tuần 2

- Hoàn thiện GET `/auctions`, GET `/auctions/:id`: paging/filter, thông tin sản phẩm, giờ server, version, minNextBid và trạng thái nhất quán.
- Hoàn thiện POST `/auctions/:id/bids`: hiện skeleton; cần kiểm tra quyền, DB, atomic bid, idempotency.
- Bổ sung GET `/auctions/:id/bids`, POST `/auctions`, PATCH `/auctions/:id`, POST `/auctions/:id/admin-cancel`, GET `/auctions/:id/result`.
- Scheduler, lưu dữ liệu bền vững, audit hủy, kiểm tra cạnh tranh giữa hai Buyer và xác nhận kết quả từ server.

Đây là hoàn thiện UI/luồng mô phỏng tuần 2; chưa nghiệm thu tích hợp backend tuần 2. Giao diện gallery hiện phóng lớn một ảnh từ fixture; nhiều ảnh cần DTO ảnh đầy đủ.

## Kiểm tra

Build Next.js thành công; TypeScript và 8 kiểm thử nghiệp vụ đạt, bao gồm create/edit/cancel, giữ dữ liệu, phiên trùng, version cũ, quyền, giá và thời gian. Trình duyệt công cụ chặn localhost nên chưa nghiệm thu trực quan/mobile trong phiên này.

## Rà soát Admin — màu sắc và hành vi

- Đồng bộ màu chữ/viền giữa CSS Admin và Tailwind: navy cho điều hướng, xám sáng/trắng cho nội dung, đỏ đậm cho hành động chính. Chữ phụ `#58677c`; hover nút chính `#820b0e`.
- Sửa rule cũ làm chữ sidebar 10px/opacity 0.6 và ẩn nhãn trên mobile. Tăng chữ bảng sản phẩm; giữ vùng bấm từ 44px.
- Giới hạn màu nút vào Admin và Dialog Admin; không đổi homepage/Seller/Support. Hủy phiên có kiểu viền đỏ riêng; nút phụ hover xám nhẹ.
- Tổng quan thu gọn thành lối tắt Sản phẩm/Phiên đấu và hướng dẫn kiểm tra, không thêm số thống kê giả.
- UI và adapter dùng chung kiểm tra quyền tạo/sửa/hủy; form không cho lưu khi thiếu quyền.
- Nút tải lại có phản hồi đang tải và khóa trong lúc xử lý.
- Form nhắc khi bấm liên kết rời trang (bao gồm Quay lại/Hủy thay đổi/sidebar) và cảnh báo của trình duyệt khi đóng/tải lại trang nếu có dữ liệu chưa lưu. Nút Back/Forward của trình duyệt và đăng xuất chưa có bộ chặn điều hướng riêng.
- Sản phẩm đã có phiên sắp diễn ra/đang chạy bị khóa trong Select, kèm lý do. Backend/adapter vẫn phải kiểm tra lại khi lưu để tránh race.
- Khi gửi form sai, focus về trường lỗi đầu tiên. Giữ nội dung khi lưu thất bại.

Kiểm tra: TypeScript, build FE, kiểm thử nghiệp vụ đấu giá. Công cụ trình duyệt vẫn chặn localhost; chưa xác nhận bằng screenshot tương tác thực.
