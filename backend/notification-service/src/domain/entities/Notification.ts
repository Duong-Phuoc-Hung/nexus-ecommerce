export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

export interface NotificationProps {
  id: string;
  recipientId: string;
  recipientEmail?: string;
  channel: NotificationChannel;
  title: string;
  body: string;
  status: NotificationStatus;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Domain Entity: Notification
 * Quản lý gửi thông báo đa kênh (Email, Push, In-app) trong Notification Service (SRS 3.2).
 */
export class Notification {
  private readonly _id: string;
  private readonly _recipientId: string;
  private readonly _recipientEmail?: string;
  private readonly _channel: NotificationChannel;
  private readonly _title: string;
  private readonly _body: string;
  private _status: NotificationStatus;
  private _sentAt?: Date;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: NotificationProps) {
    this._id = props.id;
    this._recipientId = props.recipientId;
    this._recipientEmail = props.recipientEmail;
    this._channel = props.channel;
    this._title = props.title;
    this._body = props.body;
    this._status = props.status;
    this._sentAt = props.sentAt;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  public get id(): string {
    return this._id;
  }

  public get recipientId(): string {
    return this._recipientId;
  }

  public get channel(): NotificationChannel {
    return this._channel;
  }

  public get title(): string {
    return this._title;
  }

  public get body(): string {
    return this._body;
  }

  public get status(): NotificationStatus {
    return this._status;
  }

  public markAsSent(): void {
    this._status = NotificationStatus.SENT;
    this._sentAt = new Date();
    this._updatedAt = new Date();
  }

  public markAsFailed(): void {
    this._status = NotificationStatus.FAILED;
    this._updatedAt = new Date();
  }
}
