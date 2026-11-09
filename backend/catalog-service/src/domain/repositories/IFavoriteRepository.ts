import { Favorite } from '../entities/Favorite';
import { Product } from '../entities/Product';

/**
 * Domain Port: IFavoriteRepository
 * Cổng giao tiếp lưu trữ Wishlist (Sản phẩm yêu thích).
 */
export interface IFavoriteRepository {
  findByUserAndProduct(userId: string, productId: string): Promise<Favorite | null>;
  findProductsByUserId(userId: string): Promise<Product[]>;
  add(favorite: Favorite): Promise<void>;
  remove(userId: string, productId: string): Promise<void>;
}
