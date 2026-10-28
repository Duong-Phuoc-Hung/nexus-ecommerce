# BE Catalog: phần Admin/Buyer (không gồm Auction)

Nhánh: `fix/be-catalog-seller-regression`. Phạm vi: chỉ Backend, không đụng FE, Auction, User Service.

## Nguyên tắc đã áp dụng

- Không sửa code của Seller/Staff và code dùng chung. Catalog về đúng bản gốc `3868646`, trừ 2 dòng thêm vào `app.ts`.
- Giữ nguyên `auth.ts`, gồm cơ chế đọc header `x-user-*` từ API Gateway.
- Không phụ thuộc User Service cho phần đọc; chỉ phần Admin tạo sản phẩm cho Seller gọi User Service để xác minh Seller.
- Giữ chung URL `/api/v1/products`, không đổi Gateway.

## Cách làm

Thêm router mới `CatalogAccessRoutes.ts`, đăng ký trước router cũ trong `app.ts`.
Với các `GET`, router mới xử lý Khách/Buyer và `scope=admin`.
Các vai trò khác (Seller, Staff...) được chuyển nguyên trạng sang router cũ bằng `next()`.
`POST/PUT/DELETE` và `/products/mine` không đi qua logic mới.

## Đã làm

| Hạng mục                                                                     | Trạng thái |
| ---------------------------------------------------------------------------- | ---------- |
| Khách/Buyer chỉ thấy sản phẩm ACTIVE còn hàng (list, search, chi tiết)       | Xong       |
| `scope=admin`: 401 nếu chưa đăng nhập, 403 nếu không phải Admin              | Xong       |
| Admin xem mọi trạng thái, lọc `status`                                       | Xong       |
| Phân trang `page`/`limit` (tối đa 100), `meta`                               | Xong       |
| Lọc `categoryId`, `minPrice`, `maxPrice`, `condition`, `saleType`, `q`       | Xong       |
| Sắp xếp `sort`: `newest`, `oldest`, `price_asc`, `price_desc`                | Xong       |
| Lỗi có `code` (`UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`, `NOT_FOUND`) | Xong       |
| Test trên Postgres Docker (`nexus-postgres-catalog`)                         | Xong       |

File mới: `CatalogAccessRoutes.ts`, `ListCatalogProductsUseCase.ts`, `catalog-access.db.test.ts`.
File dùng chung bị chạm: `app.ts` (1 import, 1 dòng gắn router).

## Chưa làm

| Hạng mục (api-status)                                 | Lý do                                               |
| ----------------------------------------------------- | --------------------------------------------------- |
| P1: chuẩn hóa lỗi và mã 409 cho luồng ghi của Seller  | Thuộc luồng Seller, cần nhóm 1 đồng ý               |
| `/search` không có `q` trả 400                        | Giữ hợp đồng cũ của nhóm 1                          |
| Cập nhật Swagger                                      | File Gateway dùng chung                             |
| Gọi Catalog trực tiếp (4002) và User Service Postgres | Chỉ mới chạy qua Gateway với User Service in-memory |

Đã xong: lọc, sắp xếp, phân trang và đếm tổng của `GET /products` (Buyer/Admin) chạy bằng SQL (`PostgresCatalogQuery`), chỉ đọc đúng 1 trang. Chế độ in-memory/test vẫn dùng `InMemoryCatalogQuery`.

## Phần GHI của Admin (POST/PUT/DELETE `/products`)

Router mới `CatalogAdminWriteRoutes.ts`, đăng ký trước router cũ. Chỉ xử lý khi người gọi là ADMIN; Seller/Buyer/khách được chuyển nguyên trạng sang router cũ (`next('route')`).

- `POST /products`: Admin phải truyền `sellerId`; Seller được xác minh qua `GET /users/:id` của User Service (dùng token của Admin): 404 nếu không có, 422 nếu không phải Seller hoặc không `ACTIVE`, 503 nếu không tra cứu được. Sản phẩm thuộc đúng Seller đó.
- `PUT/DELETE /products/:id`: Admin sửa/xóa sản phẩm của Seller bất kỳ (tái dùng use case cũ, không sửa).
- Quyền: kiểm tra `PRODUCT.CREATE/UPDATE/DELETE` trong claim `permissions` của JWT (thiếu thì 403). Nếu không có claim, hoặc claim rỗng (token User Service hiện cấp `privileges: []`), thì dựa vào role ADMIN.
- Test: `src/catalog-admin-write.test.ts` (in-memory, directory giả), pass cùng `app.test.ts`.
- Đã kiểm chứng chạy thật: Admin → Gateway (4000) → User Service (4001, in-memory) → Catalog (4002, Postgres Docker). Admin tạo sản phẩm cho Seller (201, đúng `sellerId`), sửa, xóa; `sellerId` thiếu 400, không tồn tại 404, là Buyer 422; Buyer 403, không token 401; Seller vẫn ghi qua router cũ.
- Lưu ý: Seller gọi `GET /products` mà không gửi token sẽ bị coi là khách (không thấy sản phẩm nháp) — đúng thiết kế, Seller luôn phải gửi Bearer token.
- Cần cấu hình `USER_SERVICE_URL` (mặc định `http://localhost:4001`).

## Lưu ý cho nhóm 1

- Seller gọi `GET /products` hoặc `/search` không kèm token sẽ bị coi là khách, chỉ thấy sản phẩm ACTIVE còn hàng. Có token thì như cũ.
- Với `GET`, router mới chạy trước router cũ. Nếu nhóm 1 sửa các `GET` này thì Buyer/Admin không đi qua code của họ.
- Cả hai bên cùng sửa `app.ts` có thể xung đột merge, nhưng thay đổi chỉ 2 dòng.

## Kiểm thử

- Build Catalog: thành công.
- `src/app.test.ts` (test gốc của nhóm 1): 5/5 pass.
- `src/catalog-access.db.test.ts` (DB Docker, đặt `CATALOG_DB_TEST=true`): 1/1 pass. Không đặt biến này thì test bị bỏ qua.
- Test DB kiểm tra: Buyer/khách chỉ thấy ACTIVE còn hàng, `scope=admin` đúng quyền, Seller vẫn thấy sản phẩm nháp và `/mine`, Seller qua header Gateway vẫn ghi được, Buyer không ghi được.
