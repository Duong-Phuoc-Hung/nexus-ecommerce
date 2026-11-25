import { GoogleGenAI, Type } from '@google/genai';
import {
  AiReplyResult,
  ChatContext,
  ILanguageModelProvider,
} from '../../application/ports/ILanguageModelProvider';
import { OrderTrackingTool, ShipmentTrackingInfo } from '../../application/tools/OrderTrackingTool';
import { IPolicyRepository } from '../../domain/repositories/IPolicyRepository';
import { RuleBasedLlmProvider } from './RuleBasedLlmProvider';
import { resolveGeminiModelChain } from './geminiModels';

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
 * Tích hợp model Gemini (ưu tiên GEMINI_MODEL + chuỗi GEMINI_FALLBACK_MODELS),
 * System Prompt quy chế sàn Nexus v1.2, Function Calling tra cứu vận đơn,
 * và cơ chế Graceful Fallback tự động khi mất mạng, thiếu API key hoặc lỗi HTTP 429/500/503.
 */
export class GeminiLlmProvider implements ILanguageModelProvider {
  private readonly apiKey?: string;
  private readonly explicitModelName?: string;
  private readonly orderTrackingTool: OrderTrackingTool;
  private readonly fallbackProvider: ILanguageModelProvider;
  private client?: any;

  constructor(options: GeminiLlmProviderOptions = {}) {
    this.apiKey = options.apiKey !== undefined ? options.apiKey : process.env.GEMINI_API_KEY;
    this.explicitModelName = options.modelName;
    this.orderTrackingTool = options.orderTrackingTool || new OrderTrackingTool();
    this.fallbackProvider =
      options.fallbackProvider ||
      new RuleBasedLlmProvider(this.orderTrackingTool, options.policyRepo);

    if (options.customClient) {
      this.client = options.customClient;
    } else if (this.apiKey?.trim()) {
      try {
        this.client = new GoogleGenAI({ apiKey: this.apiKey.trim() });
      } catch (e: any) {
        console.warn(`[GeminiLlmProvider] Không thể khởi tạo GoogleGenAI client: ${e?.message}`);
      }
    }
  }

  private buildPageContextNote(context: ChatContext): string {
    const ctx = context.pageContext;
    if (!ctx || typeof ctx !== 'object') return '';
    const lines: string[] = [];
    if (ctx.pageKind) lines.push(`Trang hiện tại: ${String(ctx.pageKind)}`);
    if (ctx.product && typeof ctx.product === 'object') {
      const p = ctx.product as Record<string, unknown>;
      lines.push(
        `Sản phẩm đang xem: ${p.title || p.id || ''}` +
          (p.price !== undefined ? ` | Giá: ${Number(p.price).toLocaleString('vi-VN')} ₫` : '') +
          (p.stock !== undefined && p.stock !== null ? ` | Tồn kho: ${p.stock}` : '') +
          (p.condition ? ` | Tình trạng: ${p.condition}` : ''),
      );
    }
    if (ctx.auction && typeof ctx.auction === 'object') {
      const a = ctx.auction as Record<string, unknown>;
      lines.push(
        `Phiên đấu giá đang xem: ${a.title || a.id || ''}` +
          (a.status ? ` | Trạng thái: ${a.status}` : '') +
          (a.currentPrice !== undefined
            ? ` | Giá dẫn: ${Number(a.currentPrice).toLocaleString('vi-VN')} ₫`
            : ''),
      );
    }
    if (ctx.checkout && typeof ctx.checkout === 'object') {
      const c = ctx.checkout as Record<string, unknown>;
      lines.push(
        `Giỏ hàng/Checkout: giai đoạn ${c.stage || ''}, ${c.itemsCount ?? 0} món, tạm tính ${Number(c.subtotal || 0).toLocaleString('vi-VN')} ₫`,
      );
    }
    if (Array.isArray(ctx.history) && ctx.history.length > 0) {
      const recent = (ctx.history as Array<{ role?: string; text?: string }>)
        .slice(-4)
        .map(
          (m) => `${m.role === 'USER' ? 'Khách' : 'Trợ lý'}: ${String(m.text || '').slice(0, 180)}`,
        )
        .join('\n');
      if (recent) lines.push(`Hội thoại gần nhất:\n${recent}`);
    }
    return lines.length > 0 ? `\nNgữ cảnh hiện tại của người dùng:\n${lines.join('\n')}\n` : '';
  }

  public async generateReply(prompt: string, context: ChatContext): Promise<AiReplyResult> {
    // 1. Kiểm tra API Key: Nếu không có Key, kích hoạt Fallback ngay lập tức
    if (!this.apiKey?.trim() || !this.client) {
      console.info(
        '[GeminiLlmProvider] Không tìm thấy GEMINI_API_KEY hoặc client chưa sẵn sàng. Kích hoạt Rule-based Fallback.',
      );
      return this.fallbackProvider.generateReply(prompt, context);
    }

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
      'Bạn là Trợ lý AI thông minh của sàn thương mại điện tử & đấu giá Nexus.\n' +
      'Nhiệm vụ của bạn là hỗ trợ người dùng tra cứu vận đơn, tư vấn mua sắm/đấu giá và giải đáp chính sách sàn.\n' +
      'Quy tắc bắt buộc:\n' +
      '1. Tuân thủ Quy chế hoạt động Nexus v1.2 (Đấu giá: thanh toán trong 24h sau khi thắng; Đổi trả/Khiếu nại: trong 48h kể từ khi nhận hàng kèm ảnh/video mở hộp; Thanh toán: PayOS VietQR 24/7 hoặc COD).\n' +
      '2. Văn phong tiếng Việt tự nhiên, thân thiện, ngắn gọn (tối đa 3–4 câu súc tích), không bịa đặt số liệu đơn hàng hoặc trạng thái thanh toán không có trong ngữ cảnh.\n' +
      '3. Khi người dùng hỏi về tình trạng, vị trí hoặc lộ trình của một đơn hàng, hãy gọi tool "trackOrderShipment".\n' +
      (context.orderId ? `Ngữ cảnh đơn hàng hiện tại của hội thoại: ${context.orderId}.\n` : '') +
      this.buildPageContextNote(context);

    const modelChain = resolveGeminiModelChain(
      this.explicitModelName,
      'GEMINI_MODEL',
      'gemini-1.5-flash',
    );

    let lastError: any;

    for (const modelName of modelChain) {
      try {
        // 3. Gọi Gemini API theo chuỗi model ưu tiên
        const response = await this.client.models.generateContent({
          model: modelName,
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
              modelUsed: modelName,
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
            modelUsed: modelName,
            metadata: {
              source: 'gemini-live',
            },
          };
        }
      } catch (error: any) {
        lastError = error;
        console.warn(
          `[GeminiLlmProvider] Model "${modelName}" lỗi (${error?.status || error?.code || error?.message || 'Unknown'}). Thử model tiếp theo nếu có.`,
        );
      }
    }

    // 6. Graceful Fallback: Hết chuỗi model Gemini -> tự động chuyển sang Rule-based Fallback
    console.warn(
      `[GeminiLlmProvider] Lỗi khi gọi Google Gemini API (${lastError?.status || lastError?.code || lastError?.message || 'Empty response'}). Tự động kích hoạt Rule-based Fallback.`,
    );
    return this.fallbackProvider.generateReply(prompt, context);
  }
}
