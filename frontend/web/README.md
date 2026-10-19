# Nexus Web

Ứng dụng Next.js dùng chung cho Buyer, Seller, Support và Admin. Xem [cấu trúc và hướng dẫn cho nhóm](../docs/STRUCTURE.md).

Từ root repo chạy `npm run dev`, mở http://localhost:3000. Package hiện tại là `@nexus/web`; lệnh build: `pnpm --filter @nexus/web build`.

Sao chép `.env.example` sang `.env.local` nếu chưa có. Biến `NEXT_PUBLIC_API_BASE_URL` trỏ tới Gateway, `NEXT_PUBLIC_API_TIMEOUT_MS` cấu hình timeout, `NEXT_PUBLIC_CATALOG_SOURCE=api` chọn Catalog API. Không đưa secret vào biến public. Đổi env cần restart dev/rebuild.

Video và ảnh nằm trong `public/`; nguồn video tại `public/videos/ASSET-LICENSE.md`. Banner/carousel giữ trong `src/modules/home/components/marketplace-hero.tsx`.
