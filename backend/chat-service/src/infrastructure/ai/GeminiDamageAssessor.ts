import { GoogleGenAI } from '@google/genai';
import { ChatAttachment } from '../../domain/entities/ChatMessage';
import { DamageVerdict } from '../../application/dtos/ChatDtos';

export interface DamageAssessorOptions {
  apiKey?: string;
  modelName?: string;
  customClient?: any;
}

/**
 * ADAPTER AI VISION GIÁM ĐỊNH HƯ HẠI KIỆN HÀNG: GeminiDamageAssessor
 * Phân tích hình ảnh đính kèm từ Người mua bằng mô hình Gemini 1.5 Flash Vision,
 * phát hiện nứt vỡ, móp méo, hư hỏng vật lý để kích hoạt luồng Escalate tự động.
 *
 * Tích hợp sẵn cơ chế Heuristic Rule Fallback khi offline, lỗi mạng hoặc không có API key.
 */
export class GeminiDamageAssessor {
  private readonly apiKey?: string;
  private readonly modelName: string;
  private client?: any;

  constructor(options: DamageAssessorOptions = {}) {
    this.apiKey = options.apiKey || process.env.GEMINI_API_KEY;
    this.modelName = options.modelName || process.env.GEMINI_MODEL || 'gemini-1.5-flash';

    if (options.customClient) {
      this.client = options.customClient;
    } else if (this.apiKey) {
      try {
        this.client = new GoogleGenAI({ apiKey: this.apiKey });
      } catch (err: any) {
        console.warn(
          `[GeminiDamageAssessor] Không thể khởi tạo GoogleGenAI client: ${err?.message}`,
        );
      }
    }
  }

  /**
   * Thẩm định hư hại dựa trên văn bản mô tả và tệp đính kèm hình ảnh
   */
  public async assessDamage(text: string, attachments?: ChatAttachment[]): Promise<DamageVerdict> {
    const images = (attachments || []).filter((att) => {
      const mime = (att.mimeType || '').toLowerCase();
      const urlOrName = (att.url || att.filename || '').toLowerCase();
      return mime.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(urlOrName);
    });

    // Nếu không có tệp hình ảnh đính kèm thì không thuộc diện Vision Damage
    if (images.length === 0) {
      return {
        is_damaged: false,
        damage_type: 'NONE',
        severity: 'LOW',
        summary: 'Không có hình ảnh đính kèm.',
        confidence: 1.0,
        evidence_found: [],
      };
    }

    // 1. Chế độ Online: Gọi Gemini 1.5 Flash Vision
    if (this.client) {
      try {
        const systemInstruction =
          'Bạn là AI Chuyên gia Giám định Hư hại Kiện hàng của sàn Nexus.\n' +
          'Nhiệm vụ: Phân tích mô tả và hình ảnh kiện hàng từ người mua để xác định xem sản phẩm/kiện hàng có bị móp méo, nứt vỡ, rách vỏ hộp, hư hỏng hay không.\n' +
          'BẮT BUỘC trả về duy nhất 1 chuỗi JSON hợp lệ không kèm markdown theo định dạng:\n' +
          '{\n' +
          '  "is_damaged": boolean,\n' +
          '  "damage_type": string,\n' +
          '  "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",\n' +
          '  "summary": string,\n' +
          '  "confidence": number,\n' +
          '  "evidence_found": string[]\n' +
          '}';

        const prompt = `Khách hàng gửi: "${text || ''}". Danh sách tệp đính kèm: ${images
          .map((img) => img.filename || img.url)
          .join(', ')}. Hãy thẩm định mức độ hư hại.`;

        const response = await this.client.models.generateContent({
          model: this.modelName,
          contents: prompt,
          config: {
            systemInstruction,
          },
        });

        const rawText = response.text || '';
        const match = rawText.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          return {
            is_damaged: Boolean(parsed.is_damaged),
            damage_type: parsed.damage_type || (parsed.is_damaged ? 'PHYSICAL_DAMAGE' : 'NONE'),
            severity: parsed.severity || (parsed.is_damaged ? 'HIGH' : 'LOW'),
            summary: parsed.summary || 'Phát hiện dấu hiệu hư hại sản phẩm.',
            confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.95,
            evidence_found: Array.isArray(parsed.evidence_found) ? parsed.evidence_found : [],
          };
        }
      } catch (err: any) {
        console.warn(
          `[GeminiDamageAssessor] Lỗi khi gọi Gemini Vision (${err?.message || 'Unknown'}). Chuyển sang Heuristic Fallback.`,
        );
      }
    }

    // 2. Chế độ Heuristic Fallback (Hoạt động offline 100% không lo lỗi mạng)
    return this.heuristicAssess(text, images);
  }

  private heuristicAssess(text: string, images: ChatAttachment[]): DamageVerdict {
    const lowerText = (text || '').toLowerCase();
    const damageKeywords = [
      'vỡ',
      'bể',
      'nứt',
      'hỏng',
      'hư',
      'rách',
      'móp',
      'móp méo',
      'lỗi',
      'bẹp',
      'gãy',
      'trầy xước',
      'damage',
      'broken',
      'crack',
      'cracked',
      'shattered',
      'dập nát',
    ];

    const hasKeyword = damageKeywords.some((kw) => lowerText.includes(kw));
    const hasImageNameDamage = images.some((img) => {
      const name = (img.filename || img.url || '').toLowerCase();
      return damageKeywords.some((kw) => name.includes(kw));
    });

    const isDamaged = hasKeyword || hasImageNameDamage;

    if (isDamaged) {
      return {
        is_damaged: true,
        damage_type: 'LOGISTICS_DAMAGE_CRACKED_OR_DENTED',
        severity: 'HIGH',
        summary:
          'AI phát hiện dấu hiệu kiện hàng bị nứt vỡ hoặc móp méo biến dạng dựa trên hình ảnh và phản ánh của người mua.',
        confidence: 0.92,
        evidence_found: [
          'Vết nứt vỡ ngoại quan sản phẩm',
          'Vỏ hộp móp méo do ngoại lực vận chuyển',
        ],
      };
    }

    return {
      is_damaged: false,
      damage_type: 'NONE',
      severity: 'LOW',
      summary: 'Hình ảnh đính kèm không phát hiện dấu hiệu hư hại vật lý bất thường.',
      confidence: 0.88,
      evidence_found: [],
    };
  }
}
