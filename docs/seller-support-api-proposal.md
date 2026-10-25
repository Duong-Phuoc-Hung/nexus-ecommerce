# Đề xuất API cho Seller và Support Staff

Tài liệu này tổng hợp các API cần thiết để thay dữ liệu mock trong giao diện Seller và Support của Nexus. Nội dung dựa trên các trang FE hiện tại, route/backend code hiện có và các tài liệu SRS snapshot trong repo. Cần đối chiếu lại với bản SRS chính thức và thống nhất contract giữa BE/FE trước khi triển khai.

## 1. Mục tiêu và nguyên tắc

- Seller quản lý sản phẩm, đấu giá, đơn hàng và theo dõi tồn kho của chính cửa hàng mình.
- Support Staff tra cứu đơn hàng, người dùng và vận đơn để hỗ trợ khách hàng.
- FE gọi API qua API Gateway với base URL `http://localhost:4000/api/v1`.
- API cần xác thực Bearer JWT và phân quyền ở BE. Không tin `sellerId` do FE gửi; BE lấy danh tính Seller từ token.
- Support Staff chỉ được xem/thao tác dữ liệu theo quyền được thống nhất; thao tác ghi cần lưu người thực hiện và lý do.
- Response danh sách nên thống nhất dạng `{ "success": true, "data": [], "meta": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 } }`.

## 2. Đánh giá API/backend hiện tại

| Bounded Context | Route hiện có                                                                                                                 | Giới hạn so với giao diện Seller/Support                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| User            | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /users/profile`, `GET /users/:id`, `PUT /users/:id/role` | Chưa có API list/search người dùng phù hợp cho Support. RBAC hiện có `BUYER`, `SELLER`, `ADMIN`; chưa có role Support Staff. |
| Catalog         | `GET /products`, `GET /products/search`, `GET /products/:id`                                                                  | Chưa có lọc sản phẩm theo Seller đăng nhập, tạo/sửa sản phẩm hoặc API danh mục.                                              |
| Auction         | `GET /auctions`, `GET /auctions/:id`, `POST /auctions/:id/bids`                                                               | Danh sách hiện là phiên active; chưa có danh sách riêng của Seller hoặc tạo phiên.                                           |
| Commerce        | `GET /orders/:id`, `POST /orders/checkout`                                                                                    | Chưa có API danh sách/tìm kiếm đơn cho Seller và Support; chưa có lịch sử trạng thái hoặc thao tác hủy/hoàn tiền.            |
| Fulfillment     | `GET /fulfillments/shipments/:id`, `PATCH /fulfillments/shipments/:id/status`                                                 | Chưa có list/search vận đơn. `PATCH status` hiện là skeleton, chưa lưu trạng thái nghiệp vụ thật.                            |
| Support Case    | Chưa thấy route/entity riêng trong backend hiện tại                                                                           | Hàng đợi “yêu cầu hỗ trợ” trên dashboard đang dùng dữ liệu demo; cần chốt nghiệp vụ và nơi sở hữu dữ liệu trước khi làm API. |

## 3. Thứ tự đề xuất triển khai

Độ phức tạp là ước lượng tương đối theo phạm vi nghiệp vụ, dữ liệu và phân quyền; không phải cam kết thời gian.

### Nhóm 0 — Chốt quyền truy cập (điều kiện tiên quyết)

**Độ phức tạp: Trung bình**

1. Chốt tên role Support Staff, ví dụ `SUPPORT_STAFF`, và các permission tương ứng.
2. Cập nhật role/permission trong User Service và JWT/session contract.
3. Quy định phạm vi dữ liệu:
   - Seller chỉ xem/sửa sản phẩm, phiên đấu giá, đơn và tồn kho thuộc cửa hàng mình.
   - Support được tra cứu dữ liệu cần thiết để hỗ trợ, nhưng không mặc nhiên có quyền sửa hồ sơ hoặc dữ liệu tài chính.
4. Bảo vệ các API nghiệp vụ bằng auth/permission middleware. Không chỉ ẩn nút ở FE.

### Nhóm 1 — API tra cứu để thay mock

**Độ phức tạp: Trung bình** — CRUD còn ít, nhưng cần phân trang, filter/search và scope theo role.

| Màn hình                   | API đề xuất                                           | Contract/ghi chú                                                                                                                                         |
| -------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seller — Sản phẩm          | `GET /products?q=&status=&page=&limit=`               | Nếu JWT là Seller, BE tự giới hạn dữ liệu theo Seller trong token. Không nhận `sellerId` tùy ý từ FE.                                                    |
| Seller — Đơn hàng          | `GET /orders?status=&q=&page=&limit=&from=&to=`       | Seller chỉ nhận đơn có sản phẩm/cửa hàng thuộc mình. Query tìm kiếm có thể gồm mã đơn và thông tin phù hợp được phép xem.                                |
| Support — Tra cứu đơn      | Dùng `GET /orders?q=&status=&page=&limit=&from=&to=`  | Cùng route nhưng quyền Support được phép tìm trong phạm vi toàn hệ thống theo policy đã chốt.                                                            |
| Support — Chi tiết đơn     | `GET /orders/{id}`                                    | Route đã tồn tại; cần auth, phân quyền theo role và DTO phù hợp Support. Có thể đưa lịch sử trạng thái vào response hoặc bổ sung endpoint lịch sử riêng. |
| Support — Người dùng       | `GET /users?q=&role=&status=&page=&limit=`            | Tìm theo tên/email/mã người dùng; chỉ trả trường cần cho hỗ trợ. Route `GET /users` hiện tại chưa phải API list/search thực sự.                          |
| Support — Vận đơn          | `GET /fulfillments/shipments?q=&status=&page=&limit=` | Tìm theo tracking code, order ID, người nhận hoặc carrier.                                                                                               |
| Support — Chi tiết vận đơn | `GET /fulfillments/shipments/{id}`                    | Route đã tồn tại; nên trả tracking code, carrier, trạng thái và dữ liệu cần cho trang chi tiết.                                                          |

Gợi ý filter tối thiểu cho danh sách: `q`, `status`, `page`, `limit`; chỉ thêm filter ngày/carrier khi giao diện và nghiệp vụ cần.

### Nhóm 2 — Seller tạo và quản lý sản phẩm/đấu giá

**Độ phức tạp: Trung bình đến cao** — cần validation, kiểm tra quyền sở hữu và quy tắc trạng thái.

| Màn hình                          | API đề xuất                                     | Contract/ghi chú                                                                                                                                                                            |
| --------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seller — Tạo sản phẩm             | `POST /products`                                | Nhận các trường form như `title`, `sku`, `categoryId`, `description`, `price`, `stockQuantity`, `status`; BE tự gán seller từ JWT. Cần chốt trạng thái khởi tạo mặc định (ví dụ `DRAFT`).   |
| Seller — Sửa sản phẩm             | `PATCH /products/{id}`                          | Chỉ cập nhật sản phẩm thuộc Seller hiện tại; từ chối trạng thái không cho sửa.                                                                                                              |
| Seller — Danh mục                 | `GET /categories`                               | Thay danh mục hardcode trong form. Chưa thấy category endpoint trong Catalog routes hiện tại.                                                                                               |
| Seller — Danh sách phiên của mình | `GET /auctions?scope=mine&status=&page=&limit=` | `scope=mine` chỉ là bộ lọc; BE phải xác định seller từ JWT, không tin ID người dùng do client truyền.                                                                                       |
| Seller — Tạo phiên                | `POST /auctions`                                | Nhận `productId`, `startingPrice`, `bidIncrement`, `startTime`, `endTime` (hoặc duration theo contract). BE kiểm tra quyền sở hữu sản phẩm, trạng thái/điều kiện sản phẩm và quy tắc phiên. |

Các quy tắc trên form đấu giá cần được xác nhận với bản SRS chính thức trước khi hardcode: số phiên hoạt động tối đa, thời lượng min/max, điểm uy tín tối thiểu, bước giá mặc định và anti-sniping. Validation FE chỉ hỗ trợ UX; BE phải áp dụng cùng quy tắc.

### Nhóm 3 — Tồn kho và số liệu tổng quan

**Độ phức tạp: Cao hơn** — tồn kho/dashboards có thể cần dữ liệu từ nhiều bounded context.

| Màn hình            | API đề xuất                                     | Contract/ghi chú                                                                                                                                                                                                   |
| ------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Seller — Tồn kho    | `GET /fulfillments/inventory?sku=&page=&limit=` | Trả `onHand`, `reserved`, `available`, sản phẩm/SKU và warehouse. Cần BE thống nhất nguồn dữ liệu chuẩn: Catalog hiện lưu `stockQuantity`, còn event catalog mô tả `InventoryReserved/Released` trong Fulfillment. |
| Seller — Dashboard  | `GET /seller/dashboard/summary?from=&to=`       | Có thể trả tổng sản phẩm theo trạng thái, đơn mới, phiên đang hoạt động và điểm uy tín. Có thể hoãn endpoint riêng nếu FE có thể tính từ API list và `meta.total`.                                                 |
| Support — Dashboard | `GET /support/dashboard/summary?from=&to=`      | Có thể trả số đơn/vận đơn cần theo dõi. Chỉ trả số ticket/case sau khi có nghiệp vụ và dữ liệu Support Case thật.                                                                                                  |

Tránh để API Gateway truy vấn trực tiếp database của nhiều service để tổng hợp. Nếu cần dashboard liên service, BE nên chọn cơ chế tổng hợp phù hợp kiến trúc (application/query service hoặc read model được thống nhất).

### Nhóm 4 — Thao tác ghi của Support (làm sau khi chốt quy trình)

**Độ phức tạp: Cao đến rất cao** — ảnh hưởng đơn hàng, tiền hoặc trạng thái giao nhận; cần quyền hẹp, audit và xử lý lặp an toàn.

| Thao tác          | API đề xuất                                                                            | Điều kiện cần chốt                                                                                                                                            |
| ----------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hủy đơn           | `POST /orders/{id}/cancel` với `{ "reason": "..." }`                                   | Chỉ cho trạng thái được phép; quy định ai được hủy, có cần xác nhận Seller/Buyer không; phát event hủy đơn và xử lý tồn kho.                                  |
| Yêu cầu hoàn tiền | `POST /orders/{id}/refund-requests` với `{ "reason": "...", "amount": ... }`           | Nên tạo yêu cầu/luồng xét duyệt thay vì Support trực tiếp gọi hoàn tiền. Cần xác định service sở hữu payment/refund vì hiện route backend chưa có refund API. |
| Cập nhật vận đơn  | `PATCH /fulfillments/shipments/{id}/status` với `{ "status": "...", "reason": "..." }` | Route hiện có nhưng là skeleton. Cần lưu thay đổi, kiểm tra chuyển trạng thái hợp lệ, ghi người thao tác/audit và phát `shipment.status_updated`.             |

Không nên nối nút ghi ở Support vào API cho tới khi BE xác nhận policy/permission và luồng xử lý. `Idempotency-Key` nên được cân nhắc cho hành động có thể bị gửi lại như hủy/hoàn tiền.

### Nhóm 5 — Hàng đợi/ticket Support (chưa có domain tương ứng)

**Độ phức tạp: Rất cao / cần quyết định phạm vi**

Dashboard Support hiện có danh sách case minh họa gồm loại yêu cầu, đơn liên quan, người gửi, lý do, độ ưu tiên và thời gian chờ. Backend hiện chưa thấy Support Case entity/service hoặc route tương ứng. Nếu muốn hàng đợi thật, team cần thống nhất:

- Ai được tạo case: Buyer, Seller, Support hay tự sinh từ sự kiện?
- Trạng thái vòng đời: `OPEN`, `IN_PROGRESS`, `WAITING_FOR_CUSTOMER`, `RESOLVED`, `CLOSED` (chỉ là gợi ý; cần nhóm chốt).
- Phân công nhân viên, mức ưu tiên, SLA và lịch sử trao đổi.
- Service/bounded context nào sở hữu case. Không nên nhét ticket vào User/Catalog chỉ để làm dashboard.

Sau khi chốt nghiệp vụ, có thể xem xét các API:

- `GET /support/cases?status=&priority=&assignee=me&page=&limit=`
- `POST /support/cases`
- `GET /support/cases/{id}`
- `PATCH /support/cases/{id}/assignment`
- `PATCH /support/cases/{id}/status`
- `POST /support/cases/{id}/messages`

## 4. Các route hiện có cần lưu ý khi tích hợp

- `GET /products`, `GET /products/search`, `GET /products/{id}`: đọc catalog; chưa có scope Seller và write routes.
- `GET /auctions`, `GET /auctions/{id}`, `POST /auctions/{id}/bids`: chưa có seller list/create.
- `GET /orders/{id}`, `POST /orders/checkout`: chưa có list/search hoặc thao tác Support/Seller.
- `GET /fulfillments/shipments/{id}`: đọc chi tiết; `PATCH /fulfillments/shipments/{id}/status` hiện chỉ trả response skeleton.
- `GET /users/{id}`: có tra cứu theo ID nhưng cần bảo đảm permission/field phù hợp; chưa có list/search.
- Gateway hiện proxy các prefix `/api/v1/products`, `/auctions`, `/orders`, `/fulfillments`, `/users`. Nếu dùng prefix mới ngoài các nhóm này thì cần bổ sung route Gateway tương ứng.

## 5. Thứ tự triển khai khuyến nghị cho BE

1. Chốt Support role/permissions và auth enforcement cho các service nghiệp vụ.
2. Hoàn thành API list/search/detail cho sản phẩm, đơn hàng, người dùng và vận đơn để thay mock, giữ thao tác chỉ đọc.
3. Thêm tạo/sửa sản phẩm và tạo/list phiên đấu giá Seller.
4. Chốt nguồn dữ liệu tồn kho; bổ sung inventory và summary khi mô hình dữ liệu rõ ràng.
5. Sau cùng mới triển khai hủy đơn, refund request, cập nhật vận chuyển và Support Case/ticket.

## 6. Tài liệu/code tham chiếu trong repo

- Backend API/contract snapshot: `backend/README.md`.
- Product routes: `backend/catalog-service/src/interfaces/http/routes/ProductRoutes.ts`.
- Auction routes: `backend/auction-service/src/interfaces/http/routes/AuctionRoutes.ts`.
- Order routes: `backend/commerce-service/src/interfaces/http/routes/OrderRoutes.ts`.
- Shipment routes: `backend/fulfillment-service/src/interfaces/http/routes/ShipmentRoutes.ts`.
- User/Auth routes and permissions: `backend/user-service/src/interfaces/http/routes/UserRoutes.ts`, `backend/user-service/src/infrastructure/security/authorization.ts`.
- Gateway proxy routes: `backend/api-gateway/src/app.ts`.
- Current Seller screens/fixtures: `frontend/web/src/modules/seller/`.
- Current Support screens/fixtures: `frontend/web/src/modules/support/`.
- SRS event snapshot: `docs/standards/event-catalog-srs-2.8.md`.
