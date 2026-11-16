import { MessageSenderRole } from './Conversation';

export interface ChatAttachment {
  url: string;
  filename?: string;
  mimeType: string;
  sizeBytes: number;
}

export interface ChatMessageProps {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: MessageSenderRole;
  content: string;
  attachments?: ChatAttachment[];
  metadata?: Record<string, any>;
  createdAt?: Date;
  seq?: number;
  clientMessageId?: string;
}

/**
 * Domain Entity: ChatMessage
 * Đại diện cho một tin nhắn trong phiên chat (Kịch bản A, B, C)
 */
export class ChatMessage {
  private readonly _id: string;
  private readonly _conversationId: string;
  private readonly _senderId: string;
  private readonly _senderRole: MessageSenderRole;
  private readonly _content: string;
  private readonly _attachments?: ChatAttachment[];
  private readonly _metadata?: Record<string, any>;
  private readonly _createdAt: Date;
  private _seq?: number;
  private _clientMessageId?: string;

  constructor(props: ChatMessageProps) {
    if (!props.content && (!props.attachments || props.attachments.length === 0)) {
      throw new Error('Nội dung tin nhắn hoặc tệp đính kèm không được để trống.');
    }

    this._id = props.id;
    this._conversationId = props.conversationId;
    this._senderId = props.senderId;
    this._senderRole = props.senderRole;
    this._content = props.content;
    this._attachments = props.attachments;
    this._metadata = props.metadata;
    this._createdAt = props.createdAt || new Date();
    this._seq = props.seq;
    this._clientMessageId =
      props.clientMessageId || (props.metadata?.clientMessageId as string | undefined);
  }

  public get id(): string {
    return this._id;
  }

  public get conversationId(): string {
    return this._conversationId;
  }

  public get senderId(): string {
    return this._senderId;
  }

  public get senderRole(): MessageSenderRole {
    return this._senderRole;
  }

  public get content(): string {
    return this._content;
  }

  public get attachments(): ChatAttachment[] | undefined {
    return this._attachments;
  }

  public get metadata(): Record<string, any> | undefined {
    return this._metadata;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get seq(): number | undefined {
    return this._seq;
  }

  public setSeq(seq: number): void {
    this._seq = seq;
  }

  public get clientMessageId(): string | undefined {
    return this._clientMessageId;
  }

  public toDto() {
    return {
      id: this._id,
      conversationId: this._conversationId,
      senderId: this._senderId,
      senderRole: this._senderRole,
      content: this._content,
      attachments: this._attachments || [],
      metadata: this._metadata || null,
      createdAt: this._createdAt,
      seq: this._seq,
      clientMessageId: this._clientMessageId,
    };
  }
}
