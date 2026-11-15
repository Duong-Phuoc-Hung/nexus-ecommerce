import { ChannelType, MessageSenderRole } from '../../domain/entities/Conversation';
import { ChatAttachment } from '../../domain/entities/ChatMessage';

export interface OpenConversationInput {
  orderId: string;
  channelType: ChannelType;
  buyerId?: string;
  sellerId?: string;
}

export interface SendMessageInput {
  conversationId: string;
  senderId: string;
  senderRole: MessageSenderRole;
  content: string;
  attachments?: ChatAttachment[];
}

export interface QueryPolicyFaqInput {
  query: string;
  category?: string;
}

export interface PolicyCitation {
  source: string;
  version: string;
  policyCode: string;
  title: string;
}

export interface QueryPolicyFaqResult {
  answer: string;
  isGrounded: boolean;
  citations: PolicyCitation[];
  canEscalate: boolean;
  matchedPolicy?: {
    code: string;
    version: string;
    defaultValue: Record<string, any>;
  };
}

export interface AiVerdictDto {
  damageAssessment?: string;
  confidenceScore?: number;
  suggestedAction?: string;
  detectedDamageTypes?: string[];
  summary?: string;
  [key: string]: any;
}

export interface EscalateDisputeInput {
  orderId: string;
  orderCode?: string;
  buyerId: string;
  buyerName?: string;
  reason: string;
  priority?: 'Cao' | 'Trung bình' | 'Thấp' | 'HIGH' | 'MEDIUM' | 'LOW';
  attachments?: ChatAttachment[];
  idempotencyKey?: string;
  aiVerdict?: AiVerdictDto;
}

export interface EscalateDisputeResult {
  caseId: string;
  orderId: string;
  orderCode: string;
  status: string;
  priority: string;
  message: string;
  isDuplicateRequest: boolean;
  evidenceCount: number;
  aiVerdict?: AiVerdictDto;
}
