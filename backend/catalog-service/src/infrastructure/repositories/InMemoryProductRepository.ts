import { IProductRepository } from '../../domain/repositories/IProductRepository';
import { Product, ProductStatus } from '../../domain/entities/Product';

export class InMemoryProductRepository implements IProductRepository {
  private readonly products: Map<string, Product> = new Map();

  constructor() {
    const sampleProduct = new Product({
      id: 'prod_01hqz999xyz',
      sellerId: 'usr_01hqz789abc',
      categoryId: 'cat_electronics',
      title: 'Sony WH-1000XM5 Wireless Headphones',
      description: 'Industry Leading Noise Canceling Wireless Headphones with Auto NC Optimizer',
      price: 399.99,
      stockQuantity: 50,
      status: ProductStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this.products.set(sampleProduct.id, sampleProduct);
  }

  public async findById(id: string): Promise<Product | null> {
    return this.products.get(id) || null;
  }

  public async findAll(_limit?: number, _offset?: number): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  public async findByCategory(categoryId: string): Promise<Product[]> {
    return Array.from(this.products.values()).filter((p) => p.categoryId === categoryId);
  }

  public async save(product: Product): Promise<void> {
    this.products.set(product.id, product);
  }

  public async update(product: Product): Promise<void> {
    this.products.set(product.id, product);
  }

  public async delete(id: string): Promise<void> {
    this.products.delete(id);
  }
}
