import { INotificationRepository } from '../../domain/repositories/INotificationRepository';
import { NotificationNotFoundException } from '../../domain/exceptions/NotificationNotFoundException';
import { NotificationDetailDto } from '../dtos/NotificationDetailDto';

export class GetNotificationDetailUseCase {
  constructor(private readonly notificationRepository: INotificationRepository) {}

  public async execute(id: string): Promise<NotificationDetailDto> {
    const notification = await this.notificationRepository.findById(id);

    if (!notification) {
      throw new NotificationNotFoundException(id);
    }

    return {
      id: notification.id,
      recipientId: notification.recipientId,
      channel: notification.channel,
      title: notification.title,
      body: notification.body,
      status: notification.status,
      createdAt: new Date().toISOString(),
    };
  }
}
