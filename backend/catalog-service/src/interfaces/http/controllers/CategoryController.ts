import { Request, Response } from 'express';
import { GetCategoriesUseCase } from '../../../application/use-cases/GetCategoriesUseCase';
import { ICategoryRepository } from '../../../domain/repositories/ICategoryRepository';

export class CategoryController {
  constructor(
    private readonly getCategoriesUseCase: GetCategoriesUseCase,
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  public async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const isTree = req.query.tree === 'true' || req.query.tree === '1';
      const activeOnly = req.query.all !== 'true';

      const categories = await this.getCategoriesUseCase.execute({
        tree: isTree,
        activeOnly,
      });

      res.status(200).json({
        success: true,
        data: categories.map((c) => c.toJSON()),
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Internal Server Error',
      });
    }
  }

  public async getCategoryById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const category = await this.categoryRepository.findById(id);

      if (!category) {
        res.status(404).json({
          success: false,
          error: `Danh mục với mã hoặc slug '${id}' không tồn tại.`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: category.toJSON(),
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Internal Server Error',
      });
    }
  }
}
