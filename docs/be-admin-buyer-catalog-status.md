# BE Catalog: phần Admin/Buyer (không gồm Auction)

Nhánh: `fix/be-catalog-seller-regression`. Phạm vi: chỉ Backend, không đụng FE, Auction, User Service.

## Nguyên tắc đã áp dụng

- Không sửa code của Seller/Staff và code dùng chung. Catalog về đúng bản gốc `3868646`, trừ 2 dòng thêm vào `app.ts`.
- Giữ nguyên `auth.ts`, gồm cơ chế đọc header `x-user-*` từ API Gateway.
- Không phụ thuộc User Service.
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

| Hạng mục (api-status)                                 | Lý do                                                     |
| ----------------------------------------------------- | --------------------------------------------------------- |
| P0-3: quyền `PRODUCT.CREATE/UPDATE/DELETE`, ownership | Phải sửa luồng ghi của Seller, cần nhóm 1 đồng ý          |
| P0-4: Admin tạo sản phẩm cho đúng Seller              | Phải sửa `create` của Seller, cần nhóm 1 quyết định       |
| P1: chuẩn hóa lỗi và mã 409 cho luồng ghi             | Cùng lý do với P0-3                                       |
| `/search` không có `q` trả 400                        | Giữ hợp đồng cũ của nhóm 1                                |
| Cập nhật Swagger                                      | File Gateway dùng chung                                   |
| Nghiệm thu qua API Gateway (cổng 4000)                | Chưa chạy; mới test Catalog trực tiếp trên DB Docker      |
| Lọc/phân trang bằng SQL                               | Hiện lọc trong bộ nhớ sau khi đọc tối đa 100.000 sản phẩm |

## Lưu ý cho nhóm 1

- Seller gọi `GET /products` hoặc `/search` không kèm token sẽ bị coi là khách, chỉ thấy sản phẩm ACTIVE còn hàng. Có token thì như cũ.
- Với `GET`, router mới chạy trước router cũ. Nếu nhóm 1 sửa các `GET` này thì Buyer/Admin không đi qua code của họ.
- Cả hai bên cùng sửa `app.ts` có thể xung đột merge, nhưng thay đổi chỉ 2 dòng.

## Kiểm thử

- Build Catalog: thành công.
- `src/app.test.ts` (test gốc của nhóm 1): 5/5 pass.
- `src/catalog-access.db.test.ts` (DB Docker, đặt `CATALOG_DB_TEST=true`): 1/1 pass. Không đặt biến này thì test bị bỏ qua.
- Test DB kiểm tra: Buyer/khách chỉ thấy ACTIVE còn hàng, `scope=admin` đúng quyền, Seller vẫn thấy sản phẩm nháp và `/mine`, Seller qua header Gateway vẫn ghi được, Buyer không ghi được.
