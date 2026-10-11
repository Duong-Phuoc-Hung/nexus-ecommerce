import { Notification } from '../entities/Notification';

export interface INotificationRepository {
  findById(id: string): Promise<Notification | null>;
  findByRecipientId(recipientId: string): Promise<Notification[]>;
  save(notification: Notification): Promise<void>;
  update(notification: Notification): Promise<void>;
}
