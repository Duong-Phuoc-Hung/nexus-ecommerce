import { ICategoryRepository } from '../../domain/repositories/ICategoryRepository';
import { Category } from '../../domain/entities/Category';

export class InMemoryCategoryRepository implements ICategoryRepository {
  private readonly categories: Map<string, Category> = new Map();

  constructor() {
    const sampleCategories = [
      new Category({
        id: '1',
        name: 'Công nghệ & Điện tử',
        slug: 'cong-nghe-dien-tu',
        level: 1,
        isActive: true,
        displayOrder: 1,
      }),
      new Category({
        id: '10',
        name: 'Điện thoại & Tablet',
        slug: 'dien-thoai-tablet',
        parentId: '1',
        level: 2,
        isActive: true,
        displayOrder: 1,
      }),
      new Category({
        id: '100',
        name: 'iPhone',
        slug: 'dien-thoai-iphone',
        parentId: '10',
        level: 3,
        isActive: true,
        displayOrder: 1,
      }),
      new Category({
        id: '2',
        name: 'Đồng hồ cao cấp',
        slug: 'dong-ho-cao-cap',
        level: 1,
        isActive: true,
        displayOrder: 2,
      }),
      new Category({
        id: '3',
        name: 'Âm thanh & Tai nghe',
        slug: 'am-thanh-tai-nghe',
        level: 1,
        isActive: true,
        displayOrder: 3,
      }),
      new Category({
        id: '4',
        name: 'Đồ sưu tầm & Nghệ thuật',
        slug: 'do-suu-tam-nghe-thuat',
        level: 1,
        isActive: true,
        displayOrder: 4,
      }),
    ];

    for (const cat of sampleCategories) {
      this.categories.set(cat.id, cat);
    }
  }

  public async findAllActive(): Promise<Category[]> {
    return Array.from(this.categories.values()).filter((c) => c.isActive);
  }

  public async findById(id: string): Promise<Category | null> {
    return this.categories.get(id) || null;
  }
}
