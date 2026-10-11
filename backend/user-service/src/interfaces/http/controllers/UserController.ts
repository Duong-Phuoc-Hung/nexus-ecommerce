import { Request, Response } from 'express';
import { GetUserProfileUseCase } from '../../../application/use-cases/GetUserProfileUseCase';
import { UserNotFoundException } from '../../../domain/exceptions/UserNotFoundException';

/**
 * Interface Adapter: UserController
 * Nhận HTTP request, gọi Application UseCase và trả về HTTP response.
 */
export class UserController {
  constructor(private readonly getUserProfileUseCase: GetUserProfileUseCase) {}

  public async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.params.id || 'usr_01hqz789abc') as string;
      const profile = await this.getUserProfileUseCase.execute(userId);
      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      if (error instanceof UserNotFoundException) {
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

  public async register(req: Request, res: Response): Promise<void> {
    const { email, fullName } = req.body;
    res.status(201).json({
      success: true,
      message: 'User registration initiated (Skeleton mode)',
      data: {
        id: 'usr_' + Date.now(),
        email: email || 'user@example.com',
        fullName: fullName || 'New User',
      },
    });
  }
}
