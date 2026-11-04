import { Request, Response } from 'express';
import { GetCategoriesUseCase } from '../../../application/use-cases/GetCategoriesUseCase';

export class CategoryController {
  constructor(private readonly getCategoriesUseCase: GetCategoriesUseCase) {}

  public async getAll(req: Request, res: Response): Promise<void> {
    try {
      // Kiểm tra xem client có truyền ?tree=true hay không
      const asTree = req.query.tree === 'true';

      // Gọi Use Case xử lý nghiệp vụ
      const categories = await this.getCategoriesUseCase.execute(asTree);

      // Trả về JSON thành công
      res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal Server Error',
      });
    }
  }
}
