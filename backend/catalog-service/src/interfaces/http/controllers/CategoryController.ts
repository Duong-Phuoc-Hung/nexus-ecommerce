import { Request, Response } from 'express';
import {
  CategoryRecord,
  ICategoryRepository,
} from '../../../domain/repositories/ICategoryRepository';

interface CategoryTreeNode extends CategoryRecord {
  children: CategoryTreeNode[];
}

export class CategoryController {
  constructor(private readonly categoryRepository: ICategoryRepository) {}

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
      const categories = await this.categoryRepository.findActive();
      if (treeQuery === 'false') {
        res.status(200).json({ success: true, data: categories });
        return;
      }

      const nodes: CategoryTreeNode[] = categories.map((category) => ({
        ...category,
        children: [],
      }));
      const nodesById = new Map(nodes.map((category) => [category.id, category]));
      const roots: CategoryTreeNode[] = [];

      for (const category of nodes) {
        if (category.parentId === null) {
          if (category.level === 1) roots.push(category);
          continue;
        }

        const parent = nodesById.get(category.parentId);
        if (parent && parent.level + 1 === category.level && category.level <= 3) {
          parent.children.push(category);
        }
      }

      res.status(200).json({ success: true, data: roots });
    } catch (error) {
      console.error('[Catalog Categories Error]:', error);
      res.status(500).json({ success: false, error: 'Unable to load categories.' });
    }
  }
}
