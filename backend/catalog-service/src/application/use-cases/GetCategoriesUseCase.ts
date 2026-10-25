import { ICategoryRepository } from '../../domain/repositories/ICategoryRepository';
import { Category } from '../../domain/entities/Category';

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  parentId?: string | null;
  level: number;
  isActive: boolean;
  displayOrder: number;
  children?: CategoryDto[];
}

export class GetCategoriesUseCase {
  constructor(private readonly categoryRepository: ICategoryRepository) {}

  public async execute(asTree = false): Promise<CategoryDto[]> {
    const categories = await this.categoryRepository.findAllActive();

    // Map các Entity sang dạng DTO trả về
    const dtos: CategoryDto[] = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      imageUrl: cat.imageUrl,
      parentId: cat.parentId,
      level: cat.level,
      isActive: cat.isActive,
      displayOrder: cat.displayOrder,
    }));

    // Nếu người dùng không cần dạng cây, trả về danh sách phẳng bình thường
    if (!asTree) {
      return dtos;
    }

    // Nếu cần dạng cây (Tree): Gom nhóm cha - con (Level 1 chứa Level 2, Level 2 chứa Level 3)
    return this.buildCategoryTree(dtos);
  }

  private buildCategoryTree(nodes: CategoryDto[]): CategoryDto[] {
    const map = new Map<string, CategoryDto>();
    const roots: CategoryDto[] = [];

    // Khởi tạo mảng children rỗng cho từng node
    for (const node of nodes) {
      map.set(node.id, { ...node, children: [] });
    }

    // Ghép node con vào node cha
    for (const node of nodes) {
      const current = map.get(node.id)!;
      if (node.parentId && map.has(node.parentId)) {
        const parent = map.get(node.parentId)!;
        parent.children = parent.children || [];
        parent.children.push(current);
      } else {
        roots.push(current);
      }
    }

    return roots;
  }
}
