import { Category } from '../entities/Category';

export interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  level: number;
  displayOrder: number;
}

export interface ICategoryRepository {
  findActive(): Promise<CategoryRecord[]>;
  findAllActive(): Promise<Category[]>;
  findById(id: string): Promise<Category | null>;
}
