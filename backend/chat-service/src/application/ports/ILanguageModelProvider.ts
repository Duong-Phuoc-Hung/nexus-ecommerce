/**
 * PORT: ILanguageModelProvider (Hexagonal Architecture / DDD)
 * Màng bọc trừu tượng cho AI Engine giúp tách rời tầng Application khỏi các nhà cung cấp LLM cụ thể.
 */

export interface ChatContext {
  conversationId: string;
  orderId?: string;
  userId: string;
  userRole?: string;
  previousMessages?: Array<{ sender: string; content: string }>;
  pageContext?: Record<string, any>;
}

export interface AiReplyResult {
  content: string;
  modelUsed: string;
  toolCalls?: Array<{ name: string; args: Record<string, any>; result?: any }>;
  metadata?: Record<string, any>;
}

export interface ILanguageModelProvider {
  /**
   * Sinh câu trả lời thông minh dựa trên prompt và ngữ cảnh hội thoại.
   * Đảm bảo không bao giờ ném Exception 500 ra ngoài (Graceful Fallback).
   */
  generateReply(prompt: string, context: ChatContext): Promise<AiReplyResult>;
}
