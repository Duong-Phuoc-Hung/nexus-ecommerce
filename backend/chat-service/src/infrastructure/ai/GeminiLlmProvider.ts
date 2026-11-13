import { GoogleGenAI, Type } from '@google/genai';
import {
  AiReplyResult,
  ChatContext,
  ILanguageModelProvider,
} from '../../application/ports/ILanguageModelProvider';
import { OrderTrackingTool, ShipmentTrackingInfo } from '../../application/tools/OrderTrackingTool';
import { IPolicyRepository } from '../../domain/repositories/IPolicyRepository';
import { RuleBasedLlmProvider } from './RuleBasedLlmProvider';

export interface GeminiLlmProviderOptions {
  apiKey?: string;
  modelName?: string;
  orderTrackingTool?: OrderTrackingTool;
  policyRepo?: IPolicyRepository;
  fallbackProvider?: ILanguageModelProvider;
  customClient?: any;
}

/**
 * ADAPTER ONLINE: GeminiLlmProvider (Google Gemini SDK)
 * Tích hợp model gemini-1.5-flash với System Prompt quy chế sàn Nexus v1.2,
 * Function Calling tra cứu vận đơn, và cơ chế Graceful Fallback tự động
 * khi mất mạng, thiếu API key hoặc gặp lỗi HTTP 429/500 từ Google.
 */
export class GeminiLlmProvider implements ILanguageModelProvider {
  private readonly apiKey?: string;
  private readonly modelName: string;
  private readonly orderTrackingTool: OrderTrackingTool;
  private readonly fallbackProvider: ILanguageModelProvider;
  private client?: any;

  constructor(options: GeminiLlmProviderOptions = {}) {
    this.apiKey = options.apiKey || process.env.GEMINI_API_KEY;
    this.modelName = options.modelName || process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    this.orderTrackingTool = options.orderTrackingTool || new OrderTrackingTool();
    this.fallbackProvider =
      options.fallbackProvider ||
      new RuleBasedLlmProvider(this.orderTrackingTool, options.policyRepo);

    if (options.customClient) {
      this.client = options.customClient;
    } else if (this.apiKey) {
      try {
        this.client = new GoogleGenAI({ apiKey: this.apiKey });
      } catch (e: any) {
        console.warn(`[GeminiLlmProvider] Không thể khởi tạo GoogleGenAI client: ${e?.message}`);
      }
    }
  }

  public async generateReply(prompt: string, context: ChatContext): Promise<AiReplyResult> {
    // 1. Kiểm tra API Key: Nếu không có Key, kích hoạt Fallback ngay lập tức
    if (!this.apiKey || !this.client) {
      console.info(
        '[GeminiLlmProvider] Không tìm thấy GEMINI_API_KEY hoặc client chưa sẵn sàng. Kích hoạt Rule-based Fallback.',
      );
      return this.fallbackProvider.generateReply(prompt, context);
    }

    try {
      // 2. Chuẩn bị Function Declaration cho tra cứu vận đơn
      const trackShipmentToolDeclaration = {
        name: 'trackOrderShipment',
        description:
          'Tra cứu thông tin lộ trình, đơn vị vận chuyển và trạng thái thời gian thực của đơn hàng trên sàn Nexus',
        parameters: {
          type: Type.OBJECT,
          properties: {
            orderCode: {
              type: Type.STRING,
              description: 'Mã đơn hàng cần tra cứu (ví dụ: NX-ORD-8021, ord_xxx)',
            },
          },
          required: ['orderCode'],
        },
      };

      const systemInstruction =
        'Bạn là Trợ lý AI thông minh của sàn thương mại điện tử Nexus.\n' +
        'Nhiệm vụ của bạn là hỗ trợ người dùng tra cứu vận đơn, giải đáp thắc mắc và chính sách sàn.\n' +
        'Quy tắc bắt buộc:\n' +
        '1. Tuân thủ tuyệt đối Quy chế hoạt động Nexus v1.2 (Đấu giá, Trả hàng hoàn tiền, Giao nhận).\n' +
        '2. Văn phong chuẩn mực, trung thực, ngắn gọn và hữu ích.\n' +
        '3. Khi người dùng hỏi về tình trạng, vị trí hoặc lộ trình của một đơn hàng, hãy gọi tool "trackOrderShipment".\n' +
        (context.orderId ? `Ngữ cảnh đơn hàng hiện tại của hội thoại: ${context.orderId}.\n` : '');

      // 3. Gọi Gemini API
      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: [trackShipmentToolDeclaration] }],
        },
      });

      // 4. Xử lý Function Calling nếu Gemini yêu cầu gọi tool
      const functionCalls = response.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0];
        if (call.name === 'trackOrderShipment') {
          const args = (call.args as any) || {};
          const targetOrderId = args.orderCode || context.orderId;

          let trackingData: ShipmentTrackingInfo | null = null;
          if (targetOrderId) {
            trackingData = await this.orderTrackingTool.trackByOrder(targetOrderId);
          }

          let formattedText = `Đơn hàng ${targetOrderId} của bạn hiện có trạng thái: ${trackingData?.status || 'Đang giao'}.`;
          if (trackingData) {
            formattedText = `Đơn hàng ${targetOrderId} đang được hãng ${trackingData.carrier} vận chuyển với mã vận đơn ${trackingData.trackingCode}. Hiện kiện hàng đang tại: ${trackingData.currentLocation} (${trackingData.estimatedDelivery || 'dự kiến giao sớm'}).`;
          }

          return {
            content: formattedText,
            modelUsed: 'gemini-1.5-flash',
            toolCalls: [
              {
                name: 'trackOrderShipment',
                args: { orderCode: targetOrderId },
                result: trackingData,
              },
            ],
            metadata: {
              source: 'gemini-function-calling',
              trackingData,
            },
          };
        }
      }

      // 5. Trả về câu trả lời dạng văn bản từ Gemini
      const textOutput = (response.text || '').trim();
      if (textOutput) {
        return {
          content: textOutput,
          modelUsed: 'gemini-1.5-flash',
        };
      }

      // Nếu Gemini không trả về text, dự phòng sang rule-based
      return this.fallbackProvider.generateReply(prompt, context);
    } catch (error: any) {
      // 6. Graceful Fallback: Bắt mọi lỗi từ Google (429 Quota Exceeded, 500, Network Timeout, ETIMEDOUT,...)
      console.warn(
        `[GeminiLlmProvider] Lỗi khi gọi Google Gemini API (${error?.status || error?.code || error?.message || 'Unknown'}). Tự động kích hoạt Rule-based Fallback.`,
      );
      return this.fallbackProvider.generateReply(prompt, context);
    }
  }
}
