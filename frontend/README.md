# Frontend Architecture & Structure Specification (FE)

> **Tài liệu tham chiếu:** SRS Project Nexus v1.0 (Section 1.2, 2.3, 2.4, 3.1 - 3.6)  
> **Nền tảng kỹ thuật:** React 18+, Next.js (App/Pages router), TypeScript, Tailwind CSS, TanStack Query (React Query), Socket.IO Client, Stripe Elements.  
> **Cổng tiếp nhận duy nhất:** Mọi yêu cầu từ Frontend đều gửi đến **API Gateway** (`http://localhost:8000/api/v1`).

---

## 1. Phân Tách Ứng Dụng Giao Diện Người Dùng

Theo SRS (Section 1.2 & 2.3), các tác nhân người dùng (Actors) được phục vụ qua 2 ứng dụng giao diện web độc lập:

1. **`web-customer/`**:
   - Dành cho **Người mua (Buyer)**: Tìm kiếm, lọc sản phẩm, giỏ hàng, đặt hàng thanh toán thẻ Stripe, tham gia phòng đấu giá thời gian thực, đánh giá uy tín người bán.
   - Dành cho **Người bán (Seller)**: Quản lý danh sách sản phẩm đăng bán, theo dõi số lượng tồn kho theo SKU, tạo phòng đấu giá mới, theo dõi người tham gia.
2. **`web-admin/`**:
   - Dành cho **Quản trị viên (Admin)**: Phân quyền tài khoản theo 65 mã Privileges (SRS 2.7), kiểm duyệt sản phẩm, hủy khẩn cấp phiên đấu giá vi phạm, chỉnh sửa cấu hình hệ thống (SRS 2.6), tra cứu nhật ký sự kiện (`event_logs`), theo dõi sức khỏe kết nối RabbitMQ.
   - Dành cho **Nhân viên hỗ trợ (Support Staff)**: Xử lý tranh chấp, khiếu nại hoàn tiền đơn hàng của Buyer/Seller.

---

## 2. Cây Thư Mục Chi Tiết Của `frontend/`

```text
frontend/
│
├── web-customer/                            # ỨNG DỤNG CHO BUYER & SELLER (Next.js + TypeScript)
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── .env.example
│   ├── public/
│   │   ├── icons/
│   │   └── images/
│   └── src/
│       ├── configs/
│       │   └── app.config.ts                # URL trỏ vào API Gateway, Stripe Public Key
│       ├── components/                      # Các khối giao diện tái sử dụng
│       │   ├── common/                      # Thành phần cơ bản
│       │   │   ├── button.tsx
│       │   │   ├── input.tsx
│       │   │   ├── modal.tsx
│       │   │   ├── pagination.tsx
│       │   │   └── toast-notification.tsx
│       │   ├── layout/                      # Khung trang chính
│       │   │   ├── header.tsx               # Chứa ô tìm kiếm nhanh, icon giỏ hàng, menu tài khoản
│       │   │   ├── footer.tsx
│       │   │   └── navigation-bar.tsx       # Menu danh mục 3 cấp (SRS 3.3.2)
│       │   ├── catalog/                     # Khối sản phẩm & Danh mục (SRS 3.3)
│       │   │   ├── product-card.tsx         # Hiển thị ảnh, tên, giá, trạng thái
│       │   │   ├── category-tree.tsx        # Menu hiển thị cây danh mục đa cấp (tối đa 3 tầng)
│       │   │   ├── search-filter-bar.tsx    # Bộ lọc giá, khoảng giá, sắp xếp theo tên/ngày
│       │   │   └── product-gallery.tsx      # Slide hiển thị tối đa 5 hình ảnh sản phẩm (SRS 2.6)
│       │   ├── cart/                        # Khối giỏ hàng (SRS 3.4.1)
│       │   │   ├── cart-drawer.tsx          # Ngăn kéo giỏ hàng xuất hiện bên phải màn hình
│       │   │   ├── cart-item-row.tsx        # Dòng sản phẩm kèm nút tăng/giảm số lượng
│       │   │   └── cart-price-summary.tsx   # Tạm tính, mã giảm giá, thuế, phí ship ước tính
│       │   ├── checkout/                    # Khối thanh toán (SRS 3.4.2)
│       │   │   ├── shipping-address-form.tsx# Form nhập địa chỉ giao nhận hàng
│       │   │   ├── stripe-card-element.tsx  # Khung quẹt thẻ ngân hàng quốc tế an toàn (Stripe)
│       │   │   └── checkout-timer.tsx       # Đồng hồ đếm ngược 15 phút của phiên checkout
│       │   ├── auction/                     # Phòng đấu giá trực tiếp (SRS 3.5)
│       │   │   ├── live-auction-card.tsx    # Thẻ tóm tắt phiên đấu giá đang diễn ra
│       │   │   ├── live-bid-ticker.tsx      # Bảng nhảy giá tức thì qua WebSocket (Socket.IO)
│       │   │   ├── place-bid-form.tsx       # Form nhập giá đặt (tự động gợi ý bước giá tối thiểu)
│       │   │   └── anti-sniping-banner.tsx  # Banner báo hiệu phiên vừa được gia hạn thêm 5 phút
│       │   ├── reputation/                  # Đánh giá & Điểm uy tín (SRS 3.1.2)
│       │   │   ├── rating-form-modal.tsx    # Modal chấm điểm 1-5 sao và nhận xét sau khi nhận hàng
│       │   │   ├── trust-level-badge.tsx    # Huy hiệu cấp bậc tin cậy (Newborn, Trusted, VIP)
│       │   │   └── penalty-alert-box.tsx    # Cảnh báo đỏ nếu bị trừ điểm uy tín do quỵt tiền đấu giá
│       │   └── seller/                      # Bàn làm việc của Người bán (Seller)
│       │       ├── product-form.tsx         # Form đăng bán sản phẩm mới
│       │       ├── inventory-status.tsx     # Bảng tra cứu số lượng tồn kho theo từng mã SKU
│       │       └── create-auction-modal.tsx # Cấu hình giá khởi điểm, bước giá, giờ bắt đầu/kết thúc
│       ├── hooks/                           # Custom Hooks
│       │   ├── use-auth.ts                  # Quản lý phiên đăng nhập, thông tin người dùng hiện tại
│       │   ├── use-cart.ts                  # Thao tác giỏ hàng, tự động đồng bộ giỏ hàng khách khi login
│       │   └── use-auction-socket.ts        # Lắng nghe sự kiện giá nhảy từ WebSocket Gateway
│       ├── services/                        # Giao tiếp HTTP với Backend thông qua API Gateway
│       │   ├── api-client.ts                # Cấu hình Axios chuẩn (tự gắn JWT Token và Trace ID)
│       │   ├── auth.api.ts                  # Gọi POST /api/v1/auth/login, POST /api/v1/auth/register
│       │   ├── catalog.api.ts               # Gọi GET /api/v1/products, GET /api/v1/categories
│       │   ├── commerce.api.ts              # Gọi POST /api/v1/cart, POST /api/v1/checkout, GET /api/v1/orders
│       │   ├── auction.api.ts               # Gọi GET /api/v1/auctions, POST /api/v1/auctions/:id/bids
│       │   ├── fulfillment.api.ts           # Gọi POST /api/v1/shipping/quote, GET /api/v1/shipping/track
│       │   └── notification.api.ts          # Gọi GET /api/v1/notifications, PUT /api/v1/preferences
│       └── pages/                           # Các màn hình người dùng
│           ├── index.tsx                    # Trang chủ (Danh mục, Khám phá sản phẩm, Đang đấu giá)
│           ├── login.tsx                    # Đăng nhập tài khoản
│           ├── register.tsx                 # Đăng ký tài khoản mới
│           ├── products/
│           │   ├── index.tsx                # Trang kết quả tìm kiếm và danh mục sản phẩm
│           │   └── [id].tsx                 # Trang chi tiết sản phẩm
│           ├── cart.tsx                     # Trang xem toàn bộ giỏ hàng
│           ├── checkout.tsx                 # Trang tiến hành thanh toán đơn hàng
│           ├── orders/
│           │   ├── index.tsx                # Lịch sử đơn mua của tôi
│           │   └── [orderId].tsx            # Chi tiết đơn mua, hóa đơn điện tử & tra cứu vận đơn
│           ├── auctions/
│           │   ├── index.tsx                # Danh sách tất cả các phiên đấu giá
│           │   └── [auctionId].tsx          # Phòng đấu giá trực tiếp (Live Bidding Room)
│           ├── seller/
│           │   ├── dashboard.tsx            # Bảng tổng quan doanh thu và số lượng đơn
│           │   ├── products.tsx             # Quản lý danh sách sản phẩm đăng bán
│           │   └── auctions.tsx             # Quản lý các phiên đấu giá đang mở
│           └── profile.tsx                  # Quản lý hồ sơ cá nhân, đổi mật khẩu, lịch sử uy tín
│
└── web-admin/                               # CỔNG QUẢN TRỊ VIÊN & HỖ TRỢ (Vite + React Dashboard)
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── .env.example
    └── src/
        ├── configs/
        │   └── admin.config.ts              # URL Backend Gateway
        ├── components/
        │   ├── layout/                      # Khung làm việc quản trị
        │   │   ├── admin-sidebar.tsx        # Menu chức năng theo phân quyền
        │   │   ├── admin-topbar.tsx         # Thanh tiêu đề, thông tin Admin đang trực
        │   │   └── admin-footer.tsx
        │   └── datatable/                   # Bảng hiển thị dữ liệu chuyên nghiệp
        │       ├── data-table.tsx           # Hỗ trợ phân trang, lọc từ khóa, sắp xếp cột
        │       └── status-badge.tsx         # Hiển thị nhãn màu cho các trạng thái đơn/phiên
        ├── pages/                           # Các màn hình quản trị theo chức năng SRS
        │   ├── dashboard/                   # Báo cáo thống kê toàn sàn
        │   │   └── index.tsx
        │   ├── users/                       # Quản lý tài khoản (SRS 3.1.1)
        │   │   ├── user-list.page.tsx       # Bảng danh sách người dùng, xóa mềm tài khoản
        │   │   ├── user-detail.page.tsx     # Chi tiết hồ sơ, lịch sử vi phạm
        │   │   └── role-permission.page.tsx # Ma trận phân quyền 65 mã Privileges (SRS 2.7)
        │   ├── catalog/                     # Kiểm duyệt sản phẩm & Danh mục (SRS 3.3)
        │   │   ├── category-manager.page.tsx# Thêm/sửa cây danh mục tối đa 3 cấp
        │   │   └── product-moderation.page.tsx # Kiểm duyệt gỡ sản phẩm vi phạm
        │   ├── orders/                      # Quản lý đơn hàng & Khiếu nại (SRS 3.4.3)
        │   │   ├── all-orders.page.tsx      # Quản lý toàn bộ đơn hàng trên sàn
        │   │   └── refund-requests.page.tsx # Xử lý và duyệt yêu cầu hoàn tiền
        │   ├── auctions/                    # Giám sát sàn đấu giá (SRS 3.5)
        │   │   ├── auction-monitor.page.tsx # Màn hình theo dõi các phiên đấu giá đang mở
        │   │   └── force-cancel-modal.tsx   # Modal dành riêng cho Admin cưỡng chế hủy phiên vi phạm
        │   ├── reputation/                  # Quản lý điểm uy tín & Xử lý phạt (SRS 3.1.2)
        │   │   ├── penalty-manager.page.tsx # Danh sách phạt vi phạm (quá hạn thanh toán, bùng cọc)
        │   │   └── manual-adjust.page.tsx   # Điều chỉnh điểm uy tín thủ công khi giải quyết tranh chấp
        │   ├── fulfillment/                 # Quản lý Kho & Vận chuyển (SRS 3.6)
        │   │   ├── warehouse-list.page.tsx  # Danh sách kho hàng vật lý trong hệ thống
        │   │   └── shipment-tracking.page.tsx# Tra cứu tình trạng giao nhận của GHN và GHTK
        │   └── system/                      # Quản trị hệ thống (SRS 3.2.1, 3.2.2 & 2.6)
        │       ├── event-logs.page.tsx      # Xem nhật ký toàn bộ sự kiện hệ thống (Bất biến)
        │       ├── event-log-detail.modal.tsx # Xem chi tiết gói tin JSON của từng sự kiện
        │       ├── system-configs.page.tsx  # Bảng chỉnh sửa trực tiếp các tham số hệ thống (SRS 2.6)
        │       └── broker-health.page.tsx   # Màn hình theo dõi trạng thái kết nối RabbitMQ
        └── services/
            └── admin-api.ts                 # Các hàm gọi API quản trị phía Backend
```

---

## 3. Các Luồng Nghiệp Vụ Chính Trên Giao Diện

1. **Phòng Đấu Giá Thời Gian Thực (`/auctions/[auctionId]`)**:
   - Khởi tạo kết nối Socket.IO tới API Gateway.
   - Nhận tín hiệu sự kiện `BidPlaced` từ server để cập nhật giá cao nhất tức thì lên bảng `live-bid-ticker.tsx`.
   - Nếu có ai đó trả giá vào phút cuối cùng, banner `anti-sniping-banner.tsx` hiện thông báo gia hạn thêm 5 phút.
2. **Thanh Toán Đơn Hàng (`/checkout`)**:
   - Hiển thị bộ đếm ngược 15 phút `checkout-timer.tsx`.
   - Sử dụng `@stripe/react-stripe-js` render khung nhập thẻ ngân hàng an toàn.
   - Khi thanh toán thành công, chuyển hướng người dùng sang trang chi tiết đơn hàng `/orders/[orderId]` để xem hóa đơn điện tử.
