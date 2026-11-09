# Báo Cáo Triển Khai Frontend: Hoàn Thiện Nghiệp Vụ Hậu Mãi & Hỗ Trợ (Support & Post-Checkout)

> **Nhánh (Branch):** `feat/fe-support-disputes-refund-rto`  
> **Phân hệ:** Hỗ trợ & Vận hành (Support Staff / Post-Checkout Lifecycle)  
> **Ngày hoàn thành:** 09/11/2026  
> **Trạng thái Build:** ✅ Build Next.js 15 và kiểm tra Typecheck đạt 100% không lỗi.

---

## 1. TỔNG QUAN ĐỢT TRIỂN KHAI

Đợt cập nhật này hoàn thành **4 Task trọng tâm (Nhóm P0)** kết nối toàn diện giao diện Frontend với các API Backend mới nhất vừa được bổ sung trên `origin/main` (commit `7b027f6`), giải quyết triệt để các điểm nghẽn trong luồng sau checkout và khiếu nại tranh chấp theo chuẩn SRS 2.3, 2.7, 3.1.2 & 3.6.

### Bảng cập nhật tiến độ Frontend (Đối chiếu với Backend):

|  STT  | Nghiệp vụ                                          | Backend | Frontend trước | Frontend hiện tại |    Trạng thái     |
| :---: | :------------------------------------------------- | :-----: | :------------: | :---------------: | :---------------: |
| **1** | Hàng đợi Tranh chấp Trọng tài (Disputes SLA)       |  100%   |       0%       |     **100%**      | ✅ **Hoàn thành** |
| **2** | Hoàn tiền tự động PayOS trên Đơn hàng              |  100%   |      30%       |     **100%**      | ✅ **Hoàn thành** |
| **3** | Thử lại giao hàng & Chuyển hoàn (Redelivery & RTO) |  100%   |      20%       |     **100%**      | ✅ **Hoàn thành** |
| **4** | Trừ điểm uy tín & Khóa tính năng (Penalty Modal)   |  100%   |       0%       |     **100%**      | ✅ **Hoàn thành** |

---

## 2. CHI TIẾT CÁC TÍNH NĂNG VÀ VỊ TRÍ GIAO DIỆN MỚI

### Task 1: Màn hình Phân xử Tranh chấp Trọng tài (Dispute Arbitration Screen)

- **URL truy cập:** `/support/disputes` (Đã thêm shortcut trên Sidebar điều hướng Support và Dashboard).
- **API Backend kết nối:**
  - `GET /api/v1/support/disputes`: Lấy danh sách tranh chấp kèm đếm ngược giờ SLA.
  - `POST /api/v1/support/disputes/:caseId/verdict`: Ban hành phán quyết trọng tài.
- **Giao diện vừa thêm:**
  1. Thẻ chỉ số tổng quan: _Chờ phân xử_, _Cận / Quá hạn SLA (cảnh báo đỏ)_, _Đã giải quyết_.
  2. Bảng hồ sơ có Badge đếm ngược: `⏳ Còn X giờ` hoặc `⚠️ Quá hạn SLA` trực quan theo thời gian thực.
  3. Modal Trọng tài Phân xử chi tiết:
     - **Đối chiếu bằng chứng 2 cột (Dual Evidence Side-by-side):** Cột trái là lý do + ảnh chụp hàng lỗi của Người mua; Cột phải là lời giải trình + video/ảnh đóng hàng 3 lớp của Người bán.
     - **Lightbox phóng to ảnh:** Bấm vào ảnh bằng chứng bất kỳ để xem kích thước lớn.
     - **Khung ban hành phán quyết:** 3 lựa chọn phán quyết (`REFUND_BUYER` - Hoàn tiền, `REJECT_BUYER` - Bác bỏ khiếu nại, `REQUIRE_RETURN_FIRST` - Buộc gửi trả hàng), chọn bên chịu chi phí (`SELLER` | `BUYER` | `CARRIER`), nhập số tiền hoàn và ghi chú lưu audit log.

---

### Task 2: Kích hoạt Hoàn tiền tự động PayOS trên Chi tiết đơn hàng

- **URL truy cập:** `/support/orders/[id]`
- **API Backend kết nối:**
  - `POST /api/v1/orders/:id/refund/execute`: Kích hoạt PayOS Gateway hoàn tiền thật về tài khoản/thẻ khách hàng.
  - `GET /api/v1/orders/:id/refund/status`: Tra cứu trạng thái giao dịch hoàn tiền.
- **Giao diện vừa thêm/cập nhật:**
  1. Khi bấm **"Xử lý hoàn tiền"**, trong Dialog có thêm:
     - Checkbox: **"Kích hoạt hoàn tiền tự động qua cổng PayOS (VietQR)"** (Mặc định bật).
     - Ô nhập: **"Số tiền hoàn (₫)"** (Hỗ trợ hoàn toàn phần hoặc hoàn một phần - Partial Refund).
  2. Khối thông báo xanh lá sau khi hoàn tất: Hiển thị _Mã giao dịch hoàn tiền PayOS (`refundTransactionId`)_, _Số tiền đã hoàn_ và thời gian hoàn tất trên timeline đơn hàng.

---

### Task 3: Modal Trừ điểm uy tín & Khóa tính năng vi phạm (Penalty Modal)

- **URL truy cập:** `/support/users` (Chọn xem chi tiết một Người mua hoặc Người bán).
- **API Backend kết nối:**
  - `POST /api/v1/users/:id/adjust-reputation`: Cộng/trừ điểm uy tín kèm lý do vi phạm.
  - `POST /api/v1/users/:id/restrict-features`: Áp dụng hạn chế tính năng có thời hạn.
- **Giao diện vừa thêm:**
  1. Bổ sung nút hành động mới: **`⚖️ Chế tài / Xử phạt`** cạnh nút Khóa tài khoản.
  2. Modal Chế tài 2 Tab:
     - **Tab 1 — Điều chỉnh Điểm uy tín:** Nhập số điểm trừ/thưởng (ví dụ: `-10` điểm vì bom hàng đấu giá, `-5` điểm vì hết hàng tự hủy đơn) + Lý do (bắt buộc). Điểm số trên giao diện cập nhật ngay lập tức.
     - **Tab 2 — Khóa tính năng vi phạm:** Lựa chọn chế tài:
       - `BIDDING_LOCK`: Chặn tham gia đấu giá
       - `LISTING_LOCK`: Chặn đăng bán sản phẩm mới
       - `PAYMENT_RESTRICTION`: Chặn thanh toán COD (buộc thanh toán online)
       - `FULL_RESTRICTION`: Hạn chế toàn bộ giao dịch
       - Nhập thời hạn áp dụng (số ngày) và căn cứ xử lý.

---

### Task 4: Nghiệp vụ Hẹn phát lại (Redelivery) & Nghiệm thu Chuyển hoàn (RTO)

- **URL truy cập:** `/support/shipments` (Chọn xem chi tiết một vận đơn).
- **API Backend kết nối:**
  - `POST /api/v1/fulfillment/shipments/:id/request-redelivery`: Yêu cầu hãng vận chuyển hẹn phát lại (tối đa 3 lần).
  - `POST /api/v1/fulfillment/shipments/:id/confirm-return`: Nghiệm thu hàng hoàn về kho người bán.
- **Giao diện vừa thêm:**
  1. Khi vận đơn có trạng thái **Giao hàng thất bại (`FAILED`)**:
     - Nút **`↻ Hẹn phát lại hàng`** $\rightarrow$ Mở Popup chọn hãng vận chuyển, ngày hẹn phát lại tiếp theo và ghi chú thỏa thuận với khách.
  2. Khi vận đơn thất bại lần 3 hoặc đang chuyển hoàn (`FAILED` / `RETURNED` / `RETURNING`):
     - Nút **`📦 Nghiệm thu hàng hoàn (RTO)`** $\rightarrow$ Mở Popup nghiệm thu: Chọn tình trạng kiện hàng (`INTACT` nguyên seal, `DAMAGED` hư hỏng vỏ hộp, `LOST` thất lạc linh kiện) và ghi nhận thời điểm nhận lại tại kho để đóng hồ sơ vận đơn.

---

## 3. DANH SÁCH FILE THAY ĐỔI & THÊM MỚI

```
frontend/
├── docs/
│   └── README.md                                                        [Tạo mới: Báo cáo triển khai]
└── web/
    └── src/
        ├── app/
        │   └── support/
        │       └── disputes/
        │           └── page.tsx                                         [Tạo mới: Route trang Trọng tài tranh chấp]
        └── modules/
            ├── commerce/
            │   └── api/orders.api.ts                                    [Cập nhật: DTO & executeRefund, getRefundStatus]
            ├── fulfillment/
            │   └── api/shipments.api.ts                                 [Cập nhật: requestRedelivery, confirmReturn]
            ├── user/
            │   └── api/user.api.ts                                      [Cập nhật: adjustReputation, restrictFeatures]
            └── support/
                ├── api/support.api.ts                                   [Cập nhật: DisputeItem, listDisputes, issueVerdict]
                ├── components/support-shell.tsx                         [Cập nhật: Thêm menu Trọng tài tranh chấp]
                └── screens/
                    ├── support-dashboard.tsx                            [Cập nhật: Shortcut Trọng tài tranh chấp]
                    ├── support-disputes-page.tsx                        [Tạo mới: Màn hình Phân xử Tranh chấp SLA]
                    ├── support-order-detail-page.tsx                    [Cập nhật: Modal Hoàn tiền tự động PayOS]
                    ├── support-shipments-page.tsx                       [Cập nhật: Modal Hẹn phát lại & Nghiệm thu RTO]
                    └── support-users-page.tsx                           [Cập nhật: Modal Chế tài xử phạt uy tín]
```

---

## 4. LỊCH SỬ COMMITS TRÊN NHÁNH

1. `5c67e6f` — `feat(web): add PayOS automatic refund execution and refund transaction status tracking`
2. `4f97000` — `feat(web): add shipment redelivery and RTO return confirmation modals for support`
3. `cef63a4` — `feat(web): add user reputation adjustment and feature restrictions penalty modal`
4. `4621221` — `feat(web): add dispute arbitration screen with SLA timer and dual evidence preview`
