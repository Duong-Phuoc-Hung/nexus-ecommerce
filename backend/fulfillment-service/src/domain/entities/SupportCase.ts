export type SupportCasePriority = 'Cao' | 'Trung bình' | 'Thấp' | 'HIGH' | 'MEDIUM' | 'LOW';
export type SupportCaseStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED' | 'ESCALATED';

export interface DisputeEvidence {
  photos?: string[];
  videos?: string[];
  note?: string;
  submittedAt?: Date;
}

export interface ArbitrationVerdict {
  decision: 'REFUND_BUYER' | 'REJECT_BUYER' | 'REQUIRE_RETURN_FIRST';
  refundAmount?: number;
  liableParty?: 'SELLER' | 'BUYER' | 'CARRIER';
  note: string;
  arbitratorId?: string;
  issuedAt?: Date;
}

export interface SupportCaseProps {
  id: string;
  type: string;
  orderId: string;
  orderCode?: string;
  userId?: string;
  customer: string;
  reason: string;
  priority: SupportCasePriority;
  status?: SupportCaseStatus;
  resolutionNote?: string;
  resolvedBy?: string;
  buyerEvidence?: DisputeEvidence;
  sellerEvidence?: DisputeEvidence;
  slaDeadline?: Date;
  verdict?: ArbitrationVerdict;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Domain Entity: SupportCase
 * Đại diện cho Ticket / Khiếu nại dịch vụ khách hàng (SRS 2.3, 3.1.2)
 * Phục vụ trực tiếp cho màn hình Support Staff Dashboard và phân định tranh chấp Buyer - Seller.
 */
export class SupportCase {
  private readonly _id: string;
  private _type: string;
  private _orderId: string;
  private _orderCode: string;
  private _userId: string;
  private _customer: string;
  private _reason: string;
  private _priority: SupportCasePriority;
  private _status: SupportCaseStatus;
  private _resolutionNote?: string;
  private _resolvedBy?: string;
  private _buyerEvidence?: DisputeEvidence;
  private _sellerEvidence?: DisputeEvidence;
  private _slaDeadline: Date;
  private _verdict?: ArbitrationVerdict;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: SupportCaseProps) {
    this._id = props.id;
    this._type = props.type;
    this._orderId = props.orderId;
    this._orderCode = props.orderCode || props.orderId;
    this._userId = props.userId || '01a15822-43b8-78c3-a246-16bff78bc6e8';
    this._customer = props.customer;
    this._reason = props.reason;
    this._priority = props.priority;
    this._status = props.status || 'PENDING';
    this._resolutionNote = props.resolutionNote;
    this._resolvedBy = props.resolvedBy;
    this._buyerEvidence = props.buyerEvidence;
    this._sellerEvidence = props.sellerEvidence;
    const created = props.createdAt || new Date();
    this._createdAt = created;
    this._slaDeadline = props.slaDeadline || new Date(created.getTime() + 24 * 60 * 60 * 1000);
    this._verdict = props.verdict;
    this._updatedAt = props.updatedAt || new Date();
  }

  public get id(): string {
    return this._id;
  }

  public get type(): string {
    return this._type;
  }

  public get orderId(): string {
    return this._orderId;
  }

  public get orderCode(): string {
    return this._orderCode;
  }

  public get userId(): string {
    return this._userId;
  }

  public get customer(): string {
    return this._customer;
  }

  public get reason(): string {
    return this._reason;
  }

  public get priority(): SupportCasePriority {
    return this._priority;
  }

  public get status(): SupportCaseStatus {
    return this._status;
  }

  public get resolutionNote(): string | undefined {
    return this._resolutionNote;
  }

  public get resolvedBy(): string | undefined {
    return this._resolvedBy;
  }

  public get buyerEvidence(): DisputeEvidence | undefined {
    return this._buyerEvidence;
  }

  public get sellerEvidence(): DisputeEvidence | undefined {
    return this._sellerEvidence;
  }

  public get slaDeadline(): Date {
    return this._slaDeadline;
  }

  public get verdict(): ArbitrationVerdict | undefined {
    return this._verdict;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public getAge(): string {
    const elapsedMinutes = Math.max(
      1,
      Math.floor((Date.now() - this._createdAt.getTime()) / 60000),
    );
    if (elapsedMinutes < 60) {
      return `${elapsedMinutes} phút`;
    }
    const elapsedHours = Math.floor(elapsedMinutes / 60);
    if (elapsedHours < 24) {
      return `${elapsedHours} giờ`;
    }
    const elapsedDays = Math.floor(elapsedHours / 24);
    return `${elapsedDays} ngày`;
  }

  /**
   * Cập nhật kết quả xử lý khiếu nại (Duyệt, từ chối, chuyển cấp tranh chấp)
   */
  public resolve(
    resolution: 'APPROVED' | 'REJECTED' | 'ESCALATED',
    note: string,
    operatorId?: string,
  ): void {
    if (!note || !note.trim()) {
      throw new Error('Ghi chú xử lý khiếu nại (note) không được để trống.');
    }

    switch (resolution) {
      case 'APPROVED':
        this._status = 'RESOLVED';
        break;
      case 'REJECTED':
        this._status = 'REJECTED';
        break;
      case 'ESCALATED':
        this._status = 'ESCALATED';
        break;
      default:
        throw new Error(
          `Kết quả xử lý '${resolution}' không hợp lệ. Chỉ chấp nhận APPROVED, REJECTED, hoặc ESCALATED.`,
        );
    }

    this._resolutionNote = note.trim();
    this._resolvedBy = operatorId;
    this._updatedAt = new Date();
  }

  /**
   * Cập nhật kết quả phán quyết trọng tài tranh chấp (Dispute Verdict)
   */
  public issueVerdict(verdict: ArbitrationVerdict, arbitratorId?: string): void {
    if (!verdict.decision) {
      throw new Error('Quyết định phán quyết (decision) là bắt buộc.');
    }
    if (!verdict.note || !verdict.note.trim()) {
      throw new Error('Ghi chú phán quyết (note) không được để trống.');
    }

    this._verdict = {
      ...verdict,
      arbitratorId: arbitratorId || verdict.arbitratorId,
      issuedAt: new Date(),
    };

    if (verdict.decision === 'REFUND_BUYER') {
      this._status = 'RESOLVED';
    } else if (verdict.decision === 'REJECT_BUYER') {
      this._status = 'REJECTED';
    } else {
      this._status = 'IN_PROGRESS';
    }

    this._resolutionNote = verdict.note.trim();
    this._resolvedBy = arbitratorId;
    this._updatedAt = new Date();
  }

  public toResponseDto() {
    return {
      id: this.id,
      type: this.type,
      order: this.orderCode,
      orderId: this.orderId,
      userId: this.userId,
      customer: this.customer,
      reason: this.reason,
      priority: this.priority,
      age: this.getAge(),
      status: this.status,
      resolutionNote: this.resolutionNote,
      resolvedBy: this.resolvedBy,
      buyerEvidence: this.buyerEvidence,
      sellerEvidence: this.sellerEvidence,
      slaDeadline: this.slaDeadline,
      verdict: this.verdict,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  public toDisputeDto() {
    const now = Date.now();
    const slaMsRemaining = this.slaDeadline.getTime() - now;
    const slaRemainingHours = Math.round(slaMsRemaining / (1000 * 3600));

    return {
      caseId: this._id,
      id: this._id,
      orderId: this._orderId,
      order: this._orderCode,
      orderCode: this._orderCode,
      customer: this._customer,
      userId: this._userId,
      type: this._type,
      reason: this._reason,
      priority: this._priority,
      status: this._status,
      slaDeadline: this._slaDeadline.toISOString(),
      slaRemainingHours,
      isSlaOverdue: now > this._slaDeadline.getTime() && this._status === 'PENDING',
      buyerEvidence: this._buyerEvidence || {
        photos: [
          'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=800',
          'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800',
        ],
        note: this._reason,
        submittedAt: this._createdAt,
      },
      sellerEvidence: this._sellerEvidence || {
        videos: ['https://assets.nexus.vn/evidence/packaging_video_sample.mp4'],
        photos: ['https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800'],
        note: 'Đã đóng gói chèn xốp bóng khí 3 lớp dán băng keo niêm phong trước khi giao bưu tá.',
        submittedAt: this._createdAt,
      },
      verdict: this._verdict,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
