import test from 'node:test';
import assert from 'node:assert/strict';
import { RuleBasedLlmProvider } from './infrastructure/ai/RuleBasedLlmProvider';
import { GeminiLlmProvider } from './infrastructure/ai/GeminiLlmProvider';
import { OrderTrackingTool } from './application/tools/OrderTrackingTool';
import { InMemoryPolicyRepository } from './infrastructure/database/InMemoryChatRepositories';
import { SendMessageUseCase } from './application/use-cases/SendMessageUseCase';
import {
  InMemoryChatMessageRepository,
  InMemoryConversationRepository,
} from './infrastructure/database/InMemoryChatRepositories';
import { Conversation } from './domain/entities/Conversation';

test('🤖 [AI Engine - Suite 1] RuleBasedLlmProvider (Offline Adapter)', async (t) => {
  const policyRepo = new InMemoryPolicyRepository();
  const orderTrackingTool = new OrderTrackingTool();
  const provider = new RuleBasedLlmProvider(orderTrackingTool, policyRepo);

  await t.test('1.1 Tra cứu vận đơn khi câu hỏi chứa từ khóa vận chuyển', async () => {
    const result = await provider.generateReply('Kiện hàng NX-ORD-8021 của tôi đang ở đâu?', {
      conversationId: 'conv_1',
      userId: 'usr_buyer_1',
    });

    assert.equal(result.modelUsed, 'rule-based-fallback');
    assert.match(result.content, /NX-ORD-8021/);
    assert.match(result.content, /đang được hãng|trạng thái/i);
    assert.ok(result.toolCalls && result.toolCalls.length > 0);
    assert.equal(result.toolCalls[0].name, 'trackOrderShipment');
    assert.equal(result.toolCalls[0].args.orderCode, 'NX-ORD-8021');
  });

  await t.test('1.2 Tra cứu quy chế v1.2 khi câu hỏi về đặt cọc và đấu giá', async () => {
    const result = await provider.generateReply('Quá hạn thanh toán đấu giá có bị mất cọc không?', {
      conversationId: 'conv_1',
      userId: 'usr_buyer_1',
    });

    assert.equal(result.modelUsed, 'rule-based-fallback');
    assert.match(result.content, /Điều 4.2 - Quy chế Đấu giá Nexus v1.2/);
    assert.match(result.content, /tịch thu toàn bộ tiền cọc/);
    assert.equal(result.metadata?.policyCode, 'AUCTION_PAYMENT_FORFEIT');
  });

  await t.test('1.3 Trả lời văn phong sàn Nexus chuẩn mực cho câu hỏi chung', async () => {
    const result = await provider.generateReply('Xin chào, bạn có thể làm được gì?', {
      conversationId: 'conv_1',
      userId: 'usr_buyer_1',
    });

    assert.equal(result.modelUsed, 'rule-based-fallback');
    assert.match(result.content, /Trợ lý AI của sàn thương mại điện tử Nexus/);
  });
});

test('🛡️ [AI Engine - Suite 2] GeminiLlmProvider - Graceful Fallback (Không có API Key & Lỗi Mạng/Quota)', async (t) => {
  const policyRepo = new InMemoryPolicyRepository();
  const orderTrackingTool = new OrderTrackingTool();

  await t.test('2.1 Tự động fallback sang Rule-based khi không có GEMINI_API_KEY', async () => {
    const provider = new GeminiLlmProvider({
      apiKey: '', // Không có key
      orderTrackingTool,
      policyRepo,
    });

    const result = await provider.generateReply('Đơn hàng NX-ORD-8021 đến đâu rồi?', {
      conversationId: 'conv_1',
      orderId: 'NX-ORD-8021',
      userId: 'usr_buyer_1',
    });

    assert.equal(result.modelUsed, 'rule-based-fallback');
    assert.match(result.content, /NX-ORD-8021/);
    assert.ok(result.toolCalls);
  });

  await t.test('2.2 Tự động fallback khi Google API báo lỗi 429 Quota Exceeded', async () => {
    // Giả lập Client ném lỗi 429 (Hết hạn ngạch / Rate Limit)
    const mockClient429 = {
      models: {
        generateContent: async () => {
          const err: any = new Error('Resource has been exhausted (e.g. check quota)');
          err.status = 429;
          throw err;
        },
      },
    };

    const provider = new GeminiLlmProvider({
      apiKey: 'test-fake-gemini-key',
      customClient: mockClient429,
      orderTrackingTool,
      policyRepo,
    });

    const result = await provider.generateReply('Tôi muốn hỏi về chính sách đổi trả hàng vỡ', {
      conversationId: 'conv_1',
      userId: 'usr_buyer_1',
    });

    // Tuyệt đối không ném lỗi ra ngoài, tự động fallback an toàn
    assert.equal(result.modelUsed, 'rule-based-fallback');
    assert.match(result.content, /Điều 3.1 - Quy chế Trả hàng & Hoàn tiền Nexus v1.2/);
  });

  await t.test(
    '2.3 Tự động fallback khi Google API báo lỗi 500 hoặc mất mạng (ETIMEDOUT)',
    async () => {
      // Giả lập Client mất mạng hoặc server Google lỗi 500
      const mockClientTimeout = {
        models: {
          generateContent: async () => {
            const err: any = new Error('connect ETIMEDOUT 142.250.190.42:443');
            err.code = 'ETIMEDOUT';
            throw err;
          },
        },
      };

      const provider = new GeminiLlmProvider({
        apiKey: 'test-fake-gemini-key',
        customClient: mockClientTimeout,
        orderTrackingTool,
        policyRepo,
      });

      const result = await provider.generateReply('Đơn NX-ORD-8021 của tôi tới đâu rồi?', {
        conversationId: 'conv_1',
        orderId: 'NX-ORD-8021',
        userId: 'usr_buyer_1',
      });

      assert.equal(result.modelUsed, 'rule-based-fallback');
      assert.match(result.content, /NX-ORD-8021/);
    },
  );
});

test('✨ [AI Engine - Suite 3] GeminiLlmProvider - Chế độ Online (Model gemini-1.5-flash & Function Calling)', async (t) => {
  const orderTrackingTool = new OrderTrackingTool();

  await t.test('3.1 Gemini yêu cầu Function Calling trackOrderShipment', async () => {
    // Giả lập Gemini phản hồi Function Call
    const mockClientFunctionCall = {
      models: {
        generateContent: async () => ({
          functionCalls: [
            {
              name: 'trackOrderShipment',
              args: { orderCode: 'NX-ORD-8021' },
            },
          ],
        }),
      },
    };

    const provider = new GeminiLlmProvider({
      apiKey: 'valid-gemini-key',
      customClient: mockClientFunctionCall,
      orderTrackingTool,
    });

    const result = await provider.generateReply('Kiểm tra giúp tôi đơn hàng NX-ORD-8021', {
      conversationId: 'conv_1',
      userId: 'usr_buyer_1',
    });

    assert.equal(result.modelUsed, 'gemini-1.5-flash');
    assert.match(result.content, /NX-ORD-8021/);
    assert.match(result.content, /đang được hãng/);
    assert.ok(result.toolCalls && result.toolCalls.length > 0);
    assert.equal(result.toolCalls[0].name, 'trackOrderShipment');
    assert.equal(result.toolCalls[0].args.orderCode, 'NX-ORD-8021');
  });

  await t.test('3.2 Gemini trả lời bằng văn bản thông thường (Text output)', async () => {
    const mockClientText = {
      models: {
        generateContent: async () => ({
          text: 'Chào bạn! Theo quy định sàn Nexus, các đơn hàng đều được kiểm tra kỹ trước khi xuất kho.',
        }),
      },
    };

    const provider = new GeminiLlmProvider({
      apiKey: 'valid-gemini-key',
      customClient: mockClientText,
      orderTrackingTool,
    });

    const result = await provider.generateReply('Quy trình kiểm hàng trước khi gửi như thế nào?', {
      conversationId: 'conv_1',
      userId: 'usr_buyer_1',
    });

    assert.equal(result.modelUsed, 'gemini-1.5-flash');
    assert.match(result.content, /Chào bạn! Theo quy định sàn Nexus/);
  });
});

test('🚀 [AI Engine - Suite 4] Tích hợp toàn diện SendMessageUseCase (Zero Exception 500 Guarantee)', async (t) => {
  const messageRepo = new InMemoryChatMessageRepository();
  const conversationRepo = new InMemoryConversationRepository();
  const policyRepo = new InMemoryPolicyRepository();
  const orderTrackingTool = new OrderTrackingTool();

  // Khởi tạo kênh AI_BOT
  const conv = new Conversation({
    id: 'conv_ai_test_01',
    orderId: 'NX-ORD-8021',
    channelType: 'AI_BOT',
    buyerId: 'usr_buyer_1',
    sellerId: 'usr_seller_1',
  });
  await conversationRepo.save(conv);

  await t.test(
    '4.1 Gửi tin nhắn vào kênh AI_BOT với Fallback Provider hoạt động hoàn hảo',
    async () => {
      const useCase = new SendMessageUseCase(
        messageRepo,
        conversationRepo,
        orderTrackingTool,
        undefined, // Tự động dùng GeminiLlmProvider có Fallback
        policyRepo,
      );

      const { message, reply } = await useCase.execute(
        {
          conversationId: conv.id,
          senderId: 'usr_buyer_1',
          senderRole: 'BUYER',
          content: 'Đơn hàng của tôi đến đâu rồi?',
        },
        'usr_buyer_1',
        'BUYER',
      );

      assert.ok(message);
      assert.equal(message.content, 'Đơn hàng của tôi đến đâu rồi?');

      assert.ok(reply);
      assert.equal(reply.senderId, 'SYSTEM_AI');
      assert.equal(reply.senderRole, 'AI');
      assert.match(reply.content, /NX-ORD-8021/);
      assert.equal(reply.metadata?.model, 'rule-based-fallback');

      // Kiểm tra tin nhắn phản hồi của AI đã được lưu bền vững trong repo
      const storedMessages = await messageRepo.findByConversationId(conv.id);
      assert.equal(storedMessages.length, 2);
    },
  );

  await t.test('4.2 Gửi tin nhắn khi Gemini Online trả lời thành công', async () => {
    const mockClient = {
      models: {
        generateContent: async () => ({
          text: 'Tôi là Gemini AI trợ lý Nexus, đơn hàng của bạn đang được xử lý rất tốt!',
        }),
      },
    };

    const onlineProvider = new GeminiLlmProvider({
      apiKey: 'dummy-key',
      customClient: mockClient,
      orderTrackingTool,
      policyRepo,
    });

    const useCaseOnline = new SendMessageUseCase(
      messageRepo,
      conversationRepo,
      orderTrackingTool,
      onlineProvider,
      policyRepo,
    );

    const { reply } = await useCaseOnline.execute(
      {
        conversationId: conv.id,
        senderId: 'usr_buyer_1',
        senderRole: 'BUYER',
        content: 'Cho tôi lời khuyên về thanh toán an toàn',
      },
      'usr_buyer_1',
      'BUYER',
    );

    assert.ok(reply);
    assert.equal(reply.metadata?.model, 'gemini-1.5-flash');
    assert.match(reply.content, /Tôi là Gemini AI trợ lý Nexus/);
  });
});
