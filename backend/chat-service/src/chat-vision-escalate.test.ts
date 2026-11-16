import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { createApplication } from './app';
import { GeminiDamageAssessor } from './infrastructure/ai/GeminiDamageAssessor';
import { SendMessageUseCase } from './application/use-cases/SendMessageUseCase';
import { EscalateDisputeUseCase } from './application/use-cases/EscalateDisputeUseCase';
import {
  InMemoryChatMessageRepository,
  InMemoryConversationRepository,
} from './infrastructure/database/InMemoryChatRepositories';
import { RedisIdempotencyService } from './infrastructure/redis/RedisIdempotencyService';
import { Conversation } from './domain/entities/Conversation';

describe('🎯 [TASK BE-03: Vision-Path & Damage Assessment Auto Escalate]', () => {
  describe('1. GeminiDamageAssessor (AI Vision & Fallback)', () => {
    test('1.1 Trả về is_damaged: false khi không có tệp ảnh đính kèm', async () => {
      const assessor = new GeminiDamageAssessor();
      const result = await assessor.assessDamage('Kiểm tra đơn hàng giúp tôi');
      assert.strictEqual(result.is_damaged, false);
      assert.strictEqual(result.damage_type, 'NONE');
    });

    test('1.2 Heuristic Fallback: Phát hiện nứt vỡ khi có ảnh và mô tả chứa từ khóa vỡ/hỏng', async () => {
      const assessor = new GeminiDamageAssessor();
      const result = await assessor.assessDamage('Gói hàng bị nứt vỡ nát màn hình rồi shop ơi!', [
        {
          url: 'https://cdn.nexus.vn/evidence/box.jpg',
          filename: 'box.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 102400,
        },
      ]);
      assert.strictEqual(result.is_damaged, true);
      assert.strictEqual(result.severity, 'HIGH');
      assert.ok(result.summary && result.summary.includes('nứt vỡ'));
      assert.ok(result.confidence && result.confidence > 0.8);
    });

    test('1.3 Heuristic Fallback: Phát hiện nứt vỡ khi tên file ảnh chứa từ khóa vỡ/crack', async () => {
      const assessor = new GeminiDamageAssessor();
      const result = await assessor.assessDamage('Gửi shop hình kiện hàng vừa nhận', [
        {
          url: 'https://cdn.nexus.vn/evidence/cracked-screen-unboxing.png',
          filename: 'cracked-screen-unboxing.png',
          mimeType: 'image/png',
          sizeBytes: 204800,
        },
      ]);
      assert.strictEqual(result.is_damaged, true);
      assert.strictEqual(result.severity, 'HIGH');
    });

    test('1.4 Trả về is_damaged: false khi ảnh đính kèm bình thường không có dấu hiệu hư hại', async () => {
      const assessor = new GeminiDamageAssessor();
      const result = await assessor.assessDamage(
        'Shop tư vấn giúp mình cách dùng phụ kiện này nhé',
        [
          {
            url: 'https://cdn.nexus.vn/evidence/product-guide.jpg',
            filename: 'product-guide.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 50000,
          },
        ],
      );
      assert.strictEqual(result.is_damaged, false);
    });

    test('1.5 Chế độ Online: Phân tích đúng cấu trúc JSON khi Mock Gemini Client trả về', async () => {
      const mockGeminiClient = {
        models: {
          generateContent: async () => ({
            text: JSON.stringify({
              is_damaged: true,
              damage_type: 'CRACKED_SCREEN',
              severity: 'CRITICAL',
              summary: 'Màn hình iPad bị nứt góc sâu 4cm do va đập vận chuyển.',
              confidence: 0.98,
              evidence_found: ['Màn hình nứt vỡ', 'Vỏ hộp móp góc'],
            }),
          }),
        },
      };

      const assessor = new GeminiDamageAssessor({
        apiKey: 'mock-key',
        customClient: mockGeminiClient,
      });

      const result = await assessor.assessDamage('Màn hình bị nứt', [
        {
          url: 'https://cdn.nexus.vn/evidence/ipad.png',
          filename: 'ipad.png',
          mimeType: 'image/png',
          sizeBytes: 150000,
        },
      ]);

      assert.strictEqual(result.is_damaged, true);
      assert.strictEqual(result.severity, 'CRITICAL');
      assert.strictEqual(result.confidence, 0.98);
      assert.strictEqual(result.damage_type, 'CRACKED_SCREEN');
    });
  });

  describe('2. SendMessageUseCase (Vision-Path Auto Escalate)', () => {
    let messageRepo: InMemoryChatMessageRepository;
    let convRepo: InMemoryConversationRepository;
    let idempotencyService: RedisIdempotencyService;
    let escalateUseCase: EscalateDisputeUseCase;
    let sendMessageUseCase: SendMessageUseCase;

    beforeEach(() => {
      messageRepo = new InMemoryChatMessageRepository();
      convRepo = new InMemoryConversationRepository();
      idempotencyService = new RedisIdempotencyService();
      escalateUseCase = new EscalateDisputeUseCase(convRepo, idempotencyService);

      sendMessageUseCase = new SendMessageUseCase(
        messageRepo,
        convRepo,
        undefined,
        undefined,
        undefined,
        new GeminiDamageAssessor(),
        escalateUseCase,
      );
    });

    test('2.1 Tự động kích hoạt EscalateDisputeUseCase và gửi câu an ủi khi khách gửi ảnh hàng vỡ', async () => {
      // 1. Tạo phòng chat AI_BOT gắn với đơn hàng
      const conv = new Conversation({
        id: 'conv_ai_test_vision',
        orderId: 'NX-ORD-9999',
        channelType: 'AI_BOT',
        buyerId: 'buyer_vision_1',
        sellerId: 'SYSTEM_BOT',
      });
      await convRepo.save(conv);

      // 2. Khách gửi tin nhắn kèm ảnh kiện hàng bị vỡ nát
      const result = await sendMessageUseCase.execute(
        {
          conversationId: conv.id,
          senderId: 'buyer_vision_1',
          senderRole: 'BUYER',
          content: 'Kiện hàng của tôi vừa nhận bị nứt vỡ màn hình to tướng rồi!',
          attachments: [
            {
              url: 'https://cdn.nexus.vn/evidence/cracked-box.jpg',
              filename: 'cracked-box.jpg',
              mimeType: 'image/jpeg',
              sizeBytes: 120000,
            },
          ],
        },
        'buyer_vision_1',
        'BUYER',
      );

      // 3. Kiểm tra phản hồi của AI
      assert.ok(result.reply, 'Phải có tin nhắn AI phản hồi');
      assert.strictEqual(result.reply.senderRole, 'AI');
      assert.ok(
        result.reply.content.includes('lập hồ sơ khiếu nại') ||
          result.reply.content.includes('hồ sơ khiếu nại'),
      );
      assert.ok(result.reply.content.includes('Nexus AI rất tiếc'));

      // Kiểm tra metadata
      assert.strictEqual(result.reply.metadata?.is_damaged, true);
      assert.strictEqual(result.reply.metadata?.escalated, true);
      assert.ok(result.reply.metadata?.caseId, 'Phải có caseId khiếu nại');
    });

    test('2.2 Fast-Path: Tin nhắn hỏi han thông thường không bị escalate nhầm', async () => {
      const conv = new Conversation({
        id: 'conv_ai_test_fastpath',
        orderId: 'NX-ORD-8888',
        channelType: 'AI_BOT',
        buyerId: 'buyer_vision_2',
        sellerId: 'SYSTEM_BOT',
      });
      await convRepo.save(conv);

      const result = await sendMessageUseCase.execute(
        {
          conversationId: conv.id,
          senderId: 'buyer_vision_2',
          senderRole: 'BUYER',
          content: 'Quy định đặt cọc đấu giá thế nào vậy bot?',
        },
        'buyer_vision_2',
        'BUYER',
      );

      assert.ok(result.reply);
      assert.strictEqual(result.reply.metadata?.is_damaged, undefined);
      assert.strictEqual(result.reply.metadata?.escalated, undefined);
    });
  });

  describe('3. HTTP API POST /api/v1/chat/message (Endpoint thống nhất)', () => {
    test('3.1 Gọi trực tiếp POST /api/v1/chat/message kèm orderId và ảnh hàng vỡ -> Tự động xử lý mượt mà', async () => {
      const app = createApplication();
      const server = app.listen(0);
      const port = (server.address() as any).port;
      const baseUrl = `http://127.0.0.1:${port}`;

      try {
        const response = await fetch(`${baseUrl}/api/v1/chat/message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': 'buyer_http_test',
            'x-user-role': 'BUYER',
          },
          body: JSON.stringify({
            orderId: 'NX-ORD-5555',
            channelType: 'AI_BOT',
            content: 'Shop ơi hàng bị móp góc và vỡ nắp hộp rồi!',
            attachments: [
              {
                url: 'https://cdn.nexus.vn/evidence/box-dent.png',
                filename: 'box-dent.png',
                mimeType: 'image/png',
                sizeBytes: 80000,
              },
            ],
          }),
        });

        assert.strictEqual(response.status, 201);
        const body: any = await response.json();
        assert.strictEqual(body.success, true);
        assert.ok(body.data.message);
        assert.ok(body.data.reply);
        assert.strictEqual(body.data.reply.metadata?.is_damaged, true);
        assert.strictEqual(body.data.reply.metadata?.escalated, true);
        assert.ok(body.data.reply.metadata?.caseId);
      } finally {
        server.close();
      }
    });
  });
});
