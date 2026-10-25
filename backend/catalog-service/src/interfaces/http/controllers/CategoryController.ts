import { Request, Response } from 'express';
import { GetCategoriesUseCase } from '../../../application/use-cases/GetCategoriesUseCase';

export class CategoryController {
  constructor(private readonly getCategoriesUseCase: GetCategoriesUseCase) {}

  public async getAll(req: Request, res: Response): Promise<void> {
    const treeQuery = req.query.tree;
    if (treeQuery !== undefined && treeQuery !== 'true' && treeQuery !== 'false') {
      res.status(400).json({
        success: false,
        error: 'Query parameter "tree" must be true or false.',
      });
      return;
    }

    try {
      const asTree = treeQuery !== 'false';
      const categories = await this.getCategoriesUseCase.execute(asTree);

      res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (error) {
      console.error('[Catalog Categories Error]:', error);
      res.status(500).json({ success: false, error: 'Unable to load categories.' });
    }
  }
}
