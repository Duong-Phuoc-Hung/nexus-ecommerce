import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from './app';

function makeAuthHeaders(userId: string, role: string, email?: string) {
  return {
    'Content-Type': 'application/json',
    'x-user-id': userId,
    'x-user-role': role,
    'x-user-email': email || `${userId}@nexus.com`,
  };
}

test('Chat Service: Health Endpoint', async () => {
  const app = createApplication();
  const server = app.listen(0);
  const port = (server.address() as any).port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(res.status, 200);
    const body: any = await res.json();
    assert.equal(body.status, 'UP');
    assert.equal(body.service, 'chat-service');
  } finally {
    server.close();
  }
});

test('🎯 [NGHIỆM THU 1] Chat trực tiếp + Tra vận đơn (Kịch bản A: Đơn đến đâu?)', async () => {
  const app = createApplication();
  const server = app.listen(0);
  const port = (server.address() as any).port;

  const buyerA = { id: 'usr_buyer_alice', role: 'BUYER' };
  const sellerB = { id: 'usr_seller_bob', role: 'SELLER' };
  const buyerC = { id: 'usr_buyer_charlie', role: 'BUYER' };
  const orderId = 'NX-ORD-8021';

  try {
    // 1. Buyer A mở kênh AI_BOT và hỏi "Đơn hàng của tôi đến đâu rồi?"
    const openAiRes = await fetch(`http://127.0.0.1:${port}/api/v1/chat/conversations`, {
      method: 'POST',
      headers: makeAuthHeaders(buyerA.id, buyerA.role),
      body: JSON.stringify({
        orderId,
        channelType: 'AI_BOT',
        sellerId: sellerB.id,
      }),
    });
    assert.equal(openAiRes.status, 200);
    const aiConvData = (await openAiRes.json()) as any;
    const aiConvId = aiConvData.data.id;
    assert.ok(aiConvId);

    // Gửi tin nhắn hỏi vận đơn tới AI
    const sendAiRes = await fetch(
      `http://127.0.0.1:${port}/api/v1/chat/conversations/${aiConvId}/messages`,
      {
        method: 'POST',
        headers: makeAuthHeaders(buyerA.id, buyerA.role),
        body: JSON.stringify({
          content: 'Đơn hàng NX-ORD-8021 của tôi đến đâu rồi?',
        }),
      },
    );
    assert.equal(sendAiRes.status, 201);
    const aiMsgBody = (await sendAiRes.json()) as any;
    // Xác nhận AI tự động gọi OrderTrackingTool và phản hồi lộ trình
    assert.ok(aiMsgBody.data.reply);
    assert.equal(aiMsgBody.data.reply.senderRole, 'AI');
    assert.ok(aiMsgBody.data.reply.content.includes('NX-ORD-8021'));
    assert.ok(aiMsgBody.data.reply.content.includes('GHN'));

    // 2. Buyer A mở kênh BUYER_SELLER và nhắn tin cho Seller B
    const openSellerRes = await fetch(`http://127.0.0.1:${port}/api/v1/chat/conversations`, {
      method: 'POST',
      headers: makeAuthHeaders(buyerA.id, buyerA.role),
      body: JSON.stringify({
        orderId,
        channelType: 'BUYER_SELLER',
        sellerId: sellerB.id,
      }),
    });
    assert.equal(openSellerRes.status, 200);
    const sellerConvId = ((await openSellerRes.json()) as any).data.id;

    // Buyer nhắn tin
    await fetch(`http://127.0.0.1:${port}/api/v1/chat/conversations/${sellerConvId}/messages`, {
      method: 'POST',
      headers: makeAuthHeaders(buyerA.id, buyerA.role),
      body: JSON.stringify({ content: 'Shop ơi hàng này được bảo hành bao lâu?' }),
    });

    // Seller B đọc tin nhắn và phản hồi lại
    const sellerReadRes = await fetch(
      `http://127.0.0.1:${port}/api/v1/chat/conversations/${sellerConvId}/messages`,
      {
        headers: makeAuthHeaders(sellerB.id, sellerB.role),
      },
    );
    assert.equal(sellerReadRes.status, 200);
    const sellerMsgs = ((await sellerReadRes.json()) as any).data;
    assert.equal(sellerMsgs.length, 1);
    assert.equal(sellerMsgs[0].content, 'Shop ơi hàng này được bảo hành bao lâu?');

    // Seller B phản hồi
    const sellerReplyRes = await fetch(
      `http://127.0.0.1:${port}/api/v1/chat/conversations/${sellerConvId}/messages`,
      {
        method: 'POST',
        headers: makeAuthHeaders(sellerB.id, sellerB.role),
        body: JSON.stringify({ content: 'Dạ sản phẩm chính hãng bảo hành 12 tháng bạn nhé!' }),
      },
    );
    assert.equal(sellerReplyRes.status, 201);

    // 3. Buyer A mở kênh BUYER_SUPPORT (Khiếu nại riêng tư)
    const openSupportRes = await fetch(`http://127.0.0.1:${port}/api/v1/chat/conversations`, {
      method: 'POST',
      headers: makeAuthHeaders(buyerA.id, buyerA.role),
      body: JSON.stringify({
        orderId,
        channelType: 'BUYER_SUPPORT',
        sellerId: sellerB.id,
      }),
    });
    assert.equal(openSupportRes.status, 200);
    const supportConvId = ((await openSupportRes.json()) as any).data.id;

    // Buyer A gửi tin nhắn riêng cho Support Staff
    await fetch(`http://127.0.0.1:${port}/api/v1/chat/conversations/${supportConvId}/messages`, {
      method: 'POST',
      headers: makeAuthHeaders(buyerA.id, buyerA.role),
      body: JSON.stringify({ content: 'Tôi muốn khiếu nại shop vì giao thiếu phụ kiện.' }),
    });

    // Seller B CỐ Ý truy cập vào kênh BUYER_SUPPORT -> PHẢI BỊ CHẶN 403 FORBIDDEN
    const sellerSneakRes = await fetch(
      `http://127.0.0.1:${port}/api/v1/chat/conversations/${supportConvId}/messages`,
      {
        headers: makeAuthHeaders(sellerB.id, sellerB.role),
      },
    );
    assert.equal(sellerSneakRes.status, 403, 'Seller không được phép xem nội dung kênh Support');

    // 4. Buyer C (người lạ) cố ý đổi ID để đọc trộm hội thoại của Buyer A -> PHẢI BỊ CHẶN 403 FORBIDDEN (Anti-IDOR)
    const strangerRes = await fetch(
      `http://127.0.0.1:${port}/api/v1/chat/conversations/${supportConvId}/messages`,
      {
        headers: makeAuthHeaders(buyerC.id, buyerC.role),
      },
    );
    assert.equal(strangerRes.status, 403, 'Buyer khác đổi ID trên URL phải bị chặn Anti-IDOR');

    // 5. Kiểm tra Polling tin nhắn với ?after=<timestamp>
    const firstMsgTime = new Date(sellerMsgs[0].createdAt).getTime();
    const pollRes = await fetch(
      `http://127.0.0.1:${port}/api/v1/chat/conversations/${sellerConvId}/messages?after=${firstMsgTime}`,
      {
        headers: makeAuthHeaders(buyerA.id, buyerA.role),
      },
    );
    assert.equal(pollRes.status, 200);
    const polledData = ((await pollRes.json()) as any).data;
    assert.equal(polledData.length, 1);
    assert.equal(polledData[0].content, 'Dạ sản phẩm chính hãng bảo hành 12 tháng bạn nhé!');
  } finally {
    server.close();
  }
});

test('🎯 [NGHIỆM THU 2] FAQ có nguồn dẫn chứng (Kịch bản B: Mất cọc, quá hạn, đổi trả)', async () => {
  const app = createApplication();
  const server = app.listen(0);
  const port = (server.address() as any).port;

  try {
    // 1. Hỏi về quá hạn thắng đấu giá & mất cọc
    const faqAuctionRes = await fetch(`http://127.0.0.1:${port}/api/v1/chat/faq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'Quá hạn thắng đấu giá mà không trả tiền thì bị mất cọc thế nào?',
      }),
    });
    assert.equal(faqAuctionRes.status, 200);
    const faqAuction = ((await faqAuctionRes.json()) as any).data;
    assert.equal(faqAuction.isGrounded, true);
    assert.ok(faqAuction.citations.length > 0);
    assert.equal(faqAuction.citations[0].source, 'Điều 4.2 - Quy chế Đấu giá Nexus v1.2');
    assert.ok(faqAuction.answer.includes('24 giờ'));
    assert.ok(faqAuction.answer.includes('10 điểm uy tín'));
    assert.equal(faqAuction.canEscalate, true);

    // 2. Hỏi về thời hạn đổi trả hàng
    const faqRefundRes = await fetch(`http://127.0.0.1:${port}/api/v1/chat/faq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'Thời hạn đổi trả sản phẩm khi bị lỗi là bao lâu?',
      }),
    });
    assert.equal(faqRefundRes.status, 200);
    const faqRefund = ((await faqRefundRes.json()) as any).data;
    assert.equal(faqRefund.isGrounded, true);
    assert.equal(
      faqRefund.citations[0].source,
      'Điều 3.1 - Quy chế Trả hàng & Hoàn tiền Nexus v1.2',
    );
    assert.ok(faqRefund.answer.includes('7 ngày'));

    // 3. Hỏi câu hỏi KHÔNG CÓ CĂN CỨ trong quy chế sàn
    const faqUnknownRes = await fetch(`http://127.0.0.1:${port}/api/v1/chat/faq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'Tôi có thể đổi sản phẩm này lấy 1 cây vàng SJC được không?',
      }),
    });
    assert.equal(faqUnknownRes.status, 200);
    const faqUnknown = ((await faqUnknownRes.json()) as any).data;
    assert.equal(faqUnknown.isGrounded, false);
    assert.equal(faqUnknown.citations.length, 0);
    assert.ok(faqUnknown.answer.includes('không tìm thấy căn cứ chính sách'));
    assert.equal(
      faqUnknown.canEscalate,
      true,
      'Bắt buộc bật cờ canEscalate để hiện nút gặp nhân viên',
    );
  } finally {
    server.close();
  }
});

test('🎯 [NGHIỆM THU 3] Khiếu nại và bàn giao (Kịch bản C: Hàng vỡ, chống trùng Idempotency)', async () => {
  const app = createApplication();
  const server = app.listen(0);
  const port = (server.address() as any).port;

  const buyer = { id: 'usr_buyer_alice', role: 'BUYER', fullName: 'Minh Anh' };
  const supportStaff = { id: 'usr_staff_01', role: 'SUPPORT_STAFF' };
  const orderId = 'NX-ORD-8021';
  const idempotencyKey = 'idemp_key_network_retry_8021';

  try {
    // 1. Tạo trước kênh BUYER_SUPPORT
    await fetch(`http://127.0.0.1:${port}/api/v1/chat/conversations`, {
      method: 'POST',
      headers: makeAuthHeaders(buyer.id, buyer.role),
      body: JSON.stringify({
        orderId,
        channelType: 'BUYER_SUPPORT',
        sellerId: 'usr_seller_bob',
      }),
    });

    // 2. Buyer gửi yêu cầu khiếu nại kèm ảnh bằng chứng và Idempotency Key
    const payload = {
      orderId,
      orderCode: 'NX-ORD-8021',
      reason: 'Hàng nhận bị nứt vỡ màn hình, bể góc nghiêm trọng.',
      priority: 'Cao',
      attachments: [
        {
          url: 'https://assets.nexus.vn/evidence/broken_screen_01.jpg',
          filename: 'broken_screen_01.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 1048576,
        },
      ],
      idempotencyKey,
    };

    const firstAttemptRes = await fetch(`http://127.0.0.1:${port}/api/v1/chat/escalate`, {
      method: 'POST',
      headers: {
        ...makeAuthHeaders(buyer.id, buyer.role, 'buyer@nexus.com'),
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(payload),
    });
    assert.equal(firstAttemptRes.status, 201);
    const firstBody = ((await firstAttemptRes.json()) as any).data;
    assert.equal(firstBody.isDuplicateRequest, false);
    const initialCaseId = firstBody.caseId;
    assert.ok(initialCaseId);

    // 3. MÔ PHỎNG LỖI MẠNG / BẤM NHIỀU LẦN: Gửi lại chính xác payload và idempotencyKey
    const retryAttemptRes = await fetch(`http://127.0.0.1:${port}/api/v1/chat/escalate`, {
      method: 'POST',
      headers: {
        ...makeAuthHeaders(buyer.id, buyer.role, 'buyer@nexus.com'),
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(payload),
    });
    // Phải trả về thành công và TRẢ VỀ ĐÚNG CASE CŨ (KHÔNG TẠO CASE MỚI)
    assert.equal(retryAttemptRes.status, 200);
    const retryBody = ((await retryAttemptRes.json()) as any).data;
    assert.equal(retryBody.isDuplicateRequest, true);
    assert.equal(retryBody.caseId, initialCaseId, 'Sau lỗi mạng chỉ sinh đúng một case duy nhất');

    // 4. Support Staff truy cập kiểm tra kênh hỗ trợ
    const listConvRes = await fetch(
      `http://127.0.0.1:${port}/api/v1/chat/orders/${orderId}/conversations`,
      {
        headers: makeAuthHeaders(supportStaff.id, supportStaff.role),
      },
    );
    assert.equal(listConvRes.status, 200);
    const staffConvs = ((await listConvRes.json()) as any).data;
    const supportConv = staffConvs.find((c: any) => c.channelType === 'BUYER_SUPPORT');
    assert.ok(supportConv, 'Support Staff thấy được kênh BUYER_SUPPORT');
    assert.equal(supportConv.supportCaseId, initialCaseId);
  } finally {
    server.close();
  }
});

test('🎯 [TASK BE-02] Tích hợp Kết quả Thẩm Định AI vào EscalateDisputeUseCase & Guard Rails', async () => {
  const app = createApplication();
  const server = app.listen(0);
  const port = (server.address() as any).port;

  const buyer = { id: 'usr_buyer_ai_test', role: 'BUYER' };
  const orderId = 'NX-ORD-9099';
  const aiDisputeKey = `idemp_ai_test_${Date.now()}`;

  const aiVerdictPayload = {
    damageAssessment: 'Màn hình nứt vỡ nghiêm trọng 80%',
    confidenceScore: 0.96,
    suggestedAction: 'REFUND_WITHOUT_RETURN',
    detectedDamageTypes: ['CRACKED_SCREEN', 'PHYSICAL_IMPACT'],
    summary: 'Ảnh chụp kiện hàng cho thấy màn hình vỡ nát do va đập mạnh trong khâu vận chuyển.',
  };

  try {
    // 1. Gửi yêu cầu khiếu nại kẹp kết quả phân tích AI (aiVerdict)
    const escalateRes = await fetch(`http://127.0.0.1:${port}/api/v1/chat/escalate`, {
      method: 'POST',
      headers: {
        ...makeAuthHeaders(buyer.id, buyer.role, 'buyer.ai@nexus.com'),
        'Idempotency-Key': aiDisputeKey,
      },
      body: JSON.stringify({
        orderId,
        orderCode: 'NX-ORD-9099',
        reason: 'Sản phẩm giao bị vỡ màn hình nghiêm trọng',
        priority: 'Cao',
        attachments: [
          {
            url: 'https://cdn.nexus.com/evidence/broken_box.jpg',
            filename: 'broken_box.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 1024 * 500, // 500 KB hợp lệ (< 20MB)
          },
        ],
        aiVerdict: aiVerdictPayload,
      }),
    });

    assert.equal(escalateRes.status, 201);
    const body = ((await escalateRes.json()) as any).data;
    assert.ok(body.caseId, 'Phải tạo thành công caseId khiếu nại');
    assert.equal(body.orderId, orderId);
    assert.equal(body.isDuplicateRequest, false);

    // Xác nhận kết quả phân tích thẩm định của AI được bảo toàn đầy đủ
    assert.ok(body.aiVerdict, 'Dữ liệu kết quả AI thẩm định phải được lưu giữ');
    assert.equal(body.aiVerdict.damageAssessment, aiVerdictPayload.damageAssessment);
    assert.equal(body.aiVerdict.confidenceScore, 0.96);
    assert.equal(body.aiVerdict.suggestedAction, 'REFUND_WITHOUT_RETURN');
    assert.deepEqual(body.aiVerdict.detectedDamageTypes, ['CRACKED_SCREEN', 'PHYSICAL_IMPACT']);

    // 2. Kiểm tra Idempotency với aiVerdict: gửi lại cùng khóa phải trả về case cũ kèm aiVerdict
    const retryRes = await fetch(`http://127.0.0.1:${port}/api/v1/chat/escalate`, {
      method: 'POST',
      headers: {
        ...makeAuthHeaders(buyer.id, buyer.role, 'buyer.ai@nexus.com'),
        'Idempotency-Key': aiDisputeKey,
      },
      body: JSON.stringify({
        orderId,
        reason: 'Sản phẩm giao bị vỡ màn hình nghiêm trọng',
        aiVerdict: aiVerdictPayload,
      }),
    });
    assert.equal(retryRes.status, 200);
    const retryData = ((await retryRes.json()) as any).data;
    assert.equal(retryData.isDuplicateRequest, true);
    assert.equal(retryData.caseId, body.caseId);
    assert.equal(retryData.aiVerdict?.confidenceScore, 0.96);

    // 3. Kiểm tra rào chắn MIME: Chặn định dạng tệp không hợp lệ (ví dụ: application/zip)
    const invalidMimeRes = await fetch(`http://127.0.0.1:${port}/api/v1/chat/escalate`, {
      method: 'POST',
      headers: makeAuthHeaders(buyer.id, buyer.role),
      body: JSON.stringify({
        orderId,
        reason: 'Kiểm tra chặn MIME không hợp lệ',
        attachments: [
          {
            url: 'https://cdn.nexus.com/files/virus.exe',
            filename: 'payload.exe',
            mimeType: 'application/x-msdownload',
            sizeBytes: 1024,
          },
        ],
      }),
    });
    assert.equal(invalidMimeRes.status, 400);
    const invalidMimeJson = (await invalidMimeRes.json()) as any;
    assert.match(invalidMimeJson.error, /không được hỗ trợ/);

    // 4. Kiểm tra rào chắn dung lượng: Chặn tệp đính kèm vượt quá 20MB
    const oversizedRes = await fetch(`http://127.0.0.1:${port}/api/v1/chat/escalate`, {
      method: 'POST',
      headers: makeAuthHeaders(buyer.id, buyer.role),
      body: JSON.stringify({
        orderId,
        reason: 'Kiểm tra chặn tệp quá tải dung lượng',
        attachments: [
          {
            url: 'https://cdn.nexus.com/videos/huge_video.mp4',
            filename: 'huge_video.mp4',
            mimeType: 'video/mp4',
            sizeBytes: 25 * 1024 * 1024, // 25 MB > 20 MB
          },
        ],
      }),
    });
    assert.equal(oversizedRes.status, 400);
    const oversizedJson = (await oversizedRes.json()) as any;
    assert.match(oversizedJson.error, /vượt quá giới hạn cho phép/);
  } finally {
    server.close();
  }
});
