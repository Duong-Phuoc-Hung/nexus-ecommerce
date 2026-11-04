# Nhật Ký Công Việc & Bàn Giao Kỹ Thuật (Frontend Work Tracker)

Tài liệu này ghi lại toàn bộ các nhiệm vụ đã được yêu cầu, triển khai và hoàn thành trong đợt nâng cấp giao diện, luồng phân quyền và trải nghiệm người dùng (UX) cho phân hệ **Support (Bộ phận hỗ trợ)** và **Seller (Không gian người bán)** thuộc dự án **Nexus E-Commerce**.

---

## 📌 Tổng Quan Các Nhánh Git (Git Branches)

| Tên nhánh                           | Mục tiêu                                                                                                                         | Trạng thái                      |
| :---------------------------------- | :------------------------------------------------------------------------------------------------------------------------------- | :------------------------------ |
| **`fix/fe-auth-login-redirect`**    | Khắc phục lỗi điều hướng phân quyền khi Đăng nhập và làm sạch URL khi Đăng xuất                                                  | ✅ Đã hoàn thành & Commit local |
| **`feat/fe-seller-support-portal`** | Nâng cấp giao diện Support & Seller (Dropdown Shadcn, Form Dialog, Việt hóa, Tiến trình vận đơn, Soft-delete & Recover sản phẩm) | ✅ Đã hoàn thành & Commit local |

> [!NOTE]
> Toàn bộ commit đều được giữ ở local và vượt qua script kiểm tra quy chuẩn nhánh `scripts/verify-branch-name.js`. Chưa thực hiện lệnh `git push` lên remote theo đúng yêu cầu.

---

## 📋 Danh Sách Nhiệm Vụ & Chi Tiết Triển Khai

### 1. Phân hệ Xác thực & Điều hướng (Authentication & Session Navigation)

- **Nhánh:** `fix/fe-auth-login-redirect`
- **Vấn đề ban đầu:**
  1. Khi người dùng đăng nhập tài khoản Hỗ trợ (`SUPPORT_STAFF`) hoặc Người bán (`SELLER`) trong lúc URL còn dính tham số `?next=%2Fadmin`, hệ thống điều hướng nhầm vào `/admin` và bị chặn quyền 403.
  2. Khi người dùng bấm **Đăng xuất** từ trang Người bán (`/seller`), Hỗ trợ (`/support`) hoặc Quản trị (`/admin`), các Route Guard kích hoạt lại khi `user = null` và tự động nối chuỗi `?next=%2Fseller`, `?next=%2Fsupport`, `?next=%2Fadmin` vào thanh địa chỉ thay vì chuyển về `/login` thuần túy.
- **Giải pháp đã thực hiện:**
  - **Xử lý phân quyền đích đến (`resolveAuthDestination`):**
    - Thêm hàm `resolveAuthDestination` tại [navigation.ts](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/lib/utils/navigation.ts) để đối chiếu quyền hạn thực tế của tài khoản với đường dẫn đích:
      - `ADMIN` $\rightarrow$ `/admin`
      - `SELLER` $\rightarrow$ `/seller`
      - `SUPPORT_STAFF` / `SUPPORT` $\rightarrow$ `/support`
      - `BUYER` $\rightarrow$ `/`
  - **Làm sạch URL khi đăng nhập demo:**
    - Tại [AuthPage.tsx](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/auth/components/AuthPage.tsx), tự động làm sạch tham số `?next` khi bấm vào các pill tài khoản mẫu.
  - **Làm sạch URL khi đăng xuất:**
    - Cập nhật các Route Guard ([seller-route-guard.tsx](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/seller/components/seller-route-guard.tsx), [support-route-guard.tsx](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/support/components/support-route-guard.tsx), [admin-route-guard.tsx](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/admin/components/admin-route-guard.tsx)) và hàm logout ([seller-shell.tsx](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/seller/components/seller-shell.tsx), [support-shell.tsx](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/support/components/support-shell.tsx)) để chuyển hướng dứt khoát về `/login` thuần túy, không nối query parameter.

---

### 2. Phân hệ Hỗ Trợ & Vận Hành (Support Workspace)

- **Nhánh:** `feat/fe-seller-support-portal`
- **Các nhiệm vụ đã hoàn thành:**

#### A. Chuẩn hóa Dropdown sang Shadcn `Select`

- Đã thay thế toàn bộ thẻ `<select>` gốc bằng component [Select](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/components/ui/select.tsx) của Shadcn UI (Radix UI) trên toàn bộ các màn hình:
  - Tra cứu vận đơn: Dropdown chọn trạng thái cập nhật ([support-shipments-page.tsx](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/support/screens/support-shipments-page.tsx)).
  - Tra cứu người dùng: Dropdown lọc theo vai trò ([support-users-page.tsx](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/support/screens/support-users-page.tsx)).
  - Tra cứu đơn hàng: Dropdown lọc trạng thái đơn ([support-orders-page.tsx](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/support/screens/support-orders-page.tsx)).

#### B. Chuyển ngữ toàn bộ sang Tiếng Việt

- Trạng thái vận đơn: _Chờ lấy hàng, Đã lấy hàng, Đang vận chuyển, Đang giao hàng, Đã giao hàng, Giao hàng thất bại, Đã trả hàng_.
- Trạng thái đơn hàng: _Chờ xử lý, Đang xử lý, Đang giao hàng, Đã giao hàng, Đã hủy, Đã hoàn tiền_.
- Trạng thái người dùng: _Đang hoạt động, Ngừng hoạt động, Tạm khóa_.
- Toàn bộ tiêu đề trang, nhãn thống kê, cột bảng biểu, thanh điều hướng sidebar và breadcrumbs trong [support-shell.tsx](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/support/components/support-shell.tsx) và [support-dashboard.tsx](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/support/screens/support-dashboard.tsx) đã được dịch chuẩn tiếng Việt.

#### C. Điều chỉnh phân cấp quyền hạn tra cứu người dùng

- Tại [support-users-page.tsx](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/support/screens/support-users-page.tsx):
  - Nhân viên hỗ trợ (Support Staff) có trách nhiệm hỗ trợ khách hàng và đối tác trên sàn. Do đó, danh mục lọc vai trò được giới hạn đúng thẩm quyền:
    - _Tất cả khách hàng & đối tác_
    - _Người mua (Khách hàng)_
    - _Người bán (Đối tác)_
  - Đã loại bỏ vai trò **Quản trị viên (ADMIN)** khỏi bộ lọc và tự động ẩn các tài khoản Admin khỏi bảng kết quả để đảm bảo phân cấp thẩm quyền.

#### D. Nâng cấp thanh tiến trình vận chuyển & Khắc phục trùng lặp mốc "Đã giao"

- Tại [support-shipments-page.tsx](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/support/screens/support-shipments-page.tsx):
  - **Thanh tiến trình trực quan:** Bổ sung thanh tiến trình 4 giai đoạn rõ ràng: **Tạo vận đơn** $\rightarrow$ **Lấy hàng** $\rightarrow$ **Đang giao** $\rightarrow$ **Đã giao** với màu sắc trạng thái sinh động (hoàn thành: xanh lá có dấu check, đang thực hiện: xanh dương có hiệu ứng viền, chưa tới: xám) thông qua [support.css](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/support/components/support.css#L535-L625).
  - **Khắc phục lỗi trùng lặp:** Thêm hàm lọc khử trùng lặp (`cleanTimeline`) để loại bỏ hoàn toàn hiện tượng hiển thị 2 dòng "Đã giao" liên tiếp nhau khi vận đơn đạt trạng thái hoàn tất.

#### E. Thay thế `window.prompt` bằng Modal Dialog chuẩn form

- **Điều chỉnh khu vực vận đơn ([support-shipments-page.tsx](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/support/screens/support-shipments-page.tsx)):** Thay thế popup trình duyệt bằng Form Dialog Shadcn với ô nhập liệu Tỉnh/Thành phố và hai nút bấm "Xác nhận cập nhật" / "Hủy bỏ".
- **Hủy đơn & Hoàn tiền ([support-order-detail-page.tsx](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/support/screens/support-order-detail-page.tsx)):** Thay thế popup trình duyệt bằng Form Dialog có textarea nhập lý do chi tiết.

---

### 3. Phân hệ Người Bán (Seller Center)

- **Nhánh:** `feat/fe-seller-support-portal`
- **Các nhiệm vụ đã hoàn thành:**

#### A. Chuẩn hóa Dropdown sang Shadcn `Select`

- Đã thay thế thẻ `<select>` gốc bằng Shadcn `Select` tại:
  - Bộ lọc trạng thái sản phẩm ([seller-products-page.tsx](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/seller/screens/seller-products-page.tsx)).
  - Danh mục sản phẩm & Trạng thái sản phẩm trong form tạo/sửa ([seller-product-form.tsx](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/seller/screens/seller-product-form.tsx)).
  - Bộ lọc trạng thái đơn hàng ([seller-orders-page.tsx](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/seller/screens/seller-orders-page.tsx)).
  - Chọn sản phẩm đấu giá ([seller-auction-form.tsx](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/seller/screens/seller-auction-form.tsx)).

#### B. Tự động chuyển hướng khi thêm sản phẩm thành công

- Trong [seller-product-form.tsx](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/seller/screens/seller-product-form.tsx#L145-L160), khi người bán thêm một sản phẩm mới thành công, hệ thống tự động gọi `router.push('/seller/products')` để đưa người bán về danh sách sản phẩm ngay lập tức mà không cần bấm thủ công nút quay lại.

#### C. Bổ sung trạng thái "Đã xóa" và nút Khôi phục (Recover)

- Trong [seller-products-page.tsx](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/seller/screens/seller-products-page.tsx):
  - **Trạng thái Đã xóa (`DELETED`):** Bổ sung vào bộ lọc dropdown để người bán có thể xem riêng các sản phẩm đã xóa.
  - **Hộp thoại xác nhận xóa:** Thay thế `window.confirm` bằng Modal Dialog hiển thị rõ tên, mã SKU, giá bán của sản phẩm trước khi xóa.
  - **Cơ chế Soft-delete:** Khi xác nhận xóa, sản phẩm được chuyển sang trạng thái "Đã xóa" với huy hiệu màu đỏ cảnh báo thay vì bị gỡ bỏ khỏi bảng.
  - **Phân định nút thao tác:**
    - Với sản phẩm có trạng thái **Đã xóa**: Chỉ hiển thị **duy nhất** nút **`↻ Khôi phục`** (Recover), không hiển thị nút Sửa hay Xóa.
    - Với các trạng thái bình thường (_Đang bán, Bản nháp, Lưu trữ, Hết hàng_): Hiển thị đầy đủ hai nút **Sửa** và **Xóa**.
  - **Khôi phục sản phẩm:** Khi bấm **Khôi phục**, sản phẩm lập tức trở lại trạng thái **"Đang bán" (`ACTIVE`)** và hiển thị thông báo thành công.

#### D. Thay thế `window.prompt` khi hủy đơn hàng

- Trong [seller-orders-page.tsx](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/seller/screens/seller-orders-page.tsx), thao tác hủy đơn hàng từ phía người bán được chuyển sang Form Dialog chuẩn Shadcn với ô nhập lý do hủy.

#### E. Chuyển ngữ Tiếng Việt toàn diện

- Toàn bộ các trang Seller ([seller-dashboard.tsx](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/seller/screens/seller-dashboard.tsx), [seller-inventory-page.tsx](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/seller/screens/seller-inventory-page.tsx), [seller-auctions-page.tsx](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/seller/screens/seller-auctions-page.tsx), [seller-shared.tsx](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/seller/components/seller-shared.tsx)) đều đã được chuẩn hóa sang tiếng Việt.

---

## 🛠 Kiểm Thử & Đảm Bảo Chất Lượng (QA & Build Verification)

1. **Next.js Production Build:**
   - Lệnh thực hiện: `npm --prefix frontend/web run build`
   - Kết quả: **Thành công 100% (27/27 static & dynamic routes)**, không có lỗi cú pháp, lint hay xung đột kiểu dữ liệu TypeScript.
2. **Tuân thủ ranh giới kiến trúc:**
   - Không chạm vào bất kỳ file Backend nào (`backend/*`).
   - Không chạm vào các thành phần không liên quan ngoài phạm vi yêu cầu.
3. **Quy ước nhánh Git:**
   - Kiểm tra thông qua `node scripts/verify-branch-name.js`: Hợp lệ và sẵn sàng tích hợp.

---

## 📁 Danh Sách File Đã Can Thiệp

### Nhóm Auth & Điều hướng

- [`frontend/web/src/lib/utils/navigation.ts`](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/lib/utils/navigation.ts)
- [`frontend/web/src/modules/auth/components/AuthPage.tsx`](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/auth/components/AuthPage.tsx)
- [`frontend/web/src/modules/admin/components/admin-route-guard.tsx`](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/admin/components/admin-route-guard.tsx)
- [`frontend/web/src/modules/seller/components/seller-route-guard.tsx`](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/seller/components/seller-route-guard.tsx)
- [`frontend/web/src/modules/support/components/support-route-guard.tsx`](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/support/components/support-route-guard.tsx)

### Nhóm Support

- [`frontend/web/src/modules/support/components/support-shell.tsx`](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/support/components/support-shell.tsx)
- [`frontend/web/src/modules/support/components/support.css`](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/support/components/support.css)
- [`frontend/web/src/modules/support/screens/support-dashboard.tsx`](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/support/screens/support-dashboard.tsx)
- [`frontend/web/src/modules/support/screens/support-orders-page.tsx`](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/support/screens/support-orders-page.tsx)
- [`frontend/web/src/modules/support/screens/support-order-detail-page.tsx`](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/support/screens/support-order-detail-page.tsx)
- [`frontend/web/src/modules/support/screens/support-shipments-page.tsx`](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/support/screens/support-shipments-page.tsx)
- [`frontend/web/src/modules/support/screens/support-users-page.tsx`](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/support/screens/support-users-page.tsx)

### Nhóm Seller

- [`frontend/web/src/modules/seller/components/seller-shell.tsx`](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/seller/components/seller-shell.tsx)
- [`frontend/web/src/modules/seller/components/seller-shared.tsx`](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/seller/components/seller-shared.tsx)
- [`frontend/web/src/modules/seller/components/seller.css`](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/seller/components/seller.css)
- [`frontend/web/src/modules/seller/screens/seller-dashboard.tsx`](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/seller/screens/seller-dashboard.tsx)
- [`frontend/web/src/modules/seller/screens/seller-products-page.tsx`](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/seller/screens/seller-products-page.tsx)
- [`frontend/web/src/modules/seller/screens/seller-product-form.tsx`](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/seller/screens/seller-product-form.tsx)
- [`frontend/web/src/modules/seller/screens/seller-orders-page.tsx`](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/seller/screens/seller-orders-page.tsx)
- [`frontend/web/src/modules/seller/screens/seller-inventory-page.tsx`](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/seller/screens/seller-inventory-page.tsx)
- [`frontend/web/src/modules/seller/screens/seller-auctions-page.tsx`](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/seller/screens/seller-auctions-page.tsx)
- [`frontend/web/src/modules/seller/screens/seller-auction-form.tsx`](file:///d:/TaiLieu-OJT/nexus-ecommerce-git/frontend/web/src/modules/seller/screens/seller-auction-form.tsx)
