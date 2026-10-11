import { INotificationRepository } from '../../domain/repositories/INotificationRepository';
import {
  Notification,
  NotificationChannel,
  NotificationStatus,
} from '../../domain/entities/Notification';

export class InMemoryNotificationRepository implements INotificationRepository {
  private readonly notifications: Map<string, Notification> = new Map();

  constructor() {
    const sampleNotification = new Notification({
      id: 'ntf_01hqz111welcome',
      recipientId: 'usr_01hqz789abc',
      recipientEmail: 'buyer.test@nexus-ecommerce.com',
      channel: NotificationChannel.EMAIL,
      title: 'Welcome to Nexus E-Commerce & Auction Platform',
      body: 'Thank you for registering. Please verify your email to start bidding.',
      status: NotificationStatus.SENT,
      sentAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this.notifications.set(sampleNotification.id, sampleNotification);
  }

  public async findById(id: string): Promise<Notification | null> {
    return this.notifications.get(id) || null;
  }

  public async findByRecipientId(recipientId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values()).filter((n) => n.recipientId === recipientId);
  }

  public async save(notification: Notification): Promise<void> {
    this.notifications.set(notification.id, notification);
  }

  public async update(notification: Notification): Promise<void> {
    this.notifications.set(notification.id, notification);
  }
}
