import { Category } from '../../domain/entities/Category';
import { ICategoryRepository } from '../../domain/repositories/ICategoryRepository';

export class InMemoryCategoryRepository implements ICategoryRepository {
  private readonly categories: Map<string, Category> = new Map();

  constructor() {
    this.seedDefaultCategories();
  }

  private seedDefaultCategories(): void {
    const rawData = [
      // Level 1: Root
      {
        id: '1',
        name: 'Thiết bị điện tử',
        slug: 'thiet-bi-dien-tu',
        level: 1,
        parentId: null,
        displayOrder: 1,
      },
      {
        id: '2',
        name: 'Thời trang & Phụ kiện',
        slug: 'thoi-trang-phu-kien',
        level: 1,
        parentId: null,
        displayOrder: 2,
      },
      {
        id: '3',
        name: 'Đồ gia dụng & Đời sống',
        slug: 'do-gia-dung-doi-song',
        level: 1,
        parentId: null,
        displayOrder: 3,
      },
      {
        id: 'cat_electronics',
        name: 'Điện tử viễn thông',
        slug: 'dien-tu-vien-thong',
        level: 1,
        parentId: null,
        displayOrder: 4,
      },

      // Level 2: Subcategories
      {
        id: '10',
        name: 'Điện thoại & Tablet',
        slug: 'dien-thoai-tablet',
        level: 2,
        parentId: '1',
        displayOrder: 1,
      },
      {
        id: '11',
        name: 'Laptop & Máy tính',
        slug: 'laptop-may-tinh',
        level: 2,
        parentId: '1',
        displayOrder: 2,
      },
      {
        id: '12',
        name: 'Thời trang Nam',
        slug: 'thoi-trang-nam',
        level: 2,
        parentId: '2',
        displayOrder: 1,
      },
      {
        id: '13',
        name: 'Thời trang Nữ',
        slug: 'thoi-trang-nu',
        level: 2,
        parentId: '2',
        displayOrder: 2,
      },

      // Level 3: Detailed categories
      {
        id: '100',
        name: 'iPhone',
        slug: 'dien-thoai-iphone',
        level: 3,
        parentId: '10',
        displayOrder: 1,
      },
      {
        id: '101',
        name: 'Samsung Galaxy',
        slug: 'dien-thoai-samsung',
        level: 3,
        parentId: '10',
        displayOrder: 2,
      },
      {
        id: '102',
        name: 'MacBook',
        slug: 'laptop-macbook',
        level: 3,
        parentId: '11',
        displayOrder: 1,
      },
      {
        id: '103',
        name: 'Laptop Gaming',
        slug: 'laptop-gaming',
        level: 3,
        parentId: '11',
        displayOrder: 2,
      },
    ];

    for (const item of rawData) {
      const category = new Category({
        id: item.id,
        name: item.name,
        slug: item.slug,
        level: item.level,
        parentId: item.parentId,
        isActive: true,
        displayOrder: item.displayOrder,
      });
      this.categories.set(category.id, category);
    }
  }

  public async findAll(activeOnly = true): Promise<Category[]> {
    const list = Array.from(this.categories.values());
    return (activeOnly ? list.filter((c) => c.isActive) : list).sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return a.displayOrder - b.displayOrder;
    });
  }

  public async findById(id: string): Promise<Category | null> {
    const found = this.categories.get(id);
    if (found) return found;
    for (const c of this.categories.values()) {
      if (c.slug === id) return c;
    }
    return null;
  }

  public async findBySlug(slug: string): Promise<Category | null> {
    for (const c of this.categories.values()) {
      if (c.slug === slug) return c;
    }
    return null;
  }

  public async save(category: Category): Promise<void> {
    this.categories.set(category.id, category);
  }
}
