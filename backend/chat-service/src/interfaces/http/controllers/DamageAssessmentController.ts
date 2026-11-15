import { Request, Response } from 'express';
import { IDamageAssessor } from '../../../application/ports/IDamageAssessor';
import { isDamageImageInput } from '../../../infrastructure/ai/GeminiDamageAssessor';

export class DamageAssessmentController {
  constructor(private readonly assessor: IDamageAssessor) {}

  public async assessImage(req: Request, res: Response): Promise<void> {
    if (!isDamageImageInput(req.body)) {
      res.status(400).json({
        success: false,
        error:
          'Cần imageBase64 hợp lệ (tối đa 5 MB), mimeType JPEG/PNG/WEBP và expectedItem tối đa 1000 ký tự nếu có.',
      });
      return;
    }
    const result = await this.assessor.assessImage(req.body);
    res.status(200).json({ success: true, data: result });
  }
}
