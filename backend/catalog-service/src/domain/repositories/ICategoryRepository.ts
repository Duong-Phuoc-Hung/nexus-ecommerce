import { Category } from '../entities/Category';

export interface ICategoryRepository {
  /**
   * Lấy toàn bộ danh mục đang hoạt động (isActive = true), sắp xếp theo thứ tự hiển thị
   */
  findAllActive(): Promise<Category[]>;

  /**
   * Tìm danh mục theo ID
   */
  findById(id: string): Promise<Category | null>;
}
