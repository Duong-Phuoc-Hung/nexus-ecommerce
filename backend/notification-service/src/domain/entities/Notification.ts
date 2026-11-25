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
  category?: 'ORDER' | 'AUCTION' | 'ACCOUNT';
  title: string;
  body: string;
  status: NotificationStatus;
  read?: boolean;
  readAt?: Date;
  href?: string;
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
  private readonly _category: 'ORDER' | 'AUCTION' | 'ACCOUNT';
  private readonly _title: string;
  private readonly _body: string;
  private _status: NotificationStatus;
  private _read: boolean;
  private _readAt?: Date;
  private readonly _href?: string;
  private _sentAt?: Date;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: NotificationProps) {
    this._id = props.id;
    this._recipientId = props.recipientId;
    this._recipientEmail = props.recipientEmail;
    this._channel = props.channel;
    this._category = props.category ?? 'ACCOUNT';
    this._title = props.title;
    this._body = props.body;
    this._status = props.status;
    this._read = Boolean(props.read ?? props.readAt);
    this._readAt = props.readAt;
    this._href = props.href;
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

  public get category(): 'ORDER' | 'AUCTION' | 'ACCOUNT' {
    return this._category;
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

  public get read(): boolean {
    return this._read;
  }

  public get readAt(): Date | undefined {
    return this._readAt;
  }

  public get href(): string | undefined {
    return this._href;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public markAsRead(): void {
    if (!this._read) {
      this._read = true;
      this._readAt = new Date();
      this._updatedAt = new Date();
    }
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

  public toJSON() {
    return {
      id: this._id,
      recipientId: this._recipientId,
      recipientEmail: this._recipientEmail,
      channel: this._channel,
      category: this._category,
      title: this._title,
      body: this._body,
      message: this._body,
      status: this._status,
      read: this._read,
      isRead: this._read,
      readAt: this._readAt ? this._readAt.toISOString() : null,
      href: this._href,
      sentAt: this._sentAt ? this._sentAt.toISOString() : null,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
