import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from './app';

const makeAuthHeaders = (userId: string, role: string = 'BUYER') => ({
  'Content-Type': 'application/json',
  'x-user-id': userId,
  'x-user-role': role,
});

test('🚀 [Buyer Assistant Extensions Suite] Kiểm thử toàn diện 6 tính năng bàn giao', async (t) => {
  const app = createApplication();
  const server = app.listen(0);
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}/api/v1/chat`;

  t.after(() => {
    server.close();
  });

  const buyerId = 'usr_buyer_ext_01';
  const sellerId = 'usr_seller_ext_01';
  const orderId = 'ord_ext_test_9001';

  let convId: string;

  await t.test('1. Mở phòng chat BUYER_SELLER', async () => {
    const res = await fetch(`${baseUrl}/conversations`, {
      method: 'POST',
      headers: makeAuthHeaders(buyerId, 'BUYER'),
      body: JSON.stringify({
        orderId,
        channelType: 'BUYER_SELLER',
        sellerId,
      }),
    });
    assert.equal(res.status, 200);
    const json = (await res.json()) as any;
    assert.ok(json.data.id);
    convId = json.data.id;
  });

  await t.test('2. Gửi tin nhắn có tự tăng số thứ tự seq (Mục 4)', async () => {
    const res1 = await fetch(`${baseUrl}/conversations/${convId}/messages`, {
      method: 'POST',
      headers: makeAuthHeaders(buyerId, 'BUYER'),
      body: JSON.stringify({
        content: 'Tin nhắn thứ nhất',
      }),
    });
    assert.equal(res1.status, 201);
    const data1 = ((await res1.json()) as any).data;
    assert.equal(data1.message.seq, 1);

    const res2 = await fetch(`${baseUrl}/conversations/${convId}/messages`, {
      method: 'POST',
      headers: makeAuthHeaders(sellerId, 'SELLER'),
      body: JSON.stringify({
        content: 'Tin nhắn thứ hai từ Shop',
      }),
    });
    assert.equal(res2.status, 201);
    const data2 = ((await res2.json()) as any).data;
    assert.equal(data2.message.seq, 2);
  });

  await t.test(
    '3. Chống gửi trùng tin nhắn (Idempotency theo clientMessageId) (Mục 4)',
    async () => {
      const clientMessageId = 'client_uuid_12345';

      const res1 = await fetch(`${baseUrl}/conversations/${convId}/messages`, {
        method: 'POST',
        headers: makeAuthHeaders(buyerId, 'BUYER'),
        body: JSON.stringify({
          content: 'Tin nhắn chống spam gửi lại',
          clientMessageId,
        }),
      });
      assert.equal(res1.status, 201);
      const data1 = ((await res1.json()) as any).data;
      assert.equal(data1.message.seq, 3);

      // Gửi lại cùng clientMessageId
      const res2 = await fetch(`${baseUrl}/conversations/${convId}/messages`, {
        method: 'POST',
        headers: makeAuthHeaders(buyerId, 'BUYER'),
        body: JSON.stringify({
          content: 'Tin nhắn chống spam gửi lại (lần 2)',
          clientMessageId,
        }),
      });
      assert.equal(res2.status, 201);
      const data2 = ((await res2.json()) as any).data;
      // Không tạo tin nhắn mới mà trả lại tin nhắn cũ
      assert.equal(data2.message.id, data1.message.id);
      assert.equal(data2.message.seq, 3);
    },
  );

  await t.test('4. Phân trang lấy tin nhắn trước seq (before) (Mục 4)', async () => {
    const res = await fetch(`${baseUrl}/conversations/${convId}/messages?before=3`, {
      method: 'GET',
      headers: makeAuthHeaders(buyerId, 'BUYER'),
    });
    assert.equal(res.status, 200);
    const json = (await res.json()) as any;
    assert.ok(Array.isArray(json.data));
    // Chỉ lấy tin có seq < 3 (seq 1 và seq 2)
    assert.equal(json.data.length, 2);
    assert.equal(json.data[0].seq, 1);
    assert.equal(json.data[1].seq, 2);
    assert.ok(json.meta);
  });

  await t.test('5. Đánh dấu đã đọc tin nhắn PUT /read (Mục 4)', async () => {
    const res = await fetch(`${baseUrl}/conversations/${convId}/read`, {
      method: 'PUT',
      headers: makeAuthHeaders(buyerId, 'BUYER'),
      body: JSON.stringify({
        lastReadSeq: 3,
      }),
    });
    assert.equal(res.status, 200);
    const json = (await res.json()) as any;
    assert.equal(json.data.buyerLastReadSeq, 3);

    // Seller đánh dấu đọc
    const resSeller = await fetch(`${baseUrl}/conversations/${convId}/read`, {
      method: 'PUT',
      headers: makeAuthHeaders(sellerId, 'SELLER'),
      body: JSON.stringify({
        lastReadSeq: 2,
      }),
    });
    assert.equal(resSeller.status, 200);
    const jsonSeller = (await resSeller.json()) as any;
    assert.equal(jsonSeller.data.counterpartLastReadSeq, 2);
  });

  await t.test('6. Upload tệp đính kèm POST /attachments (Mục 3)', async () => {
    const res = await fetch(`${baseUrl}/conversations/${convId}/attachments`, {
      method: 'POST',
      headers: makeAuthHeaders(buyerId, 'BUYER'),
      body: JSON.stringify({
        filename: 'unboxing-evidence.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1048576,
      }),
    });
    assert.equal(res.status, 201);
    const json = (await res.json()) as any;
    assert.ok(json.data.attachmentId);
    assert.equal(json.data.mimeType, 'image/jpeg');
    assert.ok(json.data.url);

    // Chặn file quá dung lượng (20MB)
    const resTooLarge = await fetch(`${baseUrl}/conversations/${convId}/attachments`, {
      method: 'POST',
      headers: makeAuthHeaders(buyerId, 'BUYER'),
      body: JSON.stringify({
        filename: 'huge.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 25 * 1024 * 1024,
      }),
    });
    assert.equal(resTooLarge.status, 400);

    // Chặn định dạng lạ (.exe)
    const resInvalidMime = await fetch(`${baseUrl}/conversations/${convId}/attachments`, {
      method: 'POST',
      headers: makeAuthHeaders(buyerId, 'BUYER'),
      body: JSON.stringify({
        filename: 'malware.exe',
        mimeType: 'application/x-msdownload',
        sizeBytes: 500,
      }),
    });
    assert.equal(resInvalidMime.status, 400);
  });

  await t.test('7. Gửi câu hỏi kèm context trang cho AI Bot (Mục 6)', async () => {
    // Mở phòng AI_BOT
    const openAiRes = await fetch(`${baseUrl}/conversations`, {
      method: 'POST',
      headers: makeAuthHeaders(buyerId, 'BUYER'),
      body: JSON.stringify({
        orderId: 'ord_context_test',
        channelType: 'AI_BOT',
      }),
    });
    assert.equal(openAiRes.status, 200);
    const aiConvId = ((await openAiRes.json()) as any).data.id;

    // Gửi câu hỏi có context CART_CHECKOUT
    const resCheckout = await fetch(`${baseUrl}/conversations/${aiConvId}/messages`, {
      method: 'POST',
      headers: makeAuthHeaders(buyerId, 'BUYER'),
      body: JSON.stringify({
        content: 'Tổng tiền đơn hàng tính thế nào?',
        context: {
          pageKind: 'CART_CHECKOUT',
        },
      }),
    });
    assert.equal(resCheckout.status, 201);
    const jsonCheckout = (await resCheckout.json()) as any;
    assert.ok(jsonCheckout.data.reply);
    assert.ok(jsonCheckout.data.reply.content.includes('phí vận chuyển'));

    // Gửi câu hỏi có context PRODUCT_DETAIL
    const resProduct = await fetch(`${baseUrl}/conversations/${aiConvId}/messages`, {
      method: 'POST',
      headers: makeAuthHeaders(buyerId, 'BUYER'),
      body: JSON.stringify({
        content: 'Sản phẩm này có được bảo hành đổi trả không?',
        context: {
          pageKind: 'PRODUCT_DETAIL',
          productId: 'prod_macbook_pro',
        },
      }),
    });
    assert.equal(resProduct.status, 201);
    const jsonProduct = (await resProduct.json()) as any;
    assert.ok(jsonProduct.data.reply);
    assert.ok(jsonProduct.data.reply.content.includes('đổi trả trong 7 ngày'));
  });

  await t.test('8. Escalate Khiếu nại kèm sharedMessages (Mục 5)', async () => {
    const resEscalate = await fetch(`${baseUrl}/escalate`, {
      method: 'POST',
      headers: {
        ...makeAuthHeaders(buyerId, 'BUYER'),
        'Idempotency-Key': 'idemp_shared_msg_001',
      },
      body: JSON.stringify({
        orderId,
        orderCode: 'ORD-9001',
        reason: 'Hàng nhận bị nứt vỡ mặt kính góc trên',
        priority: 'Cao',
        sharedMessages: ['msg_1', 'msg_2'],
        attachments: [
          {
            url: 'https://storage.nexus.com/broken.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 1024,
          },
        ],
      }),
    });
    assert.equal(resEscalate.status, 201);
    const json = (await resEscalate.json()) as any;
    assert.ok(json.data.caseId);
    assert.equal(json.data.sharedMessagesCount, 2);
  });
});
