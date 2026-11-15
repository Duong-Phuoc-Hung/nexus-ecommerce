import { IFavoriteRepository } from '../../domain/repositories/IFavoriteRepository';
import { Favorite } from '../../domain/entities/Favorite';
import { Product } from '../../domain/entities/Product';
import { IProductRepository } from '../../domain/repositories/IProductRepository';

export class InMemoryFavoriteRepository implements IFavoriteRepository {
  private readonly favorites: Map<string, Favorite> = new Map();

  constructor(private readonly productRepository?: IProductRepository) {}

  private makeKey(userId: string, productId: string): string {
    return `${userId}:${productId}`;
  }

  public async findByUserAndProduct(userId: string, productId: string): Promise<Favorite | null> {
    const key = this.makeKey(userId, productId);
    return this.favorites.get(key) || null;
  }

  public async findProductsByUserId(userId: string): Promise<Product[]> {
    const userFavorites = Array.from(this.favorites.values()).filter((f) => f.userId === userId);
    if (!this.productRepository) return [];

    const products: Product[] = [];
    for (const fav of userFavorites) {
      const prod = await this.productRepository.findById(fav.productId);
      if (prod) products.push(prod);
    }
    return products;
  }

  public async add(favorite: Favorite): Promise<void> {
    const key = this.makeKey(favorite.userId, favorite.productId);
    this.favorites.set(key, favorite);
  }

  public async remove(userId: string, productId: string): Promise<void> {
    const key = this.makeKey(userId, productId);
    this.favorites.delete(key);
  }
}
