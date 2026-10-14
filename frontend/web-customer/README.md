# Nexus Marketplace — Trang chủ MVP

Next.js 15 App Router, TypeScript và Tailwind/PostCSS. Màu chính: #ED1C24 và #9E0B0F.

## Chạy local

Sau khi dependencies đã cài, từ root monorepo chạy `npm run dev` và mở URL Local terminal hiển thị. Cài dependencies bằng pnpm theo lockfile; không tạo package-lock.json bằng npm install trong monorepo.

Kiểm tra: `pnpm --filter @nexus/web-customer exec tsc --noEmit` và `pnpm --filter @nexus/web-customer build`.

## Phạm vi

- 4 danh mục, 24 sản phẩm mua sắm và 7 listing đấu giá. Hai khu tách riêng, không lặp đấu giá vào lưới mua sắm.
- Tìm kiếm tiếng Việt không dấu theo tên/danh mục/gian hàng; lọc và sắp xếp, xem thêm sản phẩm; các phiên có tab đang diễn ra/sắp mở/sắp kết thúc/nhiều lượt trả.
- Header có nút Đăng nhập. Khách bấm xem hoặc lưu sản phẩm mở popup account; CTA dùng AuthPage có sẵn tại `/login` và `/register`. Không tạo form auth mới.
- Carousel có nút trước/sau, chọn slide, tự chạy và nền MP4. Không hiển thị nút play/pause theo yêu cầu giao diện; reduced-motion dùng poster tĩnh, video dừng khi popup mở hoặc tab nền.
- Chưa nối auth/session hoặc API backend, chưa có cart/checkout/role workspace.

Phân tích SRS, quy tắc UX và tiêu chí nghiệm thu: [docs/homepage-business-rules.md](docs/homepage-business-rules.md).

## Code

Route `src/app/page.tsx` nhận mock feed. Module `src/modules/home` chứa API adapter, types, cards, hero, homepage và account prompt. `src/app/marketplace.css` chứa Tailwind theme và animation. Route login chỉ chọn mode cho UI auth của nhóm.

Giá, tên người bán, điểm uy tín, rating, đã bán, lịch sử và thời gian đều là mock. Ảnh stock chỉ minh họa nhóm sản phẩm. Reload reset countdown. Không có đơn hàng, thanh toán hoặc bid thật. Homepage dùng luồng guest tới khi nối auth contract của nhóm.

Base URL API chỉ cấu hình bằng env trong `.env.local` theo `.env.example`; mock feed không cần backend để render. Khi BE có contract, thay adapter bằng shared Axios client và dữ liệu server. Không hardcode URL theo máy cá nhân hoặc đưa credential vào frontend env.

## Banner video

Video đĩa than Mixkit nằm trong `public/videos/nexus-vinyl-hero.mp4`; poster tại `public/images/nexus-vinyl-poster.jpg`. Xem nguồn/giấy phép trong `public/videos/ASSET-LICENSE.md`. Video tự phát, lặp, tắt tiếng và playsInline; nếu autoplay bị chặn hoặc video lỗi thì banner vẫn có poster. Chỉ tham khảo cách phối lớp từ NexPark, không sao chép footage hoặc branding parking.

Mỗi banner dùng nền khớp listing: banner 1 video đĩa than (NX-215), banner 2 ảnh máy ảnh (NX-101), banner 3 ảnh đồng hồ thông minh (NX-108). Video được pause/ẩn khi rời banner 1; carousel vẫn tự chuyển giữa cả ba banner.
