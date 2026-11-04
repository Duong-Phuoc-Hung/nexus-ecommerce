export type SupportCasePriority = 'Cao' | 'Trung bình' | 'Thấp' | 'HIGH' | 'MEDIUM' | 'LOW';
export type SupportCaseStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED' | 'ESCALATED';

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
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: SupportCaseProps) {
    this._id = props.id;
    this._type = props.type;
    this._orderId = props.orderId;
    this._orderCode = props.orderCode || props.orderId;
    this._userId = props.userId || 'usr_buyer_default';
    this._customer = props.customer;
    this._reason = props.reason;
    this._priority = props.priority;
    this._status = props.status || 'PENDING';
    this._resolutionNote = props.resolutionNote;
    this._resolvedBy = props.resolvedBy;
    this._createdAt = props.createdAt || new Date();
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
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
