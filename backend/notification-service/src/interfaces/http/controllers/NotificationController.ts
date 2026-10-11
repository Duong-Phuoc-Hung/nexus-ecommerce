import { Request, Response } from 'express';
import { GetNotificationDetailUseCase } from '../../../application/use-cases/GetNotificationDetailUseCase';
import { NotificationNotFoundException } from '../../../domain/exceptions/NotificationNotFoundException';

export class NotificationController {
  constructor(private readonly getNotificationDetailUseCase: GetNotificationDetailUseCase) {}

  public async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = (req.params.id || 'ntf_01hqz111welcome') as string;
      const notification = await this.getNotificationDetailUseCase.execute(id);
      res.status(200).json({
        success: true,
        data: notification,
      });
    } catch (error) {
      if (error instanceof NotificationNotFoundException) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
      });
    }
  }

  public async send(req: Request, res: Response): Promise<void> {
    const { recipientId, channel, title, body } = req.body;
    res.status(202).json({
      success: true,
      message: 'Notification queued for delivery (Skeleton mode)',
      data: {
        notificationId: 'ntf_' + Date.now(),
        recipientId: recipientId || 'usr_01hqz789abc',
        channel: channel || 'EMAIL',
        title: title || 'System Alert',
        body: body || 'Notification body sample',
        status: 'QUEUED',
      },
    });
  }
}
