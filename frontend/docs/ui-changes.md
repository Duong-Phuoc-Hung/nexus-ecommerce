# Cập nhật giao diện

- Gộp giao diện Admin vào web-customer: `/admin`, `/admin/products`, `/admin/products/new`, `/admin/products/:id/edit`.
- Tổ chức theo module nghiệp vụ; đổi tên file CSS và contract test không phụ thuộc tuần triển khai.
- Cho khách xem danh sách và chi tiết sản phẩm trực tiếp.
- Giãn khoảng cách biểu tượng và chữ Nexus trên trang chủ, Auth và hộp thoại.
- Dùng các component Button, Input, Textarea, Select và Dialog theo cấu trúc shadcn/ui/Radix; hỗ trợ bàn phím và trả focus khi đóng hộp thoại.
- Bỏ nhãn dữ liệu mẫu khỏi nội dung hiển thị; giữ video banner.
- Form Admin kiểm tra dữ liệu nhưng chưa lưu backend. `/admin` hiện chỉ phục vụ xem UI ở development.
