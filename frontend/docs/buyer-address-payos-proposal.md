# Đề xuất Buyer: liên hệ, sổ địa chỉ và thanh toán PayOS

Ngày soạn: 27/10/2026. Trạng thái: **Bản ý tưởng để nhóm duyệt, chưa triển khai**.

## 1. Mục tiêu và hiện trạng

Buyer cung cấp thông tin liên hệ một lần, lưu nhiều địa chỉ và chọn nhanh khi mua hàng. Checkout thể hiện rõ người nhận, nơi giao, phí vận chuyển và tổng tiền trước khi chuyển sang PayOS. Sau thanh toán, Buyer theo dõi đơn tại mục Đơn mua.

Đối chiếu source local ở thời điểm soạn:

- Đăng ký FE đang gửi `email`, `fullName`, `password`; chưa gửi số điện thoại hoặc địa chỉ.
- Checkout hiện có bốn ô nhập tay: người nhận, điện thoại, địa chỉ cụ thể, tỉnh/thành; chưa tự điền từ hồ sơ.
- Adapter FE gọi `POST /orders/checkout`, có chặn response chứa `skeleton`. Controller checkout local vẫn trả skeleton.
- Adapter User FE có đọc hồ sơ; chưa có quản lý sổ địa chỉ. Chưa thấy tích hợp PayOS trong phạm vi route/controller đã kiểm tra. Đây là đối chiếu source, không phải kết quả kiểm thử API đang chạy.
- Giỏ hàng đang lưu theo trình duyệt. Trước thanh toán thật cần tách theo Buyer để tài khoản khác không dùng nhầm giỏ cũ; BE vẫn phải kiểm tra lại toàn bộ sản phẩm và giá.

## 2. Đối chiếu SRS và phạm vi bổ sung

Nguồn nghiệp vụ hiện dùng: bảng quyền trích SRS v1.0, mục 2.7 trong skill `nexus-srs-rbac`; không có file SRS gốc mới trong repo để xác nhận các thay đổi sau phiên bản này.

| Hành vi                           | Quyền hoặc căn cứ                                 | Quy tắc đề xuất                                              |
| --------------------------------- | ------------------------------------------------- | ------------------------------------------------------------ |
| Xem/sửa hồ sơ cá nhân             | `PROFILE.VIEW`, `PROFILE.UPDATE`                  | Chỉ dữ liệu của tài khoản đang đăng nhập                     |
| Giỏ hàng, checkout, tạo đơn       | `CART.*`, `CHECKOUT.START`, `ORDER.CREATE`: Buyer | Admin/Seller/Support không được tự mua dưới danh tính Buyer  |
| Xem đơn                           | `ORDER.VIEW`, `ORDER.LIST`                        | Buyer chỉ xem đơn của mình; role khác theo phạm vi nghiệp vụ |
| Tra phí giao hàng                 | `SHIPPING.QUOTE`                                  | Checkout tính phí theo địa chỉ và nhóm hàng được giao        |
| Quản lý nhiều địa chỉ, chọn PayOS | Ý tưởng mở rộng cần nhóm duyệt                    | Chưa coi đây là yêu cầu chi tiết đã được SRS xác nhận        |

Thông tin người nhận có thể khác chủ tài khoản. Email tài khoản dùng nhận thông báo đơn; tên và điện thoại người nhận dùng giao hàng. Không tự đổi hồ sơ khi Buyer sửa người nhận cho một đơn.

## 3. Luồng đăng ký và hoàn thiện thông tin

### Bước 1 — Tạo tài khoản

- Họ tên, email, số điện thoại liên hệ, mật khẩu và xác nhận mật khẩu.
- Email dùng đăng nhập và nhận thông báo giao dịch; điện thoại dùng liên hệ giao hàng.
- Kiểm tra định dạng email, số điện thoại và mật khẩu theo chính sách BE thống nhất; chuẩn hóa điện thoại ở BE. Không gắn nhãn “đã xác minh” chỉ vì đúng định dạng.
- OTP điện thoại và xác minh email là phần mở rộng riêng nếu có dịch vụ/API; không tạo giao diện báo xác minh thành công khi chưa có xử lý thật.

### Bước 2 — Thêm địa chỉ đầu tiên

- Màn hình ngay sau khi tạo tài khoản thành công: “Thêm địa chỉ nhận hàng”.
- Tự điền tên và điện thoại vừa đăng ký; Buyer được sửa thông tin người nhận.
- Địa chỉ đầu tiên được đề xuất làm mặc định.
- **Khuyến nghị:** có nút “Để sau”; bắt buộc hoàn thiện trước checkout. Người chỉ muốn xem sản phẩm không cần nhập địa chỉ ngay. Nếu nhóm muốn bắt buộc khi đăng ký, chỉ cần bỏ bước hoãn sau khi chốt.
- Tạo tài khoản thành công nhưng lưu địa chỉ lỗi: giữ tài khoản, giữ dữ liệu form để thử lại; không bắt đăng ký lại.
- Tài khoản cũ chưa có điện thoại/địa chỉ được hướng dẫn bổ sung khi mua, không làm hỏng đăng nhập hiện có.

## 4. Sổ địa chỉ của Buyer

Vị trí: Tài khoản → Địa chỉ nhận hàng, đề xuất route `/account/addresses`.

Mỗi địa chỉ hiển thị dưới dạng thẻ: nhãn “Nhà riêng”/“Văn phòng”/“Khác”, tên người nhận, điện thoại, địa chỉ đầy đủ, dấu “Mặc định”, nút sửa và xóa. Có nút “Thêm địa chỉ mới”.

| Trường                                | Bắt buộc                       | Ghi chú                                                                             |
| ------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------- |
| Tên người nhận                        | Có                             | Có thể khác chủ tài khoản                                                           |
| Điện thoại người nhận                 | Có                             | Dùng cho giao hàng, lưu dạng chuẩn hóa                                              |
| Tỉnh/thành và đơn vị địa chỉ cấp dưới | Theo dữ liệu địa chỉ được chọn | Lưu mã và tên; không hardcode quận/huyện thành trường bắt buộc trong mọi bộ dữ liệu |
| Địa chỉ cụ thể                        | Có                             | Số nhà, đường, tòa nhà, tầng/căn hộ nếu có                                          |
| Nhãn địa chỉ                          | Không                          | Nhà riêng, Văn phòng hoặc nhãn khác                                                 |
| Mặc định                              | Có                             | Mỗi Buyer tối đa một địa chỉ mặc định                                               |
| Ghi chú giao hàng                     | Không                          | Ví dụ gọi trước khi giao; tách với địa chỉ chính                                    |

Quy tắc:

- Đề xuất tối đa 5 địa chỉ cho MVP; đây là giới hạn sản phẩm cần nhóm duyệt.
- Đổi tỉnh/thành phải xóa lựa chọn cấp dưới không còn phù hợp; dữ liệu địa danh lấy từ một nguồn thống nhất với BE/đơn vị vận chuyển.
- Xóa địa chỉ mặc định khi còn địa chỉ khác: yêu cầu chọn địa chỉ mặc định thay thế trong hộp xác nhận. Nếu xóa địa chỉ cuối cùng, tài khoản vẫn hoạt động và phải thêm địa chỉ ở lần checkout sau.
- Sửa/xóa địa chỉ trong sổ không được làm thay đổi địa chỉ đã ghi trên đơn cũ.
- BE lấy chủ sở hữu từ phiên đăng nhập, không tin `userId` do FE tự gửi. Đổi ID địa chỉ trên request không được đọc/sửa địa chỉ của Buyer khác.

## 5. Checkout: tự điền nhưng Buyer vẫn kiểm soát

Luồng đề xuất:

```text
Giỏ hàng → Chọn địa chỉ → Kiểm tra hàng và phí giao
        → Xác nhận tổng tiền → Tạo đơn chờ thanh toán
        → PayOS → Xác nhận kết quả từ BE → Chi tiết đơn mua
```

Thứ tự ưu tiên địa chỉ: lựa chọn Buyer đang dùng trong lần checkout này → địa chỉ mặc định → yêu cầu thêm/chọn. Không tự thay lựa chọn hiện tại khi dữ liệu hồ sơ tải lại.

Khối địa chỉ đầu checkout hiển thị tên, điện thoại và địa chỉ đầy đủ; có “Thay đổi”. Bấm vào mở Dialog chọn các thẻ địa chỉ bằng radio, kèm “Thêm địa chỉ mới”. Địa chỉ được chọn hiện trong thẻ tóm tắt sau khi đóng Dialog.

Khi thêm địa chỉ tại checkout:

- Có lựa chọn “Lưu vào sổ địa chỉ” và “Đặt làm mặc định”; lựa chọn mặc định chỉ khả dụng khi lưu vào sổ.
- Nếu chỉ dùng lần này, địa chỉ được lưu vào bản chụp của đơn, không thêm vào sổ.
- Địa chỉ không hợp lệ hoặc khu vực chưa hỗ trợ giao: hiển thị lỗi tại trường/khối giao hàng, không cho đi tiếp sang thanh toán.
- Đổi địa chỉ phải tính lại phí vận chuyển và tổng tiền; hiển thị trạng thái đang tính. Buyer xác nhận tổng mới trước khi thanh toán.

Bố cục desktop: bên trái là địa chỉ, sản phẩm nhóm theo người bán, ghi chú và phương thức thanh toán; bên phải là tiền hàng, phí giao, tổng thanh toán và nút “Đặt hàng và thanh toán”. Mobile dùng một cột, thanh tổng tiền cuối màn hình không che nội dung.

Tên, điện thoại và địa chỉ được **chụp lại trong đơn tại checkout**. Sau khi đã tạo liên kết thanh toán, MVP không cho sửa trực tiếp địa chỉ/tổng tiền trên đơn đó. Buyer quay lại checkout mới hoặc yêu cầu hỗ trợ; việc vô hiệu hóa lần thanh toán cũ và kiểm tra đã trả tiền do BE xử lý.

## 6. PayOS: phạm vi phù hợp đồ án

**Khuyến nghị dùng trang thanh toán do PayOS cung cấp ở MVP.** BE tạo liên kết, FE chuyển đến `checkoutUrl`. Cách này giảm phần giao diện thanh toán cần tự xây; PayOS có hướng dẫn hosted checkout chính thức: https://payos.vn/docs/checkout/quick-start-payos-hosted-page/

Trên Nexus hiển thị lựa chọn “Chuyển khoản qua PayOS”, mô tả ngắn và tổng tiền. Không liệt kê thẻ, ví hoặc COD như phương thức dùng được nếu chưa tích hợp/chốt hỗ trợ.

Phân công:

1. FE gửi sản phẩm, số lượng, địa chỉ đã chọn hoặc địa chỉ dùng một lần và khóa chống gửi lặp.
2. BE xác minh Buyer, tồn kho, giá hiện tại, phí giao và tổng tiền; tạo đơn chờ thanh toán cùng thời hạn giữ hàng theo chính sách nhóm.
3. BE tạo payment attempt, gọi PayOS bằng thông tin do server tính, trả `orderId`, `paymentAttemptId`, `checkoutUrl`, thời hạn và tổng tiền đã xác nhận.
4. FE chuyển đến PayOS. Không đặt API key/checksum key trong biến `NEXT_PUBLIC_*` hoặc trong trình duyệt.
5. Khi quay về Nexus, FE gọi BE lấy trạng thái. Query trên `returnUrl`/`cancelUrl` chỉ là tín hiệu điều hướng, không đủ căn cứ ghi nhận đã thanh toán.
6. BE xác minh webhook, đối chiếu mã thanh toán, số tiền và đơn, xử lý lặp an toàn; BE cập nhật trạng thái đã thanh toán rồi FE hiển thị kết quả.

PayOS có return/cancel URL và webhook trong luồng tích hợp. Tài liệu tham chiếu: https://payos.vn/docs/du-lieu-tra-ve/return-url/ và https://payos.vn/docs/checkout/how-checkout-works/. Việc kiểm tra chữ ký và các trường tạo liên kết cần bám API chính thức: https://payos.vn/docs/api/.

### Trang kết quả và thanh toán tiếp

Đề xuất `/checkout/result?orderId=...`; trang chỉ đọc trạng thái qua BE và kiểm tra quyền sở hữu.

| Tình huống                                 | UI đề xuất                                      | Quy tắc                                                                                          |
| ------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| BE xác nhận đã trả tiền                    | “Thanh toán thành công”, mã đơn, “Xem đơn hàng” | Không chỉ dựa URL trở về                                                                         |
| Đang chờ xác nhận                          | “Đang xác nhận thanh toán”, nút kiểm tra lại    | Poll có giới hạn/backoff, dừng khi rời trang; quá thời gian chờ vẫn giữ trạng thái chưa xác nhận |
| Buyer đóng tab PayOS                       | Đơn vẫn nằm ở mục Chờ thanh toán                | Có “Thanh toán tiếp” nếu BE xác nhận còn hiệu lực                                                |
| Quay về từ cancel URL                      | Hiển thị kết quả BE, thường là chưa thanh toán  | Không tự coi đơn đã hủy; hủy thanh toán và hủy đơn là hai thao tác khác nhau                     |
| Liên kết hết hạn                           | Thông báo hết hạn, tạo lại khi còn đủ điều kiện | BE kiểm tra tồn kho, giá, thời hạn đơn; không tự gia hạn phía FE                                 |
| Đã chuyển tiền nhưng BE chưa xác nhận      | Giữ mã đơn, cho kiểm tra lại/liên hệ hỗ trợ     | Không khuyến khích chuyển tiền lần hai                                                           |
| Webhook lặp hoặc đến muộn sau thao tác hủy | UI lấy kết quả xử lý từ BE                      | BE xử lý race và đưa trường hợp bất thường sang đối soát; không làm mất dấu giao dịch            |

Giỏ hàng chỉ loại đúng các dòng thuộc đơn đã được BE xác nhận thanh toán, không xóa hàng Buyer mới thêm sau đó. Reload hoặc quay lại trang kết quả không được tạo đơn mới.

## 7. Nhiều người bán và hàng đấu giá

### Hàng mua ngay

**Đề xuất MVP: một người bán cho mỗi lần checkout và thanh toán.** Giỏ hàng vẫn có nhiều người bán, chia nhóm và có nút thanh toán riêng từng nhóm. Phí giao, đơn hàng và giao dịch PayOS của mỗi nhóm được theo dõi riêng. Giao diện phải nói rõ các nhóm còn lại chưa được thanh toán.

Thanh toán một lần cho nhiều người bán cần thiết kế nhóm đơn, phân bổ phí và hoàn tiền từng phần; đề xuất để giai đoạn sau. Không âm thầm tách đơn sau khi Buyer đã xác nhận một tổng tiền khác.

### Trúng đấu giá

- BE chốt người thắng và tạo nghĩa vụ/đơn trúng đấu giá; FE không tự suy ra thắng chỉ từ bộ đếm thời gian.
- Buyer xem ở Đơn mua → Chờ thanh toán → bổ sung/chọn địa chỉ → xem phí giao → thanh toán PayOS.
- Giá thắng và số lượng do BE xác định, không chỉnh như giỏ mua ngay. Không gộp đơn đấu giá vào giỏ hàng thông thường trong MVP.
- Hạn trả tiền và xử lý không thanh toán phải bám cấu hình/SRS đã duyệt. Nếu chưa có quy định, giữ là điểm cần nhóm chốt, không tự áp dụng phạt uy tín.

### Tài khoản nhận tiền

Nhóm cần chốt tài khoản PayOS thuộc Nexus hay từng Seller. MVP đề xuất một kênh thanh toán do nhóm quản lý cho luồng demo có kiểm soát. Cơ chế chia tiền/đối soát cho Seller và hoàn tiền là phạm vi nghiệp vụ riêng; không coi tạo link PayOS là đã hoàn thành phần này.

## 8. Màn hình FE dự kiến

| Vị trí                        | Nội dung bổ sung                                                  |
| ----------------------------- | ----------------------------------------------------------------- |
| `/register`                   | Điện thoại liên hệ và bước thêm địa chỉ sau đăng ký               |
| `/account`                    | Hồ sơ liên hệ, link tới sổ địa chỉ                                |
| `/account/addresses`          | Danh sách, thêm, sửa, xóa, chọn mặc định                          |
| `/cart`                       | Nhóm hàng theo Seller; checkout từng nhóm                         |
| `/checkout`                   | Tự điền địa chỉ, Dialog chọn/thêm địa chỉ, phí giao và PayOS      |
| `/checkout/result`            | Đang xác nhận, thành công, chưa thanh toán, hết hạn và cách xử lý |
| `/account/orders` và chi tiết | Chờ thanh toán, thanh toán tiếp, xem địa chỉ chụp theo đơn        |

Dùng Button/Input/Select/Dialog/RadioGroup của hệ thống shadcn/ui hiện có hoặc bổ sung component còn thiếu. Giữ màu thương hiệu, chữ rõ; lỗi hiển thị cạnh trường, focus vào lỗi đầu; tránh tự đóng form làm mất dữ liệu. Không mở đồng thời nhiều Dialog chồng nhau. Nhãn trạng thái có chữ, không chỉ đổi màu.

## 9. API cần thống nhất với BE

Đây là **contract đề xuất**, không khẳng định đã có. Các đường dẫn dưới đây tính tương đối từ Gateway `/api/v1`.

| Ưu tiên | API đề xuất                                        | Nội dung cần BE cung cấp                                                                       |
| ------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| P0      | `POST /auth/register` mở rộng                      | Nhận phone; thống nhất validation và kết quả tạo tài khoản                                     |
| P0      | `GET /users/profile`, `PATCH /users/profile`       | Đọc/cập nhật liên hệ của chính tài khoản; chốt chính sách thay email/điện thoại                |
| P0      | `GET /users/me/addresses`                          | Danh sách địa chỉ, mã địa danh, mặc định                                                       |
| P0      | `POST /users/me/addresses`                         | Tạo địa chỉ với ownership từ JWT                                                               |
| P0      | `PATCH /users/me/addresses/:id`                    | Sửa địa chỉ của chính mình; kiểm soát cập nhật đồng thời                                       |
| P0      | `DELETE /users/me/addresses/:id`                   | Xóa, giữ nguyên snapshot đơn cũ; xử lý mặc định thay thế                                       |
| P0      | `PUT /users/me/addresses/:id/default`              | Đổi mặc định trong giao dịch atomic, chỉ một mặc định                                          |
| P0      | `GET /locations?...` hoặc nguồn địa chỉ thống nhất | Mã và tên đơn vị địa chỉ, phụ thuộc các cấp, phiên bản dữ liệu                                 |
| P0      | `POST /checkout/quote`                             | Kiểm tra hàng/Seller/địa chỉ, tính tiền hàng + phí giao; trả hạn và phiên bản quote            |
| P0      | `POST /orders/checkout` hoàn thiện                 | Buyer auth; kiểm tra lại quote; snapshot địa chỉ; tạo đơn và payment attempt idempotent        |
| P0      | `POST /orders/:id/payment-link`                    | Lấy lại/tạo lần thanh toán hợp lệ; chặn đơn đã trả tiền hoặc hết quyền thanh toán              |
| P0      | `GET /orders/:id/payment-status`                   | Trạng thái chuẩn hóa, số tiền, thời hạn, quyền thanh toán tiếp và thông tin đối soát tối thiểu |
| P0      | `POST /payments/payos/webhook`                     | Endpoint server nhận PayOS, xác minh chữ ký, chống xử lý trùng và đối chiếu số tiền            |
| P0      | `GET /orders` và `GET /orders/:id` hoàn thiện      | Buyer chỉ xem đơn mình; trả thông tin liên hệ snapshot và trạng thái đơn/thanh toán riêng      |
| P1      | Settlement Auction → Commerce                      | Đơn trúng đấu giá, người thắng, số tiền và hạn thanh toán do BE xác nhận                       |

User Service sở hữu hồ sơ/sổ địa chỉ; Commerce sở hữu đơn/payment attempt/tích hợp PayOS; Fulfillment cung cấp tính phí và giao hàng theo contract thống nhất; Gateway nối các endpoint. FE không gọi thẳng DB hoặc PayOS Merchant API có khóa bí mật.

Khi chia việc, BE cần trả mẫu response và mã lỗi cho: địa chỉ không hợp lệ, ngoài vùng giao, giá đổi, hết hàng, quote hết hạn, đơn đã thanh toán, trùng request và thiếu quyền. Không đánh dấu API hoàn thành chỉ vì đã có route.

## 10. Các trường hợp cần nghiệm thu sau khi code

1. Buyer đăng ký mới, thêm địa chỉ; checkout tự điền đúng người nhận và điện thoại.
2. Bỏ qua địa chỉ khi đăng ký; vẫn duyệt hàng, nhưng phải thêm địa chỉ trước khi trả tiền.
3. Thêm địa chỉ thứ hai, chọn cho một đơn; địa chỉ mặc định không bị đổi nếu không chọn đặt mặc định.
4. Sửa/xóa địa chỉ trong sổ; đơn đã tạo vẫn giữ snapshot cũ.
5. Đổi địa chỉ checkout làm phí giao đổi; Buyer thấy và xác nhận tổng mới.
6. Đổi tài khoản trên cùng trình duyệt: không thấy sổ địa chỉ/đơn/giỏ của Buyer khác.
7. Admin/Seller/Support được xem hàng nhưng không được tạo đơn Buyer; BE chặn cả request gọi trực tiếp.
8. Nhấn thanh toán nhiều lần hoặc retry sau timeout: không tạo đơn/giao dịch trùng.
9. Tự sửa query `status=PAID`: không làm UI hay BE ghi nhận trả tiền thành công.
10. Thanh toán thành công nhưng không quay về trang: webhook vẫn cập nhật đơn; mở Đơn mua thấy trạng thái đúng.
11. Đóng/hủy trang PayOS, hết hạn, webhook chậm/lặp: có hướng xử lý rõ; không yêu cầu trả tiền hai lần.
12. Giỏ có hai Seller: thanh toán nhóm A không xóa hoặc ghi nhận thanh toán nhóm B.
13. Buyer khác truy cập URL đơn/address ID: BE từ chối; FE không hiển thị dữ liệu nhạy cảm.
14. Đơn trúng đấu giá chỉ người thắng được thanh toán, giữ nguyên giá thắng.

## 11. Thứ tự làm và lựa chọn cần duyệt

1. Chốt dữ liệu điện thoại/địa chỉ và ownership; làm hồ sơ + sổ địa chỉ.
2. Làm chọn địa chỉ tại checkout và quote thật, xử lý thay đổi tổng tiền.
3. Hoàn thiện tạo đơn chờ thanh toán, PayOS link, webhook và trang kết quả.
4. Hoàn thiện đơn mua/thanh toán tiếp; sau đó nối đơn trúng đấu giá.

Phương án khuyến nghị để duyệt:

- Đăng ký hai bước, địa chỉ có thể bổ sung sau nhưng bắt buộc trước checkout.
- Tối đa 5 địa chỉ, một mặc định, hỗ trợ địa chỉ dùng một lần.
- Điện thoại người nhận và email tài khoản là hai kênh liên hệ chính; chưa thêm Zalo/chat/OTP vào MVP khi chưa có dịch vụ.
- Thanh toán bằng trang PayOS hosted, một Seller mỗi lần thanh toán.
- Bắt đầu với hàng mua ngay, sau đó dùng lại luồng payment cho đơn trúng đấu giá.
- Xác nhận kênh PayOS/tài khoản nhận tiền, nguồn dữ liệu địa danh, chính sách phí giao/giữ hàng/hạn trả tiền và môi trường thử nghiệm trước khi triển khai giao dịch thật.

Sau khi người dùng và nhóm duyệt ý tưởng mới chuyển sang code và chốt contract BE. Tài liệu này không thực hiện migration, không tạo giao dịch PayOS và không thay đổi giao diện đang chạy.
