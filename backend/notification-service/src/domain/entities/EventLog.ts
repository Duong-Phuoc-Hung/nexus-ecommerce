/**
 * =============================================================================
 * PROJECT NEXUS - EVENT LOG DOMAIN ENTITY (SCRUM-58 & SRS 3.2.1)
 * =============================================================================
 * Thực thể miền đại diện cho bản ghi kiểm toán nhật ký sự kiện hệ thống.
 * Bất biến (Append-only) phục vụ kiểm toán và theo dõi luồng giao dịch.
 * =============================================================================
 */

export interface EventLogProps {
  id?: string | bigint;
  eventId: string;
  type: string;
  sourceService: string;
  payload: any;
  status?: string;
  createdAt?: Date;
}

export class EventLog {
  public readonly id?: string | bigint;
  public readonly eventId: string;
  public readonly type: string;
  public readonly sourceService: string;
  public readonly payload: any;
  public readonly status: string;
  public readonly createdAt: Date;

  constructor(props: EventLogProps) {
    if (!props.eventId || props.eventId.trim() === '') {
      throw new Error('[EventLog Entity Error] "eventId" bắt buộc phải có và không được rỗng.');
    }
    if (!props.type || props.type.trim() === '') {
      throw new Error('[EventLog Entity Error] "type" bắt buộc phải có và không được rỗng.');
    }
    if (!props.sourceService || props.sourceService.trim() === '') {
      throw new Error(
        '[EventLog Entity Error] "sourceService" bắt buộc phải có và không được rỗng.',
      );
    }

    this.id = props.id;
    this.eventId = props.eventId;
    this.type = props.type;
    this.sourceService = props.sourceService;
    this.payload =
      props.payload && typeof props.payload === 'object'
        ? Object.freeze(JSON.parse(JSON.stringify(props.payload)))
        : props.payload;
    this.status = props.status || 'SUCCESS';
    this.createdAt = props.createdAt instanceof Date ? props.createdAt : new Date();

    Object.freeze(this);
  }

  public toJSON() {
    return {
      id: this.id ? this.id.toString() : undefined,
      eventId: this.eventId,
      type: this.type,
      sourceService: this.sourceService,
      payload: this.payload,
      status: this.status,
      createdAt: this.createdAt.toISOString(),
    };
  }
}
