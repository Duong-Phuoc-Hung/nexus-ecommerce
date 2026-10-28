# FE tuần 3–4 và danh sách API bàn giao BE

Ngày đối chiếu: 26/10/2026. Scope được suy ra từ kế hoạch tuần 2 (cart/checkout/payment thuộc tuần 3; fulfillment và Support thuộc tuần 4), source code hiện tại và API Gateway. Trong repository không có file SRS nghiệp vụ Nexus đầy đủ; vì vậy các API ghi “đề xuất/chốt với nhóm” cần được đối chiếu SRS gốc trước khi BE cam kết.

## FE đã làm

### Tuần 3 — Buyer / Commerce

- Thêm module `commerce` có kiểu dữ liệu đơn hàng, adapter dùng Axios instance chung, và component riêng cho giỏ hàng, checkout, danh sách đơn và chi tiết đơn.
- Thêm trang `/cart`, `/checkout`, `/account/orders`, `/account/orders/[id]`; điều hướng đến các trang này từ header chung.
- Chi tiết sản phẩm fixed-price có nút thêm vào giỏ cho tài khoản Buyer; khách chưa đăng nhập được chuyển qua đăng nhập và quay lại sản phẩm.
- Giỏ hàng hỗ trợ sửa số lượng, xóa dòng, giới hạn theo tồn kho mà Catalog trả về và giữ dữ liệu ở `localStorage` trên cùng trình duyệt.
- Buyer xem danh sách/chi tiết đơn qua `/orders`; UI có loading, lỗi, trạng thái rỗng và thử lại.
- Checkout có form địa chỉ và gửi `POST /orders/checkout`; adapter chủ động nhận diện phản hồi `Skeleton mode`/`clientSecret` giả và không báo thành công.
- Không tạo thanh toán, đơn hàng hoặc phí vận chuyển giả ở FE.

### Tuần 4 — Seller / Support / Fulfillment

- Seller Orders chuyển từ bảng minh họa sang đọc `GET /orders` qua Commerce API.
- Admin có mục Giám sát đơn hàng trong sidebar và tổng quan; chỉ đọc danh sách qua Commerce API.
- Support Orders chuyển sang đọc danh sách và chi tiết đơn qua `GET /orders`, có tìm kiếm, loading/lỗi/rỗng.
- Support có thể gửi lý do hủy/hoàn và gọi các endpoint `POST /orders/:id/cancel`, `POST /orders/:id/refund`; có xác nhận trước khi gửi và hiển thị phản hồi/lỗi của BE.
- Support Shipments đọc danh sách, chi tiết, timeline qua Fulfillment API; cập nhật trạng thái kế tiếp hợp lệ hoặc gửi yêu cầu điều chỉnh có lý do.
- Support Users đọc `/users` thay vì fixture; hồ sơ vẫn chỉ đọc, không mở chức năng thay đổi role/điểm uy tín.
- Dải thông tin Support được sửa để nói đúng: API đang được gọi, nhưng dữ liệu fulfillment/order BE hiện vẫn ở repository in-memory.

### Giới hạn cần nắm

- Giỏ hàng hiện lưu cục bộ trong trình duyệt, chưa đồng bộ nhiều thiết bị.
- Checkout chưa hoàn tất: BE hiện trả `orderId` và `clientSecret` cố định ở skeleton, nên FE chặn trạng thái hoàn tất. Không dùng kết quả này để demo giao dịch thật.
- Commerce và Fulfillment đang dựng repository `InMemory`; dữ liệu có thể mất khi service khởi động lại và chưa chứng minh ghi xuống Postgres.
- Buyer `GET /orders` hiện bị BE từ chối vì middleware chưa cho Buyer quyền `LIST`; detail có VIEW nhưng cần kiểm tra ownership theo Buyer.
- Seller `GET /orders?sellerId=...` chưa được BE ràng buộc sellerId từ JWT. Không đưa dữ liệu đơn thật vào môi trường dùng chung trước khi BE khóa phạm vi truy cập.
- Support thao tác hủy/hoàn/trạng thái đang gọi API hiện có, nhưng chưa có bảo đảm DB/audit/idempotency/carrier thực; cần BE xác nhận trước khi dùng nghiệp vụ thật.
- Không thấy file SRS Nexus gốc đầy đủ trong repo. Danh sách dưới đây phản ánh source/plan và chỗ cần chốt SRS, không tự khẳng định đó là toàn bộ yêu cầu nghiệp vụ cuối cùng.

## Danh sách API cần BE hoàn thành

Tiền tố Gateway: `/api/v1`. “Đang có” nghĩa là route có trong source, không đồng nghĩa đã bền vững hoặc sẵn sàng production.

### Tuần 3 — Cart, checkout, payment, order

| Ưu tiên | API                                             | Hiện trạng                                                                             | Việc BE cần hoàn thành                                                                                                                                                                                                                                                                                                                                                          |
| ------- | ----------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0      | `POST /orders/checkout`                         | Route có nhưng trả response skeleton cố định; chưa auth, kiểm tra giỏ, giá hay tồn kho | Yêu cầu Buyer đăng nhập; lấy Buyer từ JWT; kiểm tra sản phẩm active/giá/tồn kho; snapshot giá và địa chỉ; idempotency key; tạo order/payment intent bền vững; response có orderId, trạng thái và phương thức thanh toán thật/test đã thống nhất. Không trả clientSecret hard-code.                                                                                              |
| P0      | `GET /orders?buyerId=...` hoặc `GET /orders/me` | `GET /orders` có filter buyerId, nhưng middleware hiện cấm Buyer LIST                  | Thêm quyền Buyer xem đơn của chính mình; ưu tiên `/orders/me` hoặc bỏ qua buyerId do client gửi và lấy sub từ JWT; kiểm tra phân trang, lọc trạng thái, sắp xếp và response thống nhất.                                                                                                                                                                                         |
| P0      | `GET /orders/:id`                               | Có route/use case                                                                      | So khớp Buyer/Seller với order trước khi trả; Admin/Support theo permission; trả items, tổng tiền, địa chỉ đã che phù hợp, payment state, shipment và timeline nhất quán.                                                                                                                                                                                                       |
| P0      | Payment intent/confirmation                     | Chưa có API nghiệp vụ thực; checkout trả clientSecret giả                              | Chốt nhà cung cấp/phương thức thanh toán; đề xuất `POST /orders/:id/payments` tạo intent, `GET /orders/:id/payments/:paymentId`, webhook server-to-server để xác nhận; chữ ký webhook, idempotency, trạng thái pending/paid/failed/refunded và không tin kết quả từ browser. Nếu đồ án chỉ mô phỏng, BE phải định nghĩa rõ simulator contract và không dùng secret giả cố định. |
| P0      | Order persistence                               | Commerce dùng `InMemoryOrderRepository`                                                | Repository Postgres + migration, transaction giữa order/items/stock/payment; khởi động lại không mất order; xử lý hai checkout tranh tồn kho.                                                                                                                                                                                                                                   |
| P1      | `POST /orders/:id/cancel`                       | Route có; quyền hiện chỉ Admin/Support                                                 | Thêm chính sách Buyer hủy đơn theo trạng thái/thời hạn SRS; lấy actor từ JWT; lý do; hoàn tồn/kết quả payment; idempotency; audit và lỗi conflict.                                                                                                                                                                                                                              |
| P1      | `POST /orders/:id/refund`                       | Route có, Support/Admin                                                                | Định nghĩa quy trình/permission, trạng thái hợp lệ, refund provider hoặc simulator, idempotency, mã giao dịch và audit; không trả “đã hoàn tiền” khi mới tạo yêu cầu.                                                                                                                                                                                                           |
| P1      | Seller order list                               | Có query `sellerId` nhưng phạm vi chưa khóa theo JWT                                   | Endpoint `/orders/seller/me` hoặc controller tự dùng seller sub; chỉ trả dòng hàng thuộc Seller, xử lý đơn nhiều Seller nếu có.                                                                                                                                                                                                                                                 |
| P1      | Seller order transition                         | Chưa thấy API Seller xác nhận/chuẩn bị đơn                                             | Chốt state machine SRS; đề xuất `PATCH /orders/:id/status` hoặc action riêng `POST /orders/:id/confirm`, xác minh seller ownership, chống transition sai và phát event tạo shipment.                                                                                                                                                                                            |
| P1      | Winner → order settlement                       | Chưa có tích hợp kết quả Auction vào Commerce                                          | Tạo order/settlement an toàn khi phiên kết thúc; Buyer thắng, giá cuối, hạn thanh toán; tránh tạo trùng khi scheduler/event retry.                                                                                                                                                                                                                                              |
| P2      | Cart server-side (nếu SRS yêu cầu)              | FE hiện lưu `localStorage`, không có endpoint                                          | Có thể thêm `GET /cart`, `PUT /cart/items`, `DELETE /cart/items/:productId`, merge giỏ guest khi đăng nhập; không cần nếu nhóm chấp nhận giỏ cục bộ cho scope demo.                                                                                                                                                                                                             |

### Tuần 4 — Fulfillment, Support, Admin

| Ưu tiên | API                                             | Hiện trạng                                                                      | Việc BE cần hoàn thành                                                                                                                                                                              |
| ------- | ----------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0      | `GET /fulfillments/shipments`                   | Có filter/pagination và RBAC; repository in-memory                              | Lưu Postgres; xác thực scope theo vai trò; hỗ trợ filter/status/paging ổn định; chỉ trả trường cá nhân cần thiết.                                                                                   |
| P0      | `GET /fulfillments/shipments/:id`               | Có detail và timeline                                                           | Scope quyền theo Support/Admin/Seller/Buyer; Buyer/Seller chỉ xem shipment gắn order của họ; trả lịch sử trạng thái bền vững.                                                                       |
| P0      | Tạo shipment từ order                           | Chưa thấy endpoint/use case tạo vận đơn được nối sau paid/confirmed             | Tạo shipment đúng lúc theo state machine; gắn order/items/địa chỉ; idempotency; mã vận đơn từ provider/simulator.                                                                                   |
| P0      | `PATCH /fulfillments/shipments/:id/status`      | Có route và RBAC `UPDATE_STATUS`                                                | Lưu timeline/audit; kiểm tra transition phía server (hiện domain cho phép set status trực tiếp); actor từ JWT; cập nhật order/event; idempotency và conflict version.                               |
| P1      | `PATCH /fulfillments/shipments/:id/override`    | Có route và RBAC `MANUAL_OVERRIDE`                                              | Bắt buộc reason; audit before/after/operator; validate carrier/status/address; che dữ liệu; kiểm tra quyền. FE đang gửi reason và giới hạn transition cho action thường.                            |
| P1      | Carrier tracking integration                    | Chưa có adapter hãng vận chuyển thật được xác nhận                              | Chốt GHN/GHTK/Viettel Post hay simulator; callback/webhook ký số, polling, retry có giới hạn, chuẩn hóa trạng thái và log lỗi.                                                                      |
| P1      | `GET /fulfillments/dashboard/summary`           | Có route                                                                        | Dùng dữ liệu bền vững, filter theo phạm vi ca/permission, định nghĩa chỉ số và timezone.                                                                                                            |
| P1      | `GET /orders`, `GET /orders/:id`, cancel/refund | Có route và role checks                                                         | Thay in-memory; Buyer/Seller ownership; hỗ trợ trạng thái; xử lý refund thật/simulator; audit đầy đủ.                                                                                               |
| P1      | Support case/ticket API                         | Chưa thấy route nghiệp vụ case trong Gateway/service                            | Đối chiếu SRS; nếu Support có queue khiếu nại thì cần tạo/tìm/chi tiết/cập nhật/assign/resolve case, reason, order/user relation, SLA, comment/event và audit. Đây là API đề xuất cần xác nhận SRS. |
| P1      | `GET /users?q=&role=&status=&page=&limit=`      | User Service đã có route, permission `USER.VIEW`; Gateway proxy `/users`        | Xác nhận Support/Admin được quyền đúng theo ma trận; response tối thiểu, che dữ liệu; filter/paging; audit truy cập nếu SRS yêu cầu. FE Support Users đã gọi endpoint.                              |
| P1      | `PUT /users/:id/role`                           | Route có, permission `ROLE.UPDATE`                                              | Chỉ Admin; validate transition/role; chống tự nâng quyền; audit actor/lý do; response rõ. FE giữ chức năng này trong khu vực Admin roles hiện tại.                                                  |
| P2      | Notification inbox                              | Gateway có proxy Notification service; chưa thấy route list/read cho người dùng | Nếu SRS yêu cầu thông báo cá nhân: `GET /notifications/me`, `PATCH /notifications/:id/read`, `POST /notifications/read-all`; derive user từ JWT, paging, event-driven delivery.                     |

## Thứ tự BE nên làm

1. P0 tuần 3: checkout thật + payment state rõ, Buyer list/detail ownership, Postgres và idempotency.
2. P0 tuần 4: shipment tạo từ order, persistence, quyền truy cập và transition/audit phía server.
3. P1: Seller order scope/state machine, refund/cancel chuẩn, Support case nếu SRS bắt buộc, User list privacy/permission.
4. P2: cart server-side và notification inbox nếu SRS yêu cầu hoặc còn thời gian.

## Cách nghiệm thu FE/API

- Buyer chỉ xem đơn của chính mình; thử đổi buyerId/orderId phải bị BE từ chối.
- Gửi checkout lặp với cùng idempotency key không tạo hai order hoặc hai payment.
- Hai Buyer checkout sản phẩm cuối cùng không làm tồn kho âm.
- Hỏng thanh toán không tạo order paid; webhook retry không hoàn tất lặp.
- Shipment và trạng thái vẫn còn sau khi service restart; transition sai trả 409/422.
- Seller không đọc đơn Seller khác; Support/Admin chỉ thao tác trong permission và mọi hủy/hoàn/override có audit.
- Gateway chạy trên máy dev và contract errors hiển thị rõ ở FE; smoke test cả 401/403/404/409/500.
