# Nexus — Ghi chú vấn đáp frontend

## 1. Cách giới thiệu trong khoảng một phút

“Em xây dựng giao diện Nexus bằng Next.js App Router, React, TypeScript và Tailwind CSS. Trang chủ giới thiệu hai luồng riêng: mua sắm và đấu giá. Trang `/products` hiển thị toàn bộ sản phẩm mua sắm; trang `/auctions` hiển thị toàn bộ phiên đấu. Em dùng chung bộ dữ liệu mock có kiểu dữ liệu, các thẻ sản phẩm và popup tài khoản để tránh lặp code. Tìm kiếm, lọc, sắp xếp và phân trang được xử lý phía client. Banner dùng HTML5 video làm nền, phủ gradient đỏ để chữ dễ đọc; React điều khiển phát/dừng theo slide và trạng thái trang. Đây là giao diện với dữ liệu mô phỏng; chưa phải hệ thống đấu giá realtime hoàn chỉnh.”

## 2. Sơ đồ code cần nhớ

Các đường dẫn sau tính từ `frontend/web-customer/`:

| File                                                    | Nhiệm vụ                                                                                       |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `src/app/page.tsx`                                      | Server Component cho route `/`, lấy mock feed rồi truyền vào homepage.                         |
| `src/app/products/page.tsx`                             | Route `/products`, truyền feed vào entry point module catalog.                                 |
| `src/app/auctions/page.tsx`                             | Route `/auctions`, truyền feed vào entry point module auction.                                 |
| `src/modules/home/api/marketplace.api.ts`               | Mock adapter `getMarketplaceFeed()`, cung cấp danh mục và listing. Chưa gọi API sản phẩm thật. |
| `src/modules/home/types/marketplace.types.ts`           | TypeScript types cho feed, sản phẩm, danh mục và lịch sử giá.                                  |
| `src/modules/home/components/marketplace-home.tsx`      | Tổ chức trang chủ, tìm kiếm, lọc và các khu mua sắm/đấu giá.                                   |
| `src/modules/catalog/components/product-directory.tsx`  | Entry point trang danh sách mua sắm thuộc module catalog.                                      |
| `src/modules/auction/components/auction-directory.tsx`  | Entry point trang danh sách phiên đấu thuộc module auction.                                    |
| `src/shared/components/marketplace-directory.tsx`       | Phần trình bày danh sách dùng chung, cấu hình bằng `variant`.                                  |
| `src/modules/home/components/marketplace-card.tsx`      | Thẻ sản phẩm, ảnh, giá, trạng thái và thời gian còn lại.                                       |
| `src/modules/home/components/marketplace-hero.tsx`      | Banner carousel và điều khiển video nền.                                                       |
| `src/modules/home/components/account-prompt-dialog.tsx` | Native dialog mời đăng nhập/đăng ký, kèm sản phẩm đang chọn.                                   |
| `src/modules/home/components/marketplace-sort-menu.tsx` | Dropdown sắp xếp bằng icon trên homepage. Trang danh sách dùng native select.                  |
| `src/shared/components/nexus-logo.tsx`                  | SVG logo túi mua sắm và chữ NEXUS.                                                             |
| `src/app/marketplace.css`                               | Tailwind theme, màu thương hiệu, gradient, keyframes, media queries.                           |

Route mỏng giúp phần định tuyến tách khỏi phần trình bày. Catalog và auction có entry point riêng, dùng chung phần danh sách khi hành vi giống nhau. Đây là tổ chức frontend theo feature/context, không có nghĩa frontend tự thực thi mọi quy tắc nghiệp vụ của backend.

## 3. Kỹ thuật và mức độ khó

| Phần             | Kỹ thuật thực dùng                                                                       | Độ khó tương đối                                                   |
| ---------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Bố cục           | CSS Grid, Flexbox, Tailwind breakpoints, container, `clamp()` cho tiêu đề hero.          | Cơ bản–trung bình.                                                 |
| Kiểu dữ liệu     | TypeScript props/types, `mode: 'fixed' \| 'auction'`, `status: 'active' \| 'scheduled'`. | Cơ bản–trung bình.                                                 |
| Tương tác        | React `useState`, controlled input/select, event handlers.                               | Trung bình.                                                        |
| Dữ liệu hiển thị | `useMemo`, `filter`, `sort`, `slice`.                                                    | Trung bình.                                                        |
| Carousel/video   | HTML5 media, `useRef`, `useEffect`, timer, Page Visibility, reduced motion.              | Trung bình; phối hợp các điều kiện dễ sai hơn viết thẻ video.      |
| Popup            | Native `<dialog>`, `showModal()`, body scroll lock, Escape/backdrop/close.               | Trung bình.                                                        |
| Trang đấu giá    | Lọc theo trạng thái, thời gian còn lại, chọn phiên nổi bật theo số lượt trả giá.         | Trung bình ở bản mock.                                             |
| Tích hợp thật    | Xác thực, phân quyền server, đồng bộ nhiều người đặt giá, chống race condition.          | Khó hơn nhiều; không được nhận là đã hoàn thành trong phần UI này. |

### Tìm kiếm không dấu

Chuỗi được chuẩn hóa bằng `normalize('NFD')`, bỏ các dấu kết hợp bằng regex, đổi `đ/Đ` thành `d/D`, rồi `toLowerCase()`. Sau đó dùng `includes()` để so tên sản phẩm, danh mục và gian hàng. Ví dụ `dong ho` vẫn tìm được “Đồng hồ”.

### Lọc, sắp xếp và phân trang

Thứ tự xử lý là: chọn luồng mua sắm/đấu giá → tìm kiếm và lọc → sắp xếp → lấy trang hiện tại. `filter()` tạo một mảng mới; `sort()` trên mảng đó không làm đổi thứ tự bộ fixture gốc.

- Mua sắm: 12 sản phẩm/trang. Đấu giá: 6 phiên/trang.
- Tổng số trang: `Math.max(1, Math.ceil(result.length / pageSize))`.
- Vị trí bắt đầu: `(currentPage - 1) * pageSize`.
- Dữ liệu trang: `result.slice(start, start + pageSize)`.
- Khi đổi bộ lọc hoặc sắp xếp, đưa về trang 1 để tránh trang trống do số kết quả giảm.
- Có trạng thái không có kết quả và nút xóa bộ lọc.

`useMemo` lưu kết quả giữa các render nếu dependencies không đổi. Nó không tạo API, không tạo cache server và không phải lúc nào cũng làm ứng dụng nhanh hơn. Với dữ liệu lớn cần tìm kiếm/lọc/phân trang ở server, không tải toàn bộ dữ liệu về browser.

## 4. Video banner: làm ở đâu và làm gì?

### Tài nguyên

- Video: `public/videos/nexus-vinyl-hero.mp4`.
- Poster: `public/images/nexus-vinyl-poster.jpg`.
- Ảnh slide 2: `public/images/nexus-camera-hero.jpg`.
- Ảnh slide 3: `public/images/nexus-watch-hero.jpg`.
- Thông tin nguồn/giấy phép: `public/videos/ASSET-LICENSE.md`.

File trong `public/` được tham chiếu từ gốc URL, vì vậy dùng `/videos/nexus-vinyl-hero.mp4`, không dùng `/public/videos/...`. Video là footage có sẵn từ Mixkit, khoảng 10 giây, 3.56 MB, 1280×720 theo ghi chú asset. FE không tự tạo chuyển động bên trong video và không sao chép footage của NexPark.

### Cách dựng lớp

Từ dưới lên: ảnh nền/poster → video → gradient đỏ → lưới trang trí → chữ/nút/thẻ sản phẩm.

- Khung banner dùng `relative`, `isolate`, `overflow-hidden` và bo góc.
- Nền dùng `absolute inset-0`; video dùng `object-cover` để phủ kín, có thể bị cắt mép.
- `object-[65%_center]` điều chỉnh vùng ảnh được ưu tiên hiển thị khi crop.
- Gradient trong `.nexus-video-overlay` giữ màu thương hiệu và tăng độ rõ của chữ.
- `pointer-events-none` trên lớp trang trí tránh chặn các nút.
- Thẻ sản phẩm trên hero dùng nền trong suốt, border trắng mờ và `backdrop-blur` tạo hiệu ứng kính.

### Thuộc tính và event của video

```tsx
<video
  ref={video}
  autoPlay={!reduced && slide.media === 'video'}
  loop
  muted
  playsInline
  preload={reduced ? 'none' : 'metadata'}
  poster="/images/nexus-vinyl-poster.jpg"
  onPlaying={() => setVideoReady(true)}
  onError={() => setVideoReady(false)}
>
  <source src="/videos/nexus-vinyl-hero.mp4" type="video/mp4" />
</video>
```

- `autoPlay`: yêu cầu tự phát khi điều kiện cho phép; không đảm bảo browser luôn chấp nhận.
- `muted`: tắt âm thanh, hỗ trợ chính sách autoplay của trình duyệt.
- `loop`: lặp lại video khi chạy hết.
- `playsInline`: yêu cầu phát trong trang trên điện thoại.
- `poster`: ảnh đại diện trước khi video phát.
- `preload="metadata"`: gợi ý tải metadata, không đảm bảo chỉ tải đúng một lượng dữ liệu, nhất là khi bắt đầu phát.
- `onPlaying`: chỉ hiện lớp video khi thật sự phát; `onError` đưa về poster.

### Điều khiển bằng React

```ts
const motionAllowed = !reduced && !hidden && !suspended;
const videoPlaying = motionAllowed && slide.media === 'video';
const rotating = motionAllowed && !hovered && !focused;
```

- `useRef<HTMLVideoElement>` giữ tham chiếu tới phần tử video để gọi `play()`/`pause()`.
- `useEffect` gọi `play()` khi đủ điều kiện và `pause()` khi không đủ điều kiện.
- `play()` trả Promise; code dùng `catch()` để giữ poster nếu autoplay bị chặn.
- `videoReady` điều khiển opacity của video; transition 700 ms giúp chuyển lớp nhẹ hơn.
- Video chỉ phát ở slide 1; slide 2 và 3 dùng ảnh riêng, video vẫn được giữ trong DOM nhưng ẩn và pause.
- Carousel tự chuyển mỗi 8 giây bằng `setInterval`; modulo `% slides.length` giúp quay vòng.
- Hover hoặc focus trong hero dừng **tự chuyển slide**, không tự dừng video chỉ vì hover.
- `visibilitychange` nhận biết tab nền; `suspended` từ homepage nhận biết popup đang mở. Các trạng thái này dừng cả video và carousel.
- `matchMedia('(prefers-reduced-motion: reduce)')` tôn trọng cài đặt giảm chuyển động: dùng ảnh tĩnh, không tự chạy carousel.
- Effect cleanup xóa timer và event listeners để tránh giữ tài nguyên sau khi unmount.
- Giá trị `reduced` ban đầu là `true`, sau mount mới đọc browser preference; render đầu của server/client thống nhất thay vì đọc `window` ngay trong render.

Không có Framer Motion, GSAP, Lottie, WebGL, 3D hoặc animation điều khiển thời gian video theo cuộn trong phần hero này. Hiệu ứng đang dùng là HTML5 video + CSS transitions/keyframes + React hooks. Chuyển động của đĩa than đã được quay sẵn trong MP4.

## 5. Trang đấu giá có gì riêng?

- Tách hoàn toàn listing đấu giá khỏi danh sách mua sắm bằng trường `mode`.
- Hero chọn phiên còn hoạt động có số lượt trả giá cao nhất trong mock feed.
- Hiển thị số phiên đang mở, số phiên sắp mở, giá hiện tại và thời gian.
- Tab “Sắp kết thúc” lấy phiên đang hoạt động còn tối đa 60 phút.
- Tab “Đã kết thúc” áp dụng cho phiên active trong fixture có thời gian về 0; không tự suy ra người thắng hay tạo đơn hàng.
- Mức giá hiện tại khác giá mua cuối cùng. Số lượt trả, người bán, lịch sử và thời gian ở đây là mô phỏng.

## 6. Những giới hạn cần nói đúng

- Countdown lấy số giây từ fixture và trừ thời gian đã trôi, cập nhật mỗi giây. Mở lại trang có thể reset; không phải thời gian authoritative từ server.
- Chưa có WebSocket/SSE nhận bid của người khác, chưa có xử lý tranh chấp bid hay settlement trong phần giao diện danh sách này.
- Bản danh sách hiện dùng luồng guest/popup; auth thật được đồng đội bổ sung ở phần khác của `main`. Không nhận rằng popup là cơ chế phân quyền bảo mật.
- Không có đơn hàng, thanh toán hoặc xác nhận thắng đấu giá do hai trang mới tạo ra.
- Giá/seller/rating/sold count/ảnh minh họa là mock; build thành công không chứng minh nghiệp vụ giao dịch thật đã hoạt động.
- Video có poster và xử lý lỗi nhưng autoplay còn phụ thuộc trình duyệt, pin/data saver và cài đặt người dùng.

## 7. Câu hỏi thường gặp

**Vì sao dùng Next.js và có cả server/client component?** Route lấy dữ liệu và metadata nằm ở Server Component; tương tác dùng state, event và browser API nằm ở Client Component với `'use client'`. Route dùng async mock feed không có nghĩa luôn SSR mỗi request; build hiện tại có thể prerender các trang thành static.

**TypeScript có bảo đảm response backend đúng không?** Không. Type giúp kiểm tra code khi phát triển/compile. Khi nối backend thật vẫn cần kiểm tra contract và có thể cần runtime validation.

**Vì sao dùng cùng một component danh sách?** Hai trang lặp lại search, filter, sort, card, pagination, empty state và popup. Dùng chung giúp sửa một nơi; `variant` đổi phần trình bày riêng. Đây là lựa chọn phù hợp bản MVP, có thể tách sâu hơn khi auction có luồng khác hẳn catalog.

**Vì sao không dùng video cho cả ba slide?** Một video đĩa than cho camera/đồng hồ gây lệch nội dung. Slide 1 dùng video, hai slide còn lại dùng ảnh đúng nhóm sản phẩm.

**Đẹp là do video hay CSS?** Do kết hợp footage, gradient, tỷ lệ bố cục, chữ, khoảng trống và hiệu ứng chuyển lớp. Video chỉ là một lớp nền; thông tin và nút vẫn là HTML độc lập.

**Nếu video không tải được thì sao?** Ảnh nền/poster đã ở dưới. Video ẩn khi lỗi hoặc không phát; chữ và CTA vẫn sử dụng được.

**Làm thế nào chuyển mock sang API thật?** Giữ UI nhận dữ liệu có kiểu; thay adapter mock bằng contract thực, bổ sung loading/error state, phân trang server, server time và kênh realtime theo backend. Kiểm tra lại auth và quyền trên server.

**Phần khó nhất em đã làm?** Phối hợp trạng thái carousel/video, reduced motion và popup; bảo đảm tìm kiếm/lọc/sắp xếp/phân trang không lệch nhau; tái sử dụng component mà vẫn tách rõ mua sắm và đấu giá. Chưa nên nhận đã giải quyết các vấn đề concurrency của auction backend.
