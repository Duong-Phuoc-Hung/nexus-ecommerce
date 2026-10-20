# Đối chiếu chuyển code từ GitLab

Nguồn: `origin/main` tại commit `727c30f`. Đây là đối chiếu code, không phải kiểm thử giao diện bằng ảnh.

| Phần                     | Kết quả                                      |
| ------------------------ | -------------------------------------------- |
| `SellerDashboard`        | Giữ nguyên thân hàm; chuyển vào screen riêng |
| `SellerProductsPage`     | Giữ nguyên thân hàm; chuyển vào screen riêng |
| `SellerProductForm`      | Giữ nguyên thân hàm; chuyển vào screen riêng |
| `SellerAuctionsPage`     | Giữ nguyên thân hàm; chuyển vào screen riêng |
| `SellerAuctionForm`      | Giữ nguyên thân hàm; chuyển vào screen riêng |
| `SellerOrdersPage`       | Giữ nguyên thân hàm; chuyển vào screen riêng |
| `SellerInventoryPage`    | Giữ nguyên thân hàm; chuyển vào screen riêng |
| CSS seller               | Nội dung giống GitLab                        |
| `SupportDashboard`       | Giữ nguyên thân hàm; chuyển vào screen riêng |
| `SupportOrdersPage`      | Giữ nguyên thân hàm; chuyển vào screen riêng |
| `SupportOrderDetailPage` | Giữ nguyên thân hàm; chuyển vào screen riêng |
| `SupportUsersPage`       | Giữ nguyên thân hàm; chuyển vào screen riêng |
| `SupportShipmentsPage`   | Giữ nguyên thân hàm; chuyển vào screen riêng |
| CSS support              | Nội dung giống GitLab                        |

Bổ sung phần riêng từ web-admin:

- Giữ thao tác đăng xuất và tên tài khoản Support; chuyển sang SessionProvider chung.
- Chuyển getRoles/assignRole sang modules/admin/api/roles.api.ts; giữ endpoint, phương thức và body, dùng Axios chung.
- Đăng nhập/đăng xuất/getCurrentUser của admin-api cũ dùng chung modules/auth/api/auth.api.ts, không tạo kho token riêng.
- Hai bản support-pages trên GitLab giống nhau; dùng một bộ screen.
- Giữ AuctionDirectory/MarketplaceDirectory như component tùy chọn; route /auctions vẫn dùng AuctionList như main.
- Client HTTP, cấu hình app và route trùng được hợp nhất. File .gitkeep chỉ là chỗ trống, không phải chức năng.

Không thực hiện gọi API gán vai trò lên dữ liệu thật trong quá trình chuyển code.
