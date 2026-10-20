# Frontend Nexus

Một ứng dụng Next.js tại `frontend/web`, package `@nexus/web`, dùng chung cho Buyer, Seller, Support và Admin. Chạy từ root monorepo bằng `npm run dev`; cổng cố định 3000. Khi cổng bận, dừng tiến trình cũ trước; ứng dụng không tự chuyển sang cổng khác.

- Hướng dẫn cấu trúc và vị trí từng màn hình: [STRUCTURE.md](docs/STRUCTURE.md).
- Cài dependency từ root: `pnpm install --frozen-lockfile`.
- Cấu hình môi trường: sao chép `web/.env.example` thành `web/.env.local` nếu chưa có.
- Build FE: `pnpm --filter @nexus/web build`.
- Typecheck: `pnpm --filter @nexus/web exec tsc --noEmit`.

Không tạo lại app riêng cho từng role. Các tài liệu API/nghiệp vụ cũ trong `docs/` là snapshot; khi xác nhận endpoint, ưu tiên code adapter và backend hiện tại.
