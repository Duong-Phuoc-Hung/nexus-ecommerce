import { HandoverConflictException } from '../exceptions/HandoverConflictException';

export type ChannelType = 'AI_BOT' | 'BUYER_SELLER' | 'BUYER_SUPPORT';
export type MessageSenderRole = 'BUYER' | 'SELLER' | 'SUPPORT_STAFF' | 'AI' | 'SYSTEM';

export interface ConversationProps {
  id: string;
  orderId: string;
  channelType: ChannelType;
  buyerId: string;
  sellerId: string;
  supportCaseId?: string;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
  lastSeq?: number;
  buyerLastReadSeq?: number;
  counterpartLastReadSeq?: number;
}

/**
 * Domain Entity: Conversation
 * Quản lý kênh hội thoại đa bên gắn theo mã đơn hàng (Kịch bản A & C)
 */
export class Conversation {
  private readonly _id: string;
  private readonly _orderId: string;
  private readonly _channelType: ChannelType;
  private readonly _buyerId: string;
  private readonly _sellerId: string;
  private _supportCaseId?: string;
  private _status: string;
  private readonly _createdAt: Date;
  private _updatedAt: Date;
  private _lastSeq: number;
  private _buyerLastReadSeq: number;
  private _counterpartLastReadSeq: number;

  constructor(props: ConversationProps) {
    this._id = props.id;
    this._orderId = props.orderId;
    this._channelType = props.channelType;
    this._buyerId = props.buyerId;
    this._sellerId = props.sellerId;
    this._supportCaseId = props.supportCaseId;
    this._status = props.status || (props.channelType === 'AI_BOT' ? 'BOT_ACTIVE' : 'ACTIVE');
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
    this._lastSeq = props.lastSeq || 0;
    this._buyerLastReadSeq = props.buyerLastReadSeq || 0;
    this._counterpartLastReadSeq = props.counterpartLastReadSeq || 0;
  }

  public get id(): string {
    return this._id;
  }

  public get orderId(): string {
    return this._orderId;
  }

  public get channelType(): ChannelType {
    return this._channelType;
  }

  public get buyerId(): string {
    return this._buyerId;
  }

  public get sellerId(): string {
    return this._sellerId;
  }

  public get supportCaseId(): string | undefined {
    return this._supportCaseId;
  }

  public get status(): string {
    return this._status;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * Kiểm soát phân quyền Anti-IDOR và cô lập kênh (Room Isolation)
   * Tiêu chí: Buyer chuyển sang Support mà Seller không thấy nội dung riêng.
   * Buyer khác không đọc được bằng cách đổi ID.
   */
  public canAccess(userId: string, role?: string): boolean {
    const normalizedRole = (role || '').toUpperCase();

    // 1. Quản trị viên và Support Staff có quyền vào kênh BUYER_SUPPORT để giải quyết khiếu nại
    if (normalizedRole === 'ADMIN' || normalizedRole === 'SUPPORT_STAFF') {
      return (
        this._channelType === 'BUYER_SUPPORT' ||
        (this._channelType === 'AI_BOT' && this._status === 'WAITING_STAFF')
      );
    }

    // 2. Buyer sở hữu đơn hàng có quyền vào tất cả các kênh của đơn mình
    if (userId === this._buyerId) {
      return true;
    }

    // 3. Seller CHỈ ĐƯỢC PHÉP vào kênh BUYER_SELLER của shop mình
    if (userId === this._sellerId) {
      // CẤM TUYỆT ĐỐI Seller vào kênh BUYER_SUPPORT hoặc AI_BOT
      return this._channelType === 'BUYER_SELLER';
    }

    // 4. Các tài khoản khác bị chặn hoàn toàn
    return false;
  }

  public linkSupportCase(caseId: string): void {
    this._supportCaseId = caseId;
    this._status = 'WAITING_STAFF';
    this._updatedAt = new Date();
  }

  public updateStatus(status: string): void {
    this._status = status;
    this._updatedAt = new Date();
  }

  public isClosed(): boolean {
    return this._status === 'CLOSED';
  }

  public get lastSeq(): number {
    return this._lastSeq;
  }

  public incrementSeq(): number {
    this._lastSeq += 1;
    this._updatedAt = new Date();
    return this._lastSeq;
  }

  public get buyerLastReadSeq(): number {
    return this._buyerLastReadSeq;
  }

  public get counterpartLastReadSeq(): number {
    return this._counterpartLastReadSeq;
  }

  public markRead(userId: string, role: string, lastReadSeq: number): void {
    const normalizedRole = (role || '').toUpperCase();
    if (userId === this._buyerId || normalizedRole === 'BUYER') {
      this._buyerLastReadSeq = Math.max(this._buyerLastReadSeq, lastReadSeq);
    } else {
      this._counterpartLastReadSeq = Math.max(this._counterpartLastReadSeq, lastReadSeq);
    }
    this._updatedAt = new Date();
  }

  public get isBotActive(): boolean {
    return this._channelType === 'AI_BOT' && ['BOT_ACTIVE', 'ACTIVE'].includes(this._status);
  }

  public requestHumanHandover(): boolean {
    if (this._channelType !== 'AI_BOT') {
      throw new HandoverConflictException('Chỉ hội thoại AI_BOT được chuyển từ bot sang CSKH.');
    }
    if (this._status === 'WAITING_STAFF') return false;
    if (!this.isBotActive)
      throw new HandoverConflictException('Hội thoại không còn ở trạng thái bot đang hỗ trợ.');
    this._status = 'WAITING_STAFF';
    this._updatedAt = new Date();
    return true;
  }

  public toDto() {
    return {
      id: this._id,
      orderId: this._orderId,
      channelType: this._channelType,
      buyerId: this._buyerId,
      sellerId: this._sellerId,
      supportCaseId: this._supportCaseId,
      status: this._status,
      lastSeq: this._lastSeq,
      buyerLastReadSeq: this._buyerLastReadSeq,
      counterpartLastReadSeq: this._counterpartLastReadSeq,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
