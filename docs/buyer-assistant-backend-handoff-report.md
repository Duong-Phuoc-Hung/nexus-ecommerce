# Báo Cáo Hoàn Thiện Backend — Trợ Lý Nexus & Chat Service (Phần 4 Bàn Giao)

> **Người thực hiện:** Đào Lý Phi Hùng  
> **Người đối soát / Review MR:** Dương Phước Hưng  
> **Nhánh Git:** `feat/be-commerce-buyer-extensions`  
> **Phạm vi tác động:** `backend/chat-service`, `backend/fulfillment-service`, `backend/api-gateway`

---

## 1. Tóm tắt kết quả triển khai 6 hạng mục tại Phần 4

Toàn bộ 6 hạng mục kỹ thuật được yêu cầu trong tài liệu bàn giao giao diện Buyer Assistant đã được triển khai đầy đủ trên môi trường local, tuân thủ kiến trúc Clean Architecture / DDD hiện hữu của dự án.

|  STT  | Hạng mục yêu cầu                                            | Kết quả triển khai                                                                                                                                                                                                                                                                       |  Trạng thái   |
| :---: | :---------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-----------: |
| **1** | **Chuyển DB In-Memory sang PostgreSQL thật**                | Xây dựng `PostgresConversationRepository` và `PostgresChatMessageRepository` kết nối `nexus_chat_db` (Port 5438) qua `pg` pool. Tự động chuyển đổi In-Memory khi chạy unit test (`NODE_ENV === 'test'`).                                                                                 | ✅ Hoàn thành |
| **2** | **Sửa `OrderTrackingTool.ts`**                              | Sửa URL gọi chuẩn sang Fulfillment: `/api/v1/fulfillments/shipments/by-order/:id?readOnly=true`. Thêm Anti-IDOR (`buyerId`). Bỏ sinh dữ liệu vận đơn giả khi trả 404 / lỗi kết nối.                                                                                                      | ✅ Hoàn thành |
| **3** | **API Upload file bằng chứng (`POST .../attachments`)**     | Thêm mới endpoint `POST /api/v1/chat/conversations/:id/attachments` (và alias `/sessions/:id/attachments`). Validate MIME (`JPG, PNG, WEBP, PDF, MP4`), chặn file $> 20MB$.                                                                                                              | ✅ Hoàn thành |
| **4** | **Đánh số `seq`, phân trang `before` & API `PUT .../read`** | • Tự tăng `seq = 1, 2, 3...` trên từng tin nhắn.<br>• Phân trang `GET .../messages?before=<seq>` tải tin nhắn cũ.<br>• Chống spam trùng tin nhắn bằng `clientMessageId`.<br>• Endpoint mới `PUT /api/v1/chat/conversations/:id/read` lưu `buyerLastReadSeq` và `counterpartLastReadSeq`. | ✅ Hoàn thành |
| **5** | **Kết nối `EscalateDispute` sang Hàng đợi CSKH**            | • Hỗ trợ tiếp nhận mảng `sharedMessages` (tin nhắn chọn lọc từ kênh Seller).<br>• Chặn gửi tin (`403/409`) khi phòng chat đã ở trạng thái `CLOSED`.<br>• Bổ sung API `POST /api/v1/support/cases` ở `fulfillment-service` để lưu ticket khiếu nại.                                       | ✅ Hoàn thành |
| **6** | **Nâng cấp AI Bot tiếp nhận Context từ Frontend**           | Mở rộng DTO `SendMessageInput` nhận `context?: { pageKind, productId, auctionId, orderId }`. Cả `RuleBasedLlmProvider` và `GeminiLlmProvider` đều sử dụng ngữ cảnh để trả lời bám sát trang đang xem.                                                                                    | ✅ Hoàn thành |

---

## 2. Danh sách file đã tạo mới và chỉnh sửa

### A. File tạo mới:

1. `backend/chat-service/src/infrastructure/database/PostgresChatRepositories.ts`: Repository giao tiếp PostgreSQL thật với `nexus_chat_db`.
2. `backend/chat-service/src/buyer-assistant-extensions.test.ts`: Bộ 9 test case tự động bao phủ trọn vẹn 6 tính năng mới.
3. `docs/buyer-assistant-backend-handoff-report.md`: Báo cáo kỹ thuật chi tiết phục vụ đối soát MR.

### B. File chỉnh sửa:

1. `backend/chat-service/src/domain/entities/ChatMessage.ts`: Thêm thuộc tính `seq`, `clientMessageId`.
2. `backend/chat-service/src/domain/entities/Conversation.ts`: Thêm `lastSeq`, `buyerLastReadSeq`, `counterpartLastReadSeq`, phương thức `markRead()`, `isClosed()`.
3. `backend/chat-service/src/domain/repositories/IChatMessageRepository.ts`: Bổ sung `getNextSeq()`, `findByClientMessageId()`, tham số `beforeSeq`.
4. `backend/chat-service/src/infrastructure/database/InMemoryChatRepositories.ts`: Cập nhật logic lọc theo `beforeSeq`, quản lý `seq` tự tăng.
5. `backend/chat-service/src/application/dtos/ChatDtos.ts`: Thêm `ChatPageContext`, `clientMessageId`, `sharedMessages`.
6. `backend/chat-service/src/application/ports/ILanguageModelProvider.ts`: Thêm `pageContext` vào `ChatContext`.
7. `backend/chat-service/src/application/tools/OrderTrackingTool.ts`: Bỏ trả dữ liệu giả, gọi đúng prefix Fulfillment, bổ sung Anti-IDOR.
8. `backend/chat-service/src/application/use-cases/SendMessageUseCase.ts`: Chống trùng `clientMessageId`, tự tăng `seq`, chặn chat khi `CLOSED`.
9. `backend/chat-service/src/application/use-cases/EscalateDisputeUseCase.ts`: Tiếp nhận và đóng gói `sharedMessages`.
10. `backend/chat-service/src/infrastructure/ai/RuleBasedLlmProvider.ts`: Tích hợp ngữ cảnh `pageKind` (Cart, Product, Checkout).
11. `backend/chat-service/src/interfaces/http/controllers/ChatController.ts`: Bổ sung `uploadAttachment`, `markAsRead`, phân trang `before`.
12. `backend/chat-service/src/interfaces/http/routes/ChatRoutes.ts`: Đăng ký `POST .../attachments` và `PUT .../read`.
13. `backend/chat-service/src/app.ts`: Cấu hình Persistence Repository với fallback In-Memory an toàn.
14. `backend/fulfillment-service/src/domain/repositories/ISupportCaseRepository.ts` & `SupportCaseController.ts`: Thêm endpoint `POST /api/v1/support/cases`.
15. `backend/fulfillment-service/src/interfaces/http/routes/SupportCaseRoutes.ts`: Đăng ký route `POST /cases`.
16. `backend/api-gateway/src/app.ts`: Đăng ký proxy `/api/v1/support` và `/api/v1/cart`.

---

## 3. Kết quả kiểm thử tự động (Unit & Integration Tests)

- **`chat-service`:** **40/40 tests PASS (100%)**
  - 31/31 test cũ: Hoàn toàn không bị hồi quy (regression-free).
  - 9/9 test mới trong `buyer-assistant-extensions.test.ts`: PASS 100%.
- **`fulfillment-service`:** **17/17 tests PASS (100%)**
- **`commerce-service`:** **31/31 tests PASS (100%)**

---

## 4. Hướng dẫn kiểm tra trên Local

1. Khởi động các service:
   ```bash
   pnpm dev:all
   ```
2. Thử nghiệm các API mới qua cURL / Postman:
   - **Upload file bằng chứng:**
     `POST http://localhost:4000/api/v1/chat/conversations/:id/attachments`
   - **Đánh dấu đã xem:**
     `PUT http://localhost:4000/api/v1/chat/conversations/:id/read` với `{ "lastReadSeq": 5 }`
   - **Phân trang tin nhắn cũ:**
     `GET http://localhost:4000/api/v1/chat/conversations/:id/messages?before=5&limit=10`
   - **Tạo hồ sơ Support Case trực tiếp:**
     `POST http://localhost:4000/api/v1/support/cases`
