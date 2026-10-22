import { Category } from '../entities/Category';

export interface ICategoryRepository {
  findAll(activeOnly?: boolean): Promise<Category[]>;
  findById(id: string): Promise<Category | null>;
  findBySlug(slug: string): Promise<Category | null>;
  save(category: Category): Promise<void>;
}
