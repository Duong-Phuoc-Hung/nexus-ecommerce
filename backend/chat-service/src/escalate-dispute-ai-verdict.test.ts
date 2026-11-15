import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import { EscalateDisputeUseCase } from './application/use-cases/EscalateDisputeUseCase';
import { InMemoryConversationRepository } from './infrastructure/database/InMemoryChatRepositories';
import { RedisIdempotencyService } from './infrastructure/redis/RedisIdempotencyService';
import { DamageVerdict, EscalateDisputeInput } from './application/dtos/ChatDtos';
import { createApplication } from './app';

function makeAuthHeaders(userId: string, role: string, email?: string) {
  return {
    'Content-Type': 'application/json',
    'x-user-id': userId,
    'x-user-role': role,
    'x-user-email': email || `${userId}@nexus.com`,
  };
}

test('🛡️ [TASK-BE-02: EscalateDisputeUseCase with aiVerdict & Idempotency]', async (t) => {
  let receivedWebhookPayload: any = null;
  let webhookCallCount = 0;

  // Mock Fulfillment Service Webhook Server
  const mockFulfillmentServer = http.createServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/api/v1/support/cases') {
      webhookCallCount++;
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(chunk as Buffer);
      }
      const rawBody = Buffer.concat(chunks).toString('utf-8');
      receivedWebhookPayload = JSON.parse(rawBody);

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, caseId: 'cs_mock_123' }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  await new Promise<void>((resolve) => mockFulfillmentServer.listen(0, resolve));
  const mockPort = (mockFulfillmentServer.address() as AddressInfo).port;
  const mockFulfillmentUrl = `http://127.0.0.1:${mockPort}`;

  t.after(() => {
    mockFulfillmentServer.close();
  });

  const conversationRepo = new InMemoryConversationRepository();
  const idempotencyService = new RedisIdempotencyService();
  const useCase = new EscalateDisputeUseCase(
    conversationRepo,
    idempotencyService,
    mockFulfillmentUrl,
  );

  const initialAiVerdict: DamageVerdict = {
    is_damaged: true,
    damage_type: 'CRACKED_SCREEN',
    severity: 'HIGH',
    summary: 'Màn hình máy ảnh nứt vỡ dọc góc trên bên phải, vỏ trầy xước nặng',
    confidence: 0.96,
    evidence_found: ['broken_screen_01.jpg'],
  };

  await t.test('1. Đóng gói aiAssessment vào webhook và trả về aiVerdict', async () => {
    receivedWebhookPayload = null;
    webhookCallCount = 0;

    const input: EscalateDisputeInput = {
      orderId: 'NX-ORD-AI-9001',
      orderCode: 'NX-ORD-AI-9001',
      buyerId: 'usr_buyer_alice',
      buyerName: 'Alice Nguyen',
      reason: 'Sản phẩm khi nhận hộp bị rách, màn hình thiết bị bị nứt vỡ.',
      priority: 'HIGH',
      attachments: [
        {
          url: 'https://assets.nexus.vn/evidence/broken_screen_01.jpg',
          filename: 'broken_screen_01.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 1024 * 1024,
        },
      ],
      aiVerdict: initialAiVerdict,
      idempotencyKey: 'idemp_key_ai_verdict_test_01',
    };

    const result = await useCase.execute(input);

    // 1. Kiểm tra kết quả trả về của use case
    assert.equal(result.isDuplicateRequest, false);
    assert.equal(result.orderId, 'NX-ORD-AI-9001');
    assert.equal(result.status, 'PENDING_REVIEW');
    assert.ok(result.caseId.startsWith('cs_'));
    assert.deepEqual(
      result.aiVerdict,
      initialAiVerdict,
      'Kết quả use case phải trả về đúng aiVerdict',
    );

    // 2. Kiểm tra webhook payload gửi sang fulfillment-service
    assert.equal(webhookCallCount, 1, 'Fulfillment webhook phải được gọi 1 lần');
    assert.ok(receivedWebhookPayload, 'Webhook phải nhận được payload');
    assert.equal(receivedWebhookPayload.orderId, 'NX-ORD-AI-9001');
    assert.deepEqual(
      receivedWebhookPayload.aiAssessment,
      {
        isDamaged: true,
        damageType: 'CRACKED_SCREEN',
        severity: 'HIGH',
        summary: 'Màn hình máy ảnh nứt vỡ dọc góc trên bên phải, vỏ trầy xước nặng',
      },
      'aiAssessment phải chứa đầy đủ isDamaged, damageType, severity, summary',
    );
  });

  await t.test('2. Bảo toàn aiVerdict qua cơ chế chống trùng lặp Idempotency Key', async () => {
    // Gửi lại cùng idempotencyKey (mô phỏng retry do rớt mạng hoặc người dùng click đúp)
    const retryInput: EscalateDisputeInput = {
      orderId: 'NX-ORD-AI-9001',
      orderCode: 'NX-ORD-AI-9001',
      buyerId: 'usr_buyer_alice',
      buyerName: 'Alice Nguyen',
      reason: 'Sản phẩm khi nhận hộp bị rách, màn hình thiết bị bị nứt vỡ.',
      idempotencyKey: 'idemp_key_ai_verdict_test_01',
    };

    const callCountBefore = webhookCallCount;
    const retryResult = await useCase.execute(retryInput);

    // Kiểm tra kết quả trả về từ cache Idempotency
    assert.equal(
      retryResult.isDuplicateRequest,
      true,
      'Yêu cầu lặp phải đánh dấu isDuplicateRequest: true',
    );
    assert.ok(
      retryResult.message.includes('Yêu cầu của bạn đã được ghi nhận trước đó'),
      'Thông báo phản hồi phải nêu rõ đã được ghi nhận trước đó',
    );
    assert.deepEqual(
      retryResult.aiVerdict,
      initialAiVerdict,
      'aiVerdict phải được bảo toàn nguyên vẹn từ Redis Idempotency cache',
    );
    assert.equal(
      webhookCallCount,
      callCountBefore,
      'Không được gọi thêm webhook sang fulfillment service khi trùng idempotencyKey',
    );
  });

  await t.test('3. Tương thích ngược khi không có aiVerdict', async () => {
    receivedWebhookPayload = null;

    const inputWithoutAi: EscalateDisputeInput = {
      orderId: 'NX-ORD-LEGACY-01',
      buyerId: 'usr_buyer_bob',
      reason: 'Tôi muốn đổi trả sản phẩm do không ưng ý màu sắc.',
      idempotencyKey: 'idemp_key_no_ai_01',
    };

    const result = await useCase.execute(inputWithoutAi);
    assert.equal(result.isDuplicateRequest, false);
    assert.equal(result.aiVerdict, undefined);
    assert.ok(receivedWebhookPayload);
    assert.equal(receivedWebhookPayload.aiAssessment, undefined);
  });
});

test('🌐 [TASK-BE-02: HTTP API POST /api/v1/chat/escalate với aiVerdict & Idempotency Header]', async () => {
  const app = createApplication();
  const server = app.listen(0);
  const port = (server.address() as AddressInfo).port;

  const buyer = { id: 'usr_buyer_test_user', role: 'BUYER', fullName: 'Trần Văn Nam' };
  const orderId = 'NX-ORD-HTTP-7788';
  const idempotencyKey = 'idemp_http_verdict_key_7788';

  const aiVerdict: DamageVerdict = {
    is_damaged: true,
    damage_type: 'WATER_DAMAGE',
    severity: 'CRITICAL',
    summary: 'Bo mạch thiết bị có dấu hiệu ngấm nước, oxy hóa các chân chip',
    confidence: 0.98,
  };

  try {
    // 1. Tạo phòng chat BUYER_SUPPORT trước
    await fetch(`http://127.0.0.1:${port}/api/v1/chat/conversations`, {
      method: 'POST',
      headers: makeAuthHeaders(buyer.id, buyer.role),
      body: JSON.stringify({
        orderId,
        channelType: 'BUYER_SUPPORT',
        sellerId: 'usr_seller_camera_shop',
      }),
    });

    // 2. Gửi request Escalate kèm aiVerdict
    const payload = {
      orderId,
      orderCode: 'NX-ORD-HTTP-7788',
      reason: 'Thiết bị không lên nguồn, phát hiện vết nước ngấm bên trong.',
      priority: 'Cao',
      aiVerdict,
      attachments: [
        {
          url: 'https://assets.nexus.vn/evidence/water_damage_circuit.jpg',
          filename: 'water_damage_circuit.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 500000,
        },
      ],
    };

    const res1 = await fetch(`http://127.0.0.1:${port}/api/v1/chat/escalate`, {
      method: 'POST',
      headers: {
        ...makeAuthHeaders(buyer.id, buyer.role),
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(payload),
    });

    assert.equal(res1.status, 201, 'Lần gọi đầu tiên phải trả về HTTP 201 Created');
    const body1 = (await res1.json()) as any;
    assert.equal(body1.success, true);
    assert.equal(body1.data.isDuplicateRequest, false);
    assert.ok(body1.data.caseId);
    assert.deepEqual(body1.data.aiVerdict, aiVerdict, 'data.aiVerdict phải khớp với input gửi lên');

    const createdCaseId = body1.data.caseId;

    // 3. Gửi lại request với cùng Idempotency-Key
    const res2 = await fetch(`http://127.0.0.1:${port}/api/v1/chat/escalate`, {
      method: 'POST',
      headers: {
        ...makeAuthHeaders(buyer.id, buyer.role),
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(payload),
    });

    assert.equal(res2.status, 200, 'Lần gọi trùng lặp phải trả về HTTP 200 OK');
    const body2 = (await res2.json()) as any;
    assert.equal(body2.success, true);
    assert.equal(body2.data.isDuplicateRequest, true);
    assert.equal(
      body2.data.caseId,
      createdCaseId,
      'Trùng Idempotency Key phải trả về cùng Case ID',
    );
    assert.deepEqual(
      body2.data.aiVerdict,
      aiVerdict,
      'data.aiVerdict phải được giữ nguyên khi trả về từ cache chống trùng lặp',
    );
  } finally {
    server.close();
  }
});
