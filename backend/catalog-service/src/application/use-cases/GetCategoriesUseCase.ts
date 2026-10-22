import { Category } from '../../domain/entities/Category';
import { ICategoryRepository } from '../../domain/repositories/ICategoryRepository';

export interface GetCategoriesOptions {
  tree?: boolean;
  activeOnly?: boolean;
}

export class GetCategoriesUseCase {
  constructor(private readonly categoryRepository: ICategoryRepository) {}

  public async execute(options: GetCategoriesOptions = {}): Promise<Category[]> {
    const activeOnly = options.activeOnly ?? true;
    const categories = await this.categoryRepository.findAll(activeOnly);

    if (!options.tree) {
      return categories;
    }

    return this.buildCategoryTree(categories);
  }

  private buildCategoryTree(categories: Category[]): Category[] {
    const categoryMap = new Map<string, Category>();

    // Khởi tạo clone các categories với danh sách children rỗng
    for (const cat of categories) {
      const cloned = new Category({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        imageUrl: cat.imageUrl,
        parentId: cat.parentId,
        level: cat.level,
        isActive: cat.isActive,
        displayOrder: cat.displayOrder,
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt,
        children: [],
      });
      categoryMap.set(cat.id, cloned);
    }

    const roots: Category[] = [];

    for (const cat of categories) {
      const current = categoryMap.get(cat.id);
      if (!current) continue;

      if (!cat.parentId || cat.level === 1 || !categoryMap.has(cat.parentId)) {
        roots.push(current);
      } else {
        const parent = categoryMap.get(cat.parentId);
        if (parent) {
          parent.addChild(current);
        } else {
          roots.push(current);
        }
      }
    }

    // Sắp xếp các nhánh theo displayOrder
    roots.sort((a, b) => a.displayOrder - b.displayOrder);
    for (const root of roots) {
      this.sortChildren(root);
    }

    return roots;
  }

  private sortChildren(node: Category): void {
    if (node.children && node.children.length > 0) {
      node.children.sort((a, b) => a.displayOrder - b.displayOrder);
      for (const child of node.children) {
        this.sortChildren(child);
      }
    }
  }
}
