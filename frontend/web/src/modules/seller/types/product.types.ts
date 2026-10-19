export type ProductStatus = 'ACTIVE' | 'DRAFT' | 'INACTIVE';
export type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  status: ProductStatus;
  updated: string;
};
