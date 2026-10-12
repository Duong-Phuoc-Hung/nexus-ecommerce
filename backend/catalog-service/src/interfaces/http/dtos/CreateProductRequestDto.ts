export interface CreateProductRequestDto {
  title: string;
  description: string;
  categoryId: string;
  price: number;
  stockQuantity: number;
}
