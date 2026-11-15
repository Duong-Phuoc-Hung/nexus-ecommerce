import test from 'node:test';
import assert from 'node:assert/strict';
import { AddressInfo } from 'node:net';
import { DisputeArbiterAI } from './infrastructure/ai/DisputeArbiterAI';
import { AnalyzeDisputeEvidenceInput } from './application/dtos/ChatDtos';
import { createApplication } from './app';

function makeAuthHeaders(userId: string, role: string, email?: string) {
  return {
    'Content-Type': 'application/json',
    'x-user-id': userId,
    'x-user-role': role,
    'x-user-email': email || `${userId}@nexus.com`,
  };
}

test('🤖 [DisputeArbiterAI: Suite 1] Offline / Heuristic Rule Fallback Arbiter', async (t) => {
  const arbiter = new DisputeArbiterAI(); // Mặc định không có Gemini API key -> Kích hoạt Heuristic

  await t.test('1.1 Nhận định lỗi bên vận chuyển (LOGISTICS_DAMAGE)', async () => {
    const input: AnalyzeDisputeEvidenceInput = {
      disputeId: 'CS-4021',
      orderId: 'ord_01hqz555abc',
      orderAmount: 550000,
      disputeReason: 'Sản phẩm giao vỡ màn hình, nứt bể khi nhận',
      buyerEvidence: {
        photos: ['https://assets.nexus.vn/screen_broken.jpg'],
        note: 'Khi mở hộp sản phẩm thì màn hình đã nứt hoàn toàn, va đập mạnh.',
      },
      sellerEvidence: {
        videos: ['https://assets.nexus.vn/pack_video.mp4'],
        photos: ['https://assets.nexus.vn/package_sealed.jpg'],
        note: 'Shop đã dán tem niêm phong và bọc chống sốc 3 lớp trước khi giao cho bưu tá.',
      },
    };

    const result = await arbiter.analyzeEvidence(input);

    assert.equal(result.fault, 'LOGISTICS_DAMAGE', 'Lỗi phải được xác định là LOGISTICS_DAMAGE');
    assert.equal(result.confidence, 0.88, 'Độ tin cậy đề xuất đạt 0.88');
    assert.ok(
      result.recommendation.includes('Quỹ Bảo Hiểm Vận Chuyển'),
      'Khuyến nghị phải đề cập Quỹ Bảo Hiểm Vận Chuyển',
    );
    assert.ok(
      result.reasoning.includes('màn hình vỡ') && result.reasoning.includes('niêm phong'),
      'Lập luận phải chỉ rõ màn hình vỡ do va đập và shop có tem niêm phong',
    );

    // Kiểm tra cấu trúc 4 trường phán quyết tự động
    assert.equal(result.suggestedVerdict.decision, 'REFUND_BUYER');
    assert.equal(result.suggestedVerdict.liableParty, 'CARRIER');
    assert.equal(result.suggestedVerdict.refundAmount, 550000);
    assert.ok(result.suggestedVerdict.note.length > 0);
  });

  await t.test('1.2 Nhận định lỗi bên người bán (SELLER_FAULT - Sai model cam kết)', async () => {
    const input: AnalyzeDisputeEvidenceInput = {
      disputeId: 'CS-4012',
      orderId: 'ord_01hqz999ghi',
      orderAmount: 1250000,
      disputeReason: 'Hàng nhận không đúng model phiên bản 512GB',
      buyerEvidence: {
        photos: ['https://assets.nexus.vn/box_128gb.jpg'],
        note: 'Phiên đấu giá đề là bản 512GB nhưng nhận thực tế là sai model 128GB.',
      },
      sellerEvidence: {
        note: 'Người bán khẳng định đã gửi hàng.',
      },
    };

    const result = await arbiter.analyzeEvidence(input);

    assert.equal(result.fault, 'SELLER_FAULT');
    assert.ok(result.confidence >= 0.8);
    assert.equal(result.suggestedVerdict.decision, 'REQUIRE_RETURN_FIRST');
    assert.equal(result.suggestedVerdict.liableParty, 'SELLER');
    assert.equal(result.suggestedVerdict.refundAmount, 1250000);
  });

  await t.test('1.3 Nhận định lỗi người mua (BUYER_FAULT - Không có ảnh bằng chứng)', async () => {
    const input: AnalyzeDisputeEvidenceInput = {
      disputeId: 'CS-4099',
      disputeReason: 'Tôi không thích nữa muốn trả hàng',
      buyerEvidence: {
        note: 'Đổi ý không muốn dùng',
      },
    };

    const result = await arbiter.analyzeEvidence(input);

    assert.equal(result.fault, 'BUYER_FAULT');
    assert.equal(result.suggestedVerdict.decision, 'REJECT_BUYER');
    assert.equal(result.suggestedVerdict.liableParty, 'BUYER');
    assert.ok(result.recommendation.includes('Bác bỏ yêu cầu khiếu nại'));
  });
});

test('✨ [DisputeArbiterAI: Suite 2] Gemini Online Client Mocking', async () => {
  const mockGeminiClient = {
    models: {
      generateContent: async () => ({
        text: JSON.stringify({
          fault: 'LOGISTICS_DAMAGE',
          confidence: 0.94,
          recommendation:
            'Áp dụng Quỹ Bảo Hiểm Vận Chuyển: Hoàn 100% tiền cọc cho Buyer và thanh toán cho Seller.',
          reasoning:
            'Ảnh của khách cho thấy màn hình vỡ dạng va đập. Video của Shop chứng minh lúc giao hàng còn nguyên tem niêm phong.',
          suggestedVerdict: {
            decision: 'REFUND_BUYER',
            liableParty: 'CARRIER',
            refundAmount: 600000,
            note: 'Phán quyết trọng tài tự động qua Gemini Copilot.',
          },
        }),
      }),
    },
  };

  const arbiter = new DisputeArbiterAI({
    customClient: mockGeminiClient,
    apiKey: 'mock-key',
  });

  const result = await arbiter.analyzeEvidence({
    disputeId: 'CS-ONLINE-01',
    orderAmount: 600000,
  });

  assert.equal(result.fault, 'LOGISTICS_DAMAGE');
  assert.equal(result.confidence, 0.94);
  assert.equal(result.suggestedVerdict.decision, 'REFUND_BUYER');
  assert.equal(result.suggestedVerdict.liableParty, 'CARRIER');
  assert.equal(result.suggestedVerdict.refundAmount, 600000);
});

test('🌐 [DisputeArbiterAI: Suite 3] HTTP API POST /api/v1/chat/dispute/analyze-evidence', async () => {
  const app = createApplication();
  const server = app.listen(0);
  const port = (server.address() as AddressInfo).port;

  const staff = { id: 'usr_staff_arbi_01', role: 'SUPPORT_STAFF' };

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/v1/chat/dispute/analyze-evidence`, {
      method: 'POST',
      headers: makeAuthHeaders(staff.id, staff.role),
      body: JSON.stringify({
        disputeId: 'CS-4021',
        orderId: 'ord_01hqz555abc',
        orderAmount: 550000,
        disputeReason: 'Sản phẩm giao vỡ màn hình, nứt bể khi nhận kiện hàng',
        buyerEvidence: {
          photos: [
            'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=800&q=80',
          ],
          note: 'Khi mở hộp sản phẩm thì màn hình đã nứt hoàn toàn, viền trầy xước nặng.',
        },
        sellerEvidence: {
          videos: ['https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4'],
          note: 'Shop đã đóng gói 3 lớp chống sốc và dán tem niêm phong trước khi bàn giao cho bưu tá.',
        },
      }),
    });

    assert.equal(res.status, 200, 'HTTP status phải là 200 OK');
    const json = (await res.json()) as any;
    assert.equal(json.success, true);
    assert.ok(json.data);

    // Kiểm tra cấu trúc output theo nghiệp vụ
    assert.equal(json.data.fault, 'LOGISTICS_DAMAGE');
    assert.equal(json.data.confidence, 0.88);
    assert.ok(json.data.recommendation.includes('Quỹ Bảo Hiểm Vận Chuyển'));
    assert.ok(json.data.reasoning.includes('màn hình vỡ'));

    // Kiểm tra 4 trường tự động map vào Modal phán quyết
    assert.equal(json.data.suggestedVerdict.decision, 'REFUND_BUYER');
    assert.equal(json.data.suggestedVerdict.liableParty, 'CARRIER');
    assert.equal(json.data.suggestedVerdict.refundAmount, 550000);
    assert.ok(json.data.suggestedVerdict.note.length > 0);
  } finally {
    server.close();
  }
});
