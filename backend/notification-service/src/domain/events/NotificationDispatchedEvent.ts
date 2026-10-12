export interface NotificationDispatchedEventPayload {
  notificationId: string;
  recipientId: string;
  channel: string;
  status: string;
  timestamp: string;
}

export class NotificationDispatchedEvent {
  public static readonly EVENT_NAME = 'notification.dispatched';

  public readonly eventName: string = NotificationDispatchedEvent.EVENT_NAME;
  public readonly occurredOn: Date = new Date();

  constructor(public readonly payload: NotificationDispatchedEventPayload) {}
}
