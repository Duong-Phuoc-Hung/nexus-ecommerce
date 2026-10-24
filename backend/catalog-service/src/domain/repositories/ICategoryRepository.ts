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
}
