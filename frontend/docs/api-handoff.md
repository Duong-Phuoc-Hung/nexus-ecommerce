# API tuần 1 — bàn giao Backend

Ngày đối chiếu: 19/10/2026. Đã fetch GitLab `origin/main` tới `c3ad296` (Catalog Search & Discovery). Chỉ cập nhật tham chiếu Git; chưa merge backend vào nhánh FE. Checkout local vẫn ở `420059b` và các thay đổi FE đang làm. Vì vậy chạy backend local cũ sẽ không có đầy đủ endpoint nêu dưới đây.

Nguồn: mã backend trên `origin/main`, adapter FE hiện tại và SRS v1.0 mục 3.1, 3.3, 2.6, 2.7. Đây là kiểm tra mã nguồn, chưa nghiệm thu toàn bộ qua PostgreSQL/Gateway. “Có route” không đồng nghĩa “hoàn tất production”. HTTP contract đề xuất cần FE/BE chốt, không phải tên URL được SRS ấn định.

## 1. API đã có và việc còn phải hoàn thiện

Tất cả đường dẫn có tiền tố `/api/v1`.

| API                          | Đã có trên main                                                                | BE còn cần làm                                                                                  | FE hiện tại                                                      |
| ---------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| POST `/auth/register`        | Use case đăng ký, hash password, mặc định Buyer                                | Sửa ID trả về khác ID DB; bỏ phone/identify ngẫu nhiên; chốt trường bắt buộc và password policy | Form đã gọi API; cần nghiệm thu bằng DB thật                     |
| POST `/auth/login`           | Login, JWT, kiểm tra tài khoản                                                 | Chốt TTL: code 8 giờ khác mặc định SRS 60 phút; rà quyền/trạng thái và rate limit               | Đã gọi API, lưu phiên, xác minh profile                          |
| POST `/auth/logout`          | Thu hồi token bằng store RAM                                                   | Lưu thu hồi dùng chung giữa instance/restart                                                    | Đã gọi API; xóa phiên local kể cả khi mất mạng                   |
| POST `/auth/forgot-password` | Tạo reset token, tìm user                                                      | Gửi email link FE; rate limit; không tiết lộ tài khoản tồn tại; lưu token bền vững              | Có form; chưa có vòng gửi email thật                             |
| POST `/auth/reset-password`  | Hash token, TTL 15 phút, consume một lần trong RAM                             | Store bền vững, kiểm tra cạnh tranh, thu hồi phiên cũ, thống nhất policy                        | Có form và xử lý token lỗi; chờ nghiệm thu email → reset         |
| GET `/users/profile`         | Bearer + `PROFILE.VIEW`                                                        | Đối chiếu ID/role/permissions/trạng thái với DB/SRS                                             | Dùng cho `/account` và xác minh phiên                            |
| GET `/products`              | Danh sách cơ bản InMemory                                                      | DB, lọc/sort/phân trang khi không có từ khóa, DTO đầy đủ, phân biệt dữ liệu public/Admin        | Adapter đã có, mặc định đang dữ liệu cục bộ                      |
| GET `/products/:id`          | Chi tiết và 404 cơ bản InMemory                                                | DB; ảnh/currency/condition/saleType/seller; kiểm tra khả năng hiển thị và quyền                 | Trang chi tiết đã có, khách xem trực tiếp                        |
| GET `/products/search`       | **Mới có**: q, categoryId, minPrice, maxPrice, page, limit; validation và meta | DB, sort/condition/saleType; contract thống nhất với list; nối Gateway                          | **Chưa nối endpoint mới**; cần sửa adapter sau khi chốt contract |

**Tổng: 9 endpoint đã có mã xử lý, 3 endpoint cốt lõi còn thiếu ở mục 2. Chưa có cơ sở đánh dấu toàn bộ 9 endpoint là hoàn thành tích hợp.**

Gateway hiện chỉ proxy `/auth` và `/users`. Các mục Catalog/Auction trong thông tin `/api/v1` chỉ là danh sách giới thiệu, chưa phải proxy hoạt động.

## 2. API còn thiếu cần BE làm trong tuần 1

| Ưu tiên | API                         | Chi tiết cần làm                                                                                                                                               | Nghiệm thu                                                                                                   |
| ------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| P0      | GET `/categories?tree=true` | DB; ID ổn định, name, parentId, level/children, trạng thái, thứ tự; cây tối đa 3 tầng theo cấu hình mặc định SRS                                               | Menu và form dùng cùng ID; không có vòng lặp; xử lý cây rỗng; category không khả dụng không được dùng để ghi |
| P0      | POST `/products`            | Auth + `PRODUCT.CREATE`; validate seller/category, title, description, giá/currency, condition, saleType, status, tối đa 5 ảnh; lưu DB và event/audit theo SRS | 201 + product/ID thật; reload còn dữ liệu; Buyer bị 403; sai dữ liệu không ghi một phần                      |
| P0      | PATCH `/products/:id`       | Auth + `PRODUCT.UPDATE`; kiểm tra ownership/phạm vi Admin, version/xung đột, liên kết phiên đấu; persist và trả bản đã lưu                                     | 200; 404/403/409 đúng; không sửa trái phép giá/cấu hình phiên đã chạy; giữ form khi lỗi                      |

Việc nền P0: mount Catalog qua Gateway, CORS theo môi trường, seed DB đủ dữ liệu nhiều trang, chuẩn hóa lỗi. Không yêu cầu FE gọi trực tiếp cổng Catalog để né Gateway.

Hỗ trợ cần chốt: API tra cứu Seller cho form Admin (hiện nhập sellerId); API upload ảnh nếu muốn chọn file (hiện dùng URL). Hai phần này có thể làm sau P0 nếu nhóm thống nhất dùng seller seed và URL ảnh. Không tính chúng là 3 endpoint cốt lõi phía trên.

## 3. Khác biệt contract cần chốt ngay

| Nội dung         | BE `/products/search` mới                                      | FE hiện tại                                                                                    |
| ---------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| URL              | `/products/search`                                             | `/products` kèm query                                                                          |
| Từ khóa          | `q` bắt buộc, rỗng trả 400                                     | Cho phép duyệt không có từ khóa                                                                |
| Kích thước trang | `limit` (mặc định 20, tối đa 100)                              | `pageSize`                                                                                     |
| Kết quả          | `{success,data: Product[],meta:{page,limit,total,totalPages}}` | Mong `data:{items,page,pageSize,total}`; có hỗ trợ mảng legacy nhưng không giữ meta ngoài data |
| Bộ lọc           | q, categoryId, minPrice, maxPrice                              | Thêm condition, saleType, sort, status/scope Admin                                             |

Đề xuất: giữ endpoint search vừa làm, BE bổ sung list không từ khóa và DTO thống nhất; FE map `pageSize → limit`, đọc `meta`, gọi search khi có q. Nhóm chốt một contract trước khi sửa adapter. Không đổi env sang `api` rồi coi như đã tích hợp xong.

## 4. Trình tự bàn giao và điều kiện hoàn thành

1. Chốt URL, query, DTO, enum, quyền và mã lỗi; cung cấp ví dụ request/response hoặc OpenAPI.
2. BE nối Gateway + DB, hoàn thiện list/search/detail/categories. Mốc kế hoạch: 23/10.
3. BE bổ sung create/update; FE thay adapter theo contract đã chốt và nối form lưu thật.
4. Sửa Auth/Postgres; bàn giao tài khoản Buyer/Admin/Seller qua kênh riêng, URL Gateway và seed IDs.
5. Nghiệm thu tới 25/10: Customer tìm/lọc/mở chi tiết; Admin tạo/sửa đọc lại đúng; Buyer gọi API quản trị bị từ chối; lỗi/rỗng/401/403/404/409; restart dịch vụ không mất dữ liệu nghiệp vụ.

**Việc FE còn thiếu:** map search mới; tích hợp Catalog qua Gateway; chuyển `/admin` từ UI development sang phiên Admin thật + permissions + API adapter. `/admin` hiện luôn dùng bộ dữ liệu cục bộ, chỉ validation, chưa ghi BE, và không được bật ở production. Không dùng sự tồn tại của form để đánh dấu API đã xong.

## 5. Vị trí giao diện và bằng chứng mã nguồn

- Chạy `npm run dev` ở gốc repo; Customer `/products`, `/products/:id`; Admin UI `/admin`, `/admin/products`, `/admin/products/new`, `/admin/products/:id/edit` trên cổng 3000.
- FE nghiệp vụ: `frontend/web/src/modules/catalog`, `modules/admin`, `modules/user`; adapter: `frontend/web/src/modules/catalog/api/catalog.factory.ts`. Không tạo thư mục mã nguồn theo tuần.
- Backend main: `backend/api-gateway/src/app.ts`; `backend/catalog-service/src/interfaces/http/routes/ProductRoutes.ts`; `.../controllers/ProductController.ts`; `.../dtos/SearchProductsQueryDto.ts`; `.../application/use-cases/SearchProductsUseCase.ts`; `.../infrastructure/repositories/InMemoryProductRepository.ts`.
- Auth main: `backend/user-service/src/interfaces/http/routes/UserRoutes.ts`, `application/use-cases`, `infrastructure/security`, `infrastructure/repositories/PostgresUserRepository.ts`.
- App `web-admin` độc lập vẫn có route và guard riêng; không xóa chỉ vì giống UI `/admin`.

Xem [kế hoạch tuần 2](week-2-plan.md). Các contract đề xuất chi tiết bên dưới được giữ để FE/BE đối chiếu, không thay thế contract mới đã thống nhất.

## 6. Contract Catalog mà FE đang chờ

### GET danh sách

```http
GET /api/v1/products?q=sony&categoryId=cat-audio&minPrice=100000&maxPrice=9000000&condition=NEW&sort=price-asc&page=1&pageSize=12
Authorization: Bearer <token khi cần>
```

Admin thêm `scope=admin` và `status=DRAFT|ACTIVE|INACTIVE`; **BE phải xác minh token/quyền**, không tin query để mở dữ liệu quản trị. Customer mặc định chỉ nhận hàng ACTIVE dành cho mua sắm; sản phẩm AUCTION ở luồng riêng. Query `q` tìm tên/người bán nếu backend hỗ trợ; cần chốt việc tìm tiếng Việt không dấu. Sort hiện FE gửi `featured`, `newest`, `price-asc`, `price-desc`. Nhóm BE phải xác định quy tắc `featured`, sắp xếp ổn định khi đồng giá và đơn vị tiền áp dụng bộ lọc, không so sánh giá khác tiền tệ trực tiếp.

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "product-101",
        "title": "Tai nghe Sony WH-1000XM5",
        "description": "Mô tả tình trạng sản phẩm",
        "categoryId": "cat-audio",
        "categoryName": "Âm thanh",
        "sellerId": "seller-01",
        "sellerName": "Sound Space",
        "images": ["https://assets.example.invalid/product-101.jpg"],
        "price": "7290000",
        "currency": "VND",
        "condition": "NEW",
        "saleType": "FIXED_PRICE",
        "status": "ACTIVE",
        "stockQuantity": 3
      }
    ],
    "page": 1,
    "pageSize": 12,
    "total": 1
  }
}
```

Chi tiết trả cùng product object tại `data`. ID là chuỗi ổn định; FE cũng đọc numeric ID thành chuỗi. Giá decimal có thể trả dạng chuỗi; không tự quy đổi USD/VND. `rating`, `soldCount` là tùy chọn: không có thì FE không tạo số giả. Nếu BE cũ trả mảng, FE chỉ hiển thị danh sách cơ bản, không bịa tổng số, currency hoặc phân trang. Nếu currency thiếu, FE hiển thị “Chưa có đơn vị tiền”. Lỗi API mode không tự đổi sang mock.

### GET danh mục

```json
{
  "success": true,
  "data": [{ "id": "cat-audio", "name": "Âm thanh", "parentId": null, "level": 1, "children": [] }]
}
```

Chấp nhận cây `children` hoặc mảng có `parentId/level`. Tối đa 3 tầng theo mặc định SRS. Backend phải xác minh category tồn tại/đang sử dụng được khi ghi product.

### POST/PATCH sản phẩm

Body đang được form gửi: `title`, `description`, `categoryId`, `sellerId`, `price` (decimal string), `currency`, `condition`, `images[]` (URL), `status`, `saleType`. Enum đề xuất: condition `NEW|LIKE_NEW|USED|REFURBISHED`, saleType `FIXED_PRICE|AUCTION`, status `DRAFT|ACTIVE|INACTIVE`. BE cần xác nhận trước nghiệm thu. Tạo trả 201; sửa trả 200; đều `{success:true,data:product}`.

- Giá >0, finite, tối đa 2 chữ số thập phân; tên 1–255 ký tự, mô tả và danh mục bắt buộc; max 5 URL HTTP(S) ở form. Đây là ràng buộc UI/contract đề xuất, không khẳng định mọi độ dài đều được SRS ấn định.
- Nên tạo mới ở DRAFT rồi chuyển ACTIVE sau kiểm tra điều kiện. Backend phải chốt transition được phép, không tin status từ FE.
- Không cho Buyer tự gửi sellerId hoặc Admin sửa dữ liệu ngoài quyền. Không cho payload đổi role/quyền. Seller ID không được suy ra từ tên hiển thị.
- Không thay đổi giá/cấu hình của phiên đã bắt đầu qua product API; cần kiểm tra liên kết Auction thực tế ở BE.
- 400/422 dữ liệu sai; 401 hết phiên; 403 thiếu quyền; 404 không tồn tại; 409 xung đột; 5xx lỗi máy chủ. FE không tự retry POST/PATCH khi timeout vì có thể đã ghi thành công.
- Đề nghị trả lỗi `{success:false,error:{code,message,fieldErrors:{title:"..."}}}`. FE vẫn đọc `error` dạng chuỗi của backend hiện tại.
