# Cấu trúc FE thống nhất

## Điểm bắt đầu

- Một app: `frontend/web` (`@nexus/web`).
- Một cổng: `http://localhost:3000`.
- Route trong `src/app`, giao diện/nghiệp vụ theo module trong `src/modules`.
- Alias `@/` trỏ vào `src/`.
- Giữ URL hiện có; `(public)`, `(auth)`, `(buyer)` là route group, không xuất hiện trong URL.

```text
src/
  app/
    (public)/       # /, /products, /products/[id], /auctions, /auctions/[id]
    (auth)/         # /login, /register, /forgot-password, /reset-password
    (buyer)/        # /account
    seller/         # Khu người bán
    support/        # Khu nhân viên hỗ trợ
    admin/          # Khu quản trị, route cụ thể thay cho catch-all
    layout.tsx      # SessionProvider dùng chung cho cả ứng dụng
  components/
    ui/             # shadcn/ui
    layout/         # Logo, header dùng chung
  configs/          # Env và cấu hình ứng dụng
  lib/
    axios/          # Axios instance, RequestApi, chuẩn hóa lỗi/response
    utils/          # Hàm dùng chung: className, kiểm tra return URL
  modules/
    auth/           # api, components, context, hooks, utils
    user/           # components và types/user.types.ts
    home/           # api, components, types
    catalog/        # api, components, fixtures, types/product.types.ts
    auction/        # api, components
    admin/          # api, components, styles
    seller/         # screens, components, fixtures, types
    support/        # screens, components, fixtures
```

## Khu vực theo role

| Khu vực   | Route                                                | File màn hình chính                                                                       |
| --------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Công khai | `/`                                                  | `modules/home/components/marketplace-home.tsx`                                            |
| Công khai | `/products`, `/products/[id]`                        | `modules/catalog/components/`                                                             |
| Công khai | `/auctions`, `/auctions/[id]`                        | `modules/auction/components/`                                                             |
| Buyer     | `/account`                                           | `app/(buyer)/account/page.tsx`                                                            |
| Auth      | `/login`, `/register`                                | `modules/auth/components/AuthPage.tsx`                                                    |
| Seller    | `/seller`                                            | `modules/seller/screens/seller-dashboard.tsx`                                             |
| Seller    | `/seller/products`                                   | `modules/seller/screens/seller-products-page.tsx`                                         |
| Seller    | `/seller/products/new`, `/seller/products/[id]/edit` | `modules/seller/screens/seller-product-form.tsx`                                          |
| Seller    | `/seller/auctions`, `/seller/auctions/new`           | `modules/seller/screens/seller-auctions-page.tsx`, `seller-auction-form.tsx`              |
| Seller    | `/seller/orders`, `/seller/inventory`                | `modules/seller/screens/seller-orders-page.tsx`, `seller-inventory-page.tsx`              |
| Support   | `/support`                                           | `modules/support/screens/support-dashboard.tsx`                                           |
| Support   | `/support/orders`, `/support/orders/[id]`            | `modules/support/screens/support-orders-page.tsx`, `support-order-detail-page.tsx`        |
| Support   | `/support/users`, `/support/shipments`               | `modules/support/screens/support-users-page.tsx`, `support-shipments-page.tsx`            |
| Admin     | `/admin`, `/admin/products`, `/admin/auctions`       | `modules/admin/components/admin-overview.tsx`, `admin-products.tsx`, `admin-auctions.tsx` |
| Admin     | `/admin/products/new`, `/admin/products/[id]/edit`   | `modules/admin/components/product-form.tsx` (giữ trạng thái thao tác ghi chưa hỗ trợ)     |

## Quy tắc cho Seller và Support

1. Một route mỏng gọi một screen. Mỗi thành viên sửa screen thuộc phần của mình, không gom vào file `seller-pages.tsx` hoặc `support-pages.tsx` nữa.
2. Component riêng của role đặt trong `modules/<role>/components`; dữ liệu mẫu riêng ở `fixtures`.
3. Khi nối backend, thêm adapter trong module nghiệp vụ sở hữu, dùng `requestApi` từ `lib/axios/api-client`. Không tự tạo Axios instance cho từng role.
4. Type API nghiệp vụ dùng chung đặt tại module nghiệp vụ: ví dụ `modules/catalog/types/product.types.ts`. Type Seller hiện là shape dữ liệu demo, chưa tự xem là contract Catalog.
5. Dùng `useSession` từ `modules/auth/hooks/use-session`; SessionProvider duy nhất ở root layout. Refactor này chưa thêm Redux và không thay đổi cơ chế phiên.
6. Chỉ tạo thư mục `hooks`, `api`, `store` khi có code thực cần đặt. Không tạo Redux store rỗng hoặc sao chép state đăng nhập sang hai nơi.
7. Backend vẫn chịu trách nhiệm kiểm tra quyền. Refactor thư mục không bổ sung quyền mới.

## Trạng thái chức năng được giữ nguyên

- Auth và Catalog gọi Gateway; Catalog vẫn hỗ trợ cấu hình nguồn theo env.
- Admin đọc Catalog/Auction API. Admin vẫn chỉ mở ở development theo logic trước refactor; không coi đây là thay đổi triển khai production.
- Buyer Auction vẫn là adapter demo/localStorage. Seller/Support vẫn dùng dữ liệu mẫu hiện có, chưa trở thành API thật sau đổi thư mục.
- Không bổ sung màn hình hoặc nghiệp vụ mới chỉ vì có sơ đồ cấu trúc.
- Màu, logo, video, URL và payload API được giữ nguyên.

## Bản đồ chuyển file

| Trước                                   | Sau                                                                                                                                                                                             |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/web-customer`                 | `frontend/web`                                                                                                                                                                                  |
| `src/services/api-client.ts`            | `src/lib/axios/api-client.ts`                                                                                                                                                                   |
| `src/services/auth.api.ts`              | `src/modules/auth/api/auth.api.ts`                                                                                                                                                              |
| `src/modules/user/auth/`                | `src/modules/auth/components`, `context`, `hooks`                                                                                                                                               |
| `frontend/shared/http.ts`               | HTTP helper trong `lib/axios/http.ts`, session trong `modules/auth/utils/session.ts`, auth factory trong `modules/auth/api/auth.factory.ts`, user type trong `modules/user/types/user.types.ts` |
| `frontend/shared/catalog.ts`            | `modules/catalog/api/catalog.factory.ts`, type trong `modules/catalog/types/product.types.ts`                                                                                                   |
| `src/shared/components/`                | `src/components/layout/`                                                                                                                                                                        |
| `admin/[[...path]]/page.tsx`            | Các `page.tsx` cụ thể dưới `app/admin/`                                                                                                                                                         |
| `seller-pages.tsx`, `support-pages.tsx` | Từng screen trong `modules/seller/screens/`, `modules/support/screens/`                                                                                                                         |

App `web-admin` cũ, demo auth và các màn demo không được route chính sử dụng đã được đưa vào bản sao lưu local ngoài repo trước khi loại khỏi cây đang phát triển. Không mang các file đó vào app mới chỉ để giữ tên thư mục. Bản sao lưu chứa toàn bộ FE trước refactor, gồm cả file local chưa commit.

## Chạy và kiểm tra

Từ root repo:

```powershell
pnpm install --frozen-lockfile
npm run dev
pnpm --filter @nexus/web build
node --import tsx --test frontend/web/src/modules/catalog/api/catalog-contract.test.ts frontend/web/src/modules/auth/api/auth.api.test.ts frontend/web/src/modules/auction/api/auction.api.test.ts
```

Không chạy `next build` cùng lúc với dev trong cùng app vì dùng chung thư mục `.next`.
