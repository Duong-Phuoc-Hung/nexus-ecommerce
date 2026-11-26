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

    return notification.toJSON();
  }
}
