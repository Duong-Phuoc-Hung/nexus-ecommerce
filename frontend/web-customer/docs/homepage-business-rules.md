# Trang chủ Nexus — đối chiếu nghiệp vụ và UX

## Vấn đề và phương án

Bản trước trộn listing mua sắm với listing đấu giá trong cùng lưới, đồng thời đưa các phiên đấu lên đầu lưới. Người xem dễ hiểu giá đang được trả là giá mua, hoặc tưởng mọi sản phẩm đều phải đấu giá. Nhãn “Giá cố định” chỉ giải thích mô hình dữ liệu, không giúp khách chọn món đồ.

Trang mới có hai khu vực độc lập:

| Khu vực           | Dữ liệu         | Ý nghĩa giá                  | Thông tin riêng                                          | Luồng thật khi backend sẵn sàng                          |
| ----------------- | --------------- | ---------------------------- | -------------------------------------------------------- | -------------------------------------------------------- |
| Nexus Live        | Listing đấu giá | Giá hiện tại / giá khởi điểm | Thời gian, trạng thái, lượt trả, bước giá trong chi tiết | Phiên hợp lệ → bid hợp lệ → kết quả phiên → đơn hàng     |
| Khám phá sản phẩm | Listing mua sắm | Giá bán                      | Tên, tình trạng, người bán, đánh giá và đã bán mẫu       | Chi tiết → SKU/số lượng → giỏ hàng → checkout → đơn hàng |

Không lặp sản phẩm đấu giá trong lưới mua sắm. Nhãn đấu giá được giữ vì đó là luồng đặc biệt. Sản phẩm mua sắm không cần badge “Giá cố định” hoặc nhãn “Giá niêm yết” trên mỗi thẻ. Không thêm giảm giá, chứng nhận chính hãng hoặc freeship khi chưa có dữ liệu hỗ trợ.

## Đối chiếu SRS v1

- SRS 3.3.1: xem sản phẩm và danh sách sản phẩm.
- SRS 3.3.3: tìm kiếm, lọc, sắp xếp và discovery. Tìm kiếm tên/danh mục/người bán áp dụng cho cả hai khu, kết quả vẫn hiển thị riêng. Khoảng giá và sắp xếp giá trong khu mua sắm chỉ dùng giá bán; tab sắp kết thúc/nhiều lượt trả trong khu đấu giá chỉ dùng dữ liệu phiên.
- SRS 3.4.1–3.4.3: giỏ hàng, checkout và quản lý đơn hàng là luồng commerce; homepage chưa triển khai các thao tác này.
- SRS 3.5.1–3.5.2: đấu giá có trạng thái/thời gian, giá khởi điểm, bước giá và bid validation. Giá hiện tại không đồng nghĩa giá thanh toán cuối cùng hoặc xác nhận thắng phiên.
- SRS Order Creation/Consistency: chỉ kết quả auction hợp lệ và hoàn tất mới tạo đơn hàng đấu giá; không chuyển một lần bid trực tiếp thành đơn hàng.

## Khách chưa đăng nhập

Khách được xem banner, danh mục, danh sách, tìm kiếm và lọc. Bấm ảnh, tên, nút xem hoặc lưu một sản phẩm mở cùng popup mời đăng nhập/đăng ký, có tên và ảnh món đồ liên quan. Header có nút Đăng nhập. Có nút đóng, Escape, nhấn nền và Tiếp tục xem trang chủ; focus được quản lý bằng native dialog.

Đăng nhập liên kết `/login`; đăng ký liên kết `/register` và dùng `AuthPage` hiện có của nhóm. Chỉ route wrapper đọc mode, không tạo form auth mới. Popup không thu thập mật khẩu và không tự cấp quyền/session.

**Điểm cần nhóm thống nhất:** SRS View Product chưa ghi rõ phải đăng nhập mới xem chi tiết; gate này là yêu cầu UX mới của chủ project, không phải điều kiện được suy ra từ SRS. Khi tích hợp session thật, phải thay trạng thái guest hiện tại bằng auth contract của nhóm và tiếp tục action bằng route/contract sản phẩm được nhóm xác nhận. UI gate không thay thế authorization backend.

## Dữ liệu và giới hạn

24 listing mua sắm + 7 listing đấu giá, vẫn trong 4 danh mục để phù hợp nhóm 6 người / 2–3 tháng. Tăng fixture không đồng nghĩa mở rộng bounded context. Giá, uy tín, đánh giá, số lượng đã bán, lịch sử và người bán đều là mock. Ảnh stock chỉ minh họa nhóm sản phẩm, không bảo đảm đúng model. Không có thanh toán, đặt hàng hoặc bid thật.

Countdown bắt đầu từ fixture khi tải trang. Homepage hiện dùng luồng guest cho tới khi nối auth của nhóm; không tự nhận demo session cũ là tài khoản thật. Khách bấm sản phẩm mở popup mời đăng nhập/đăng ký.

## Banner

Ba banner cho mua sắm, đấu giá và phong cách. Có trước/sau và chọn banner; tự chuyển sau 8 giây. Không hiển thị nút play/pause theo yêu cầu mới. Nền MP4 tự phát, loop, muted và playsInline. Carousel tạm dừng khi hover/focus. Video dừng khi popup mở hoặc tab nền; reduced-motion dùng poster tĩnh. Video stock đĩa than dùng để tạo không khí, không đại diện cho listing cụ thể; poster hiển thị khi autoplay bị chặn hoặc tải video lỗi. Tham chiếu: https://www.w3.org/WAI/tutorials/carousels/animations/.

## Tiêu chí nghiệm thu

1. Lưới mua sắm chỉ có `mode=fixed`; khu Live chỉ có `mode=auction`.
2. Không có badge “Giá cố định” trên listing mua sắm; không có countdown/lượt trả ở thẻ mua sắm.
3. Khách bấm sản phẩm bất kỳ mở popup account, không mở chi tiết/bid demo.
4. Hai CTA đến đúng mode của trang auth hiện có; không tự đăng nhập khi đóng popup.
5. Tìm kiếm tiếng Việt không dấu, lọc và xem thêm hoạt động với fixture.
6. Banner chuyển trước/sau vòng tròn, tự chuyển, video chạy không âm thanh, reduced-motion không tự chạy.
7. Desktop/mobile không tràn trang; dialog dùng được bằng bàn phím.
