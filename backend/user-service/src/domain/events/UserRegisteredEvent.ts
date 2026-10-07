/**
 * Domain Event: UserRegisteredEvent
 * Phát ra khi một người dùng đăng ký tài khoản thành công.
 * Sự kiện này sẽ được chuyển thành RabbitMQ Message để Notification Service gửi email kích hoạt (SRS 2.8).
 */
export interface UserRegisteredEventPayload {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  timestamp: string;
}

export class UserRegisteredEvent {
  public static readonly EVENT_NAME = 'user.registered';

  public readonly eventName: string = UserRegisteredEvent.EVENT_NAME;
  public readonly occurredOn: Date = new Date();

  constructor(public readonly payload: UserRegisteredEventPayload) {}
}
