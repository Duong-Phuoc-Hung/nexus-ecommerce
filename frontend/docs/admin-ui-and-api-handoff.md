# Admin — giao diện và bàn giao API

Ngày rà soát: 29/10/2026. Đối chiếu SRS Nexus v1.0, ma trận quyền và code backend đang có trên máy. Không sửa backend; không coi build FE thành công là kiểm chứng giao dịch thật.

## 1. Các màn hình

| URL                               | Nội dung đã làm                                                                     | Trạng thái ghi dữ liệu                                               |
| --------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| /admin                            | Tổng quan, liên kết nhanh và 4 nhóm công việc                                       | Không tạo KPI giả                                                    |
| /admin/products                   | Danh sách, tìm kiếm, lọc trạng thái, phân trang, xác nhận xóa                       | DELETE đã nối                                                        |
| /admin/products/[id]/edit         | Form nội dung, hình ảnh, giá, tồn kho, danh mục                                     | PUT đã nối                                                           |
| /admin/products/new               | Form chuẩn bị sản phẩm cho Seller, tra cứu Seller đang hoạt động                    | Khóa lưu do contract chủ sở hữu chưa đúng                            |
| /admin/categories                 | Danh mục cha–con, tìm kiếm, chi tiết, form chuẩn bị thêm/sửa/xóa                    | Chờ API ghi                                                          |
| /admin/auctions                   | Danh sách, tìm kiếm mã, lọc trạng thái, liên kết chi tiết                           | Đọc dữ liệu thật                                                     |
| /admin/auctions/[id]              | Trạng thái, giá, bước giá, lịch, lịch sử trả giá khi có                             | Sửa/hủy đang khóa                                                    |
| /admin/auctions/new và /[id]/edit | Form cấu hình giá, sản phẩm và lịch                                                 | Chờ API quản lý phiên                                                |
| /admin/orders và /[id]            | Tra cứu đơn, chi tiết sản phẩm trong đơn; dialog hủy/hoàn tiền/trạng thái           | Chưa mở ghi vì persistence và thanh toán chưa đồng bộ                |
| /admin/shipments và /[id]         | Danh sách, chi tiết, hành trình, cập nhật trạng thái, điều chỉnh địa chỉ/mã vận đơn | PATCH đã nối                                                         |
| /admin/users và /[id]             | Tra cứu tài khoản, chi tiết, đổi vai trò; form chuẩn bị các thao tác khác           | PUT role đã nối                                                      |
| /admin/roles                      | Xem vai trò và danh sách quyền, dialog chuẩn bị quản lý                             | Chờ API quản lý role/quyền                                           |
| /admin/reputation và /[id]        | Tra cứu tài khoản/điểm uy tín được trả về; dialog xử lý                             | Chờ lịch sử, điều chỉnh và hình phạt                                 |
| /admin/notifications              | Khung lịch sử thông báo                                                             | Chờ danh sách thực tế                                                |
| /admin/events                     | Khung tra cứu sự kiện                                                               | Chờ đường dẫn qua Gateway                                            |
| /admin/audit                      | Khung lịch sử quản trị, chỉ đọc                                                     | Chờ API audit                                                        |
| /admin/reports                    | Khung báo cáo vận hành                                                              | Chờ số liệu tổng hợp; không lấy số lượng trang hiện tại làm tổng sàn |
| /admin/settings                   | Nhóm cấu hình đấu giá, đơn, uy tín, tài khoản, sản phẩm, kho/vận chuyển, thông báo  | Chỉ chuẩn bị đề xuất; chưa tải/lưu cấu hình                          |
| /admin/health                     | Kiểm tra phản hồi Gateway, phân biệt với health từng service                        | Đọc /health                                                          |
| /admin/profile                    | Xem/sửa họ tên, điện thoại; liên kết khôi phục mật khẩu                             | PATCH profile đã nối                                                 |

Các màn chờ BE là khung UI và trạng thái chưa sẵn sàng, không phải chức năng nghiệp vụ hoàn chỉnh. Không ghi giả vào localStorage, không dựng số liệu thống kê thay dữ liệu hệ thống.

## 2. Quyết định giao diện và logic

- Sidebar chia Vận hành / Người dùng / Giám sát / Hệ thống; cùng logo Nexus, nền slate và trắng, đỏ làm điểm nhấn. Mobile có nút mở menu; bảng cuộn ngang.
- Dùng Button, Input, Select, Textarea, Dialog hiện có theo shadcn/ui; có trạng thái tải, rỗng, lỗi, thử lại và thông báo kết quả.
- Giữ kiểm tra ADMIN + ACTIVE. Bỏ chặn toàn bộ Admin trong production vì đã có route guard; backend vẫn phải kiểm tra quyền mỗi request.
- Không tự thay vai trò của chính mình. Cho chọn BUYER, SELLER, SUPPORT_STAFF, ADMIN theo enum hiện tại của BE.
- Xóa sản phẩm có xác nhận; BE phải chặn sản phẩm liên quan đơn/phiên theo SRS. FE không thể bảo đảm quan hệ dữ liệu này.
- Tạo thay Seller chưa gửi POST: controller đang dùng authUser.id thay sellerId được chọn, có thể gán sản phẩm cho Admin.
- GET /products hiện lấy tối đa 50 bản ghi, không xử lý query phân trang. FE lọc/phân trang trên tập đã tải và nêu rõ phạm vi; cần endpoint Admin đầy đủ.
- Danh sách phiên hiện có phạm vi hạn chế. Các số trên màn chỉ là thống kê của danh sách nhận được.
- Admin không đặt giá. Phiên bắt đầu rồi không sửa giá/lịch. Hủy cần lý do, phiên bản dữ liệu và xử lý giao dịch liên quan ở BE.
- Vận chuyển chỉ cho chuyển tiếp thận trọng: READY_TO_PICK → PICKED → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED; thất bại cho giao lại hoặc trả hàng. DELIVERED/RETURNED không chuyển tiếp ở UI. Đây là chính sách FE cần BE xác nhận và cưỡng chế.
- Điều chỉnh vận đơn chỉ sửa địa chỉ/mã vận đơn; yêu cầu lý do tối thiểu 10 ký tự. Không dùng chức năng này để thay trạng thái thanh toán.
- Gửi note/reason theo contract vận chuyển nhưng code use case hiện chưa lưu lý do/operator thành audit đầy đủ: BE cần bổ sung.
- Không xem gọi refund thành công là đã chuyển tiền. Chỉ mở hoàn tiền khi contract giao dịch, idempotency và trạng thái đối soát sẵn sàng.
- Không mặc định cấu hình SRS là giá trị đang chạy. Form cấu hình để trống, khóa lưu.
- Nhật ký sự kiện/audit chỉ đọc. Không cung cấp thao tác sửa/xóa log.

## 3. API hiện FE sử dụng

Các đường dẫn dưới đây tương đối với baseURL Gateway từ env, thường là /api/v1. /health nằm ngoài /api/v1.

| Method và path                                       | Màn sử dụng                                 | Lưu ý                                  |
| ---------------------------------------------------- | ------------------------------------------- | -------------------------------------- |
| GET /products                                        | Danh sách Admin                             | Tối đa 50 bản ghi, lọc phía FE         |
| GET /products/:id                                    | Form sản phẩm, thông tin sản phẩm của phiên | 404 hiển thị lỗi, không thay bằng mẫu  |
| PUT /products/:id                                    | Sửa sản phẩm                                | BE xác thực Admin                      |
| DELETE /products/:id                                 | Xóa có xác nhận                             | BE kiểm soát quan hệ đơn/phiên         |
| GET /categories?tree=true                            | Danh mục và form sản phẩm                   | Cây tối đa 3 cấp theo SRS              |
| GET /users?q=&role=SELLER&status=ACTIVE&page=&limit= | Chọn Seller                                 | Form tạo vẫn khóa lưu                  |
| GET /users?q=&page=&limit=                           | Người dùng, uy tín                          | Phân trang theo response               |
| GET /users/:id                                       | Chi tiết tài khoản/uy tín                   | Chỉ trường được chọn được hiển thị     |
| GET /auth/roles                                      | Vai trò/quyền                               | READ hiện có; không phải CRUD role     |
| PUT /users/:id/role                                  | Đổi vai trò                                 | body: role                             |
| GET /users/profile                                   | Hồ sơ Admin                                 | Session thực                           |
| PATCH /users/profile                                 | Sửa hồ sơ Admin                             | fullName, phone                        |
| GET /auctions                                        | Danh sách phiên                             | Chưa bảo đảm bao phủ mọi trạng thái    |
| GET /auctions/:id                                    | Chi tiết phiên                              | Lịch sử chỉ hiện nếu response có bids  |
| GET /orders                                          | Danh sách đơn                               | Cần đồng bộ nguồn đơn checkout         |
| GET /orders/:id                                      | Chi tiết đơn                                | Không suy ra thanh toán từ URL         |
| GET /fulfillments/shipments                          | Vận đơn                                     | Phân trang                             |
| GET /fulfillments/shipments/:id                      | Chi tiết vận đơn                            | Hành trình từ response                 |
| PATCH /fulfillments/shipments/:id/status             | Cập nhật hành trình                         | status, location, note                 |
| PATCH /fulfillments/shipments/:id/override           | Điều chỉnh thông tin                        | trackingCode, shippingAddress, reason  |
| GET /health                                          | Tình trạng Gateway                          | Không chứng minh service phía sau khỏe |

POST /products có ở BE nhưng UI tạo thay Seller chưa sử dụng. POST /orders/:id/cancel và /refund có route, nhưng chưa mở từ màn Admin mới vì không đủ bảo đảm đồng bộ order/payment.

## 4. Backlog BE để hoàn thành Admin theo SRS

Tên URL dưới đây là đề xuất nếu chưa tồn tại, nhóm BE có thể chốt tên khác. Cần gửi contract request/response, quyền, mã lỗi và ví dụ để FE nối; không chỉ thông báo “đã có route”.

### Ưu tiên P0 — dữ liệu và thao tác hiện có

1. Danh sách sản phẩm Admin có phân trang toàn sàn, total và bộ lọc q/status/category/seller; không bỏ qua query hay cắt 50 âm thầm.
2. POST /products: Admin chọn sellerId, kiểm tra Seller ACTIVE; Seller tự tạo lấy ID từ token; phản hồi đầy đủ hoặc ID cho GET chi tiết.
3. PUT/DELETE sản phẩm: kiểm tra đơn/phiên liên quan, soft delete, xung đột cập nhật (409), ngăn thay đổi dữ liệu đang được dùng.
4. GET /orders và /:id dùng cùng persistence với checkout mới; phân quyền Admin toàn sàn và Buyer theo chủ sở hữu.
5. Cancel/refund: trạng thái hợp lệ, reason, amount/currency, idempotency key; hoàn tiền thật, callback/đối soát, trạng thái pending/success/failed. Không đánh dấu thành công ngay lúc gửi yêu cầu.
6. Shipment status/override: cưỡng chế transition, chống ghi đè dữ liệu cũ, lưu note/reason/operator/time, kiểm tra liên kết order và audit. Hiện use case nhận lý do nhưng chưa lưu đầy đủ.

### Người dùng, hồ sơ và quyền

- POST /users: Admin tạo tài khoản, chọn vai trò hợp lệ; thông tin trùng trả 409; không trả mật khẩu/hash.
- PATCH /users/:id: sửa hồ sơ/status theo quyền.
- DELETE /users/:id: soft delete, chặn tự xóa và xóa Admin cuối cùng.
- Endpoint đổi mật khẩu bản thân bằng mật khẩu cũ; luồng Admin đặt lại mật khẩu người khác nên gửi reset link và audit, không hiển thị password.
- POST/PATCH/DELETE role; danh sách privilege; gán/bỏ privilege của role. Kiểm tra role đang được dùng, Admin cuối cùng, thu hồi/cập nhật phiên khi đổi quyền.
- PUT role hiện có: bổ sung bảo vệ self-demotion/last-admin phía BE; FE chặn riêng không thay thế bảo vệ BE.

### Danh mục

- POST/PATCH/DELETE categories: name, slug, parentId, sortOrder; kiểm tra vòng lặp cây, tối đa 3 cấp, trùng tên/slug.
- Không xóa danh mục còn sản phẩm/con nếu chưa có chính sách chuyển hoặc chặn rõ ràng.

### Đấu giá

- Danh sách Admin mọi trạng thái, q/product/seller/from/to, total và phân trang.
- POST tạo, PATCH cấu hình trước giờ bắt đầu; giá/bước giá/lịch/giới hạn số phiên/điểm Seller theo config.
- POST cancel thường và admin-cancel (hoặc cùng route kiểm tra quyền): reason bắt buộc, expectedVersion; xử lý bidder/đơn/tiền liên quan.
- GET /auctions/:id/bids phân trang, tổng lượt thật và che thông tin bidder phù hợp.
- Settlement khi kết thúc phải do BE: winner, số tiền, deadline, trạng thái không thanh toán, đơn và hình phạt.

### Đơn hàng và vận chuyển

- API cập nhật trạng thái Admin theo state machine, reason và version; không sửa tùy ý trạng thái đã thanh toán.
- Shipping quote, tạo vận đơn gắn order/warehouse/address/carrier; chống tạo trùng; quyền SHIPMENT.CREATE.
- Error contract rõ khi carrier lỗi/hết hàng/địa chỉ không hỗ trợ; không báo tạo thành công khi chỉ enqueue chưa có kết quả.

### Uy tín

- GET summary/history/penalties theo user; các trường score, trust level, nguồn sự kiện, thời điểm.
- POST điều chỉnh điểm: delta, reason, evidence/reference; giới hạn điểm, chống lặp, audit.
- POST áp dụng hình phạt: loại, mức, thời hạn, reason, tham chiếu vi phạm; không trừ nhiều lần cùng sự kiện.

### Giám sát và cấu hình

- GET notifications lịch sử có recipient/channel/status/from/to/page; detail và delivery attempts. Chưa dùng POST gửi tự do ngoài quyền SRS.
- Event log list/detail: service đã có route nội bộ nhưng cần Gateway expose đúng, bảo vệ quyền EVENT_LOG.*, lọc type/entity/correlationId/time.
- Audit log list/detail bất biến: actor/action/target/before/after/reason/time; che bí mật.
- Report aggregate: đơn/doanh thu/hoàn tiền/kết quả phiên theo kỳ và timezone; phân biệt tiền thu, hoàn, doanh thu ròng.
- GET/PATCH system configurations: đầy đủ các khóa SRS 2.6, type/unit/range/currentValue/version, reason và audit; không đưa secret ra client.
- GET health tổng hợp: từng service/database/broker, checkedAt, latency và trạng thái unknown/down/up, timeout; không chỉ trả danh sách URL.

## 5. Phạm vi chưa hoàn chỉnh

- Các dialog CRUD chưa có API là form chuẩn bị, nút xác nhận khóa. Chưa có kiểm chứng ghi dữ liệu thật cho toàn bộ SRS.
- Báo cáo/log/thông báo chưa có dữ liệu; không có biểu đồ mẫu để tránh gây hiểu nhầm.
- Cấu hình mới chuẩn bị các nhóm ngưỡng số. Các cờ bật/tắt, danh sách, policy và cấu hình đặc thù còn chờ schema GET cấu hình từ BE.
- Đổi mật khẩu Admin đang dùng liên kết khôi phục; chưa có API đổi trực tiếp.
- Kiểm thử live cần Gateway, dịch vụ liên quan, database đã migrate và phiên Admin ACTIVE.

## 6. Tổ chức code

- src/app/admin: route và layout; [section] dùng whitelist, URL lạ trả 404.
- src/modules/admin/config/navigation.ts: nhóm menu.
- src/modules/admin/config/resources.ts: định nghĩa danh sách và phạm vi API.
- src/modules/admin/components/admin-resource-screen.tsx: bảng/drawer/dialog chung, tìm kiếm/phân trang/đổi vai trò.
- admin-system-screens.tsx: chi tiết, hồ sơ, cấu hình, health.
- admin-shipment-actions.tsx: cập nhật và điều chỉnh vận đơn.
- admin-products.tsx, product-form.tsx: danh sách và form sản phẩm.
- admin-auctions.tsx, auction-form.tsx, auction-management-detail.tsx: phiên đấu.
- styles/admin.css: bố cục và responsive Admin.

Không thay trang Buyer/Seller/Support, không sửa code BE, không commit/push trong đợt chỉnh này.

## 7. Kiểm tra đã thực hiện

- Prettier các file Admin: qua.
- pnpm --filter @nexus/web build: qua, gồm TypeScript và sinh các route.
- Trình duyệt mở /admin khi chưa xác thực: chuyển về /login đúng.
- Thử tài khoản Admin mẫu có sẵn trên UI: hệ thống trả lỗi tạm thời, chưa vào được phiên Admin. Chưa xác nhận trực quan mọi màn hoặc kiểm thử ghi live; cần BE đăng nhập hoạt động để nghiệm thu.
- Không dùng tài khoản giả/bypass guard để trình bày rằng dữ liệu thật đã chạy.
- Có thay đổi khoảng trắng từ trước trong modules/commerce/api/orders.api.ts; đợt này không sửa file đó.
