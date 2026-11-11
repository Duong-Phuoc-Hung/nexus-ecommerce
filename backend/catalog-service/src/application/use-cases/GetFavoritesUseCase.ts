import { IFavoriteRepository } from '../../domain/repositories/IFavoriteRepository';
import { Product } from '../../domain/entities/Product';

export interface GetFavoritesInput {
  userId: string;
}

export class GetFavoritesUseCase {
  constructor(private readonly favoriteRepository: IFavoriteRepository) {}

  public async execute(input: GetFavoritesInput): Promise<Product[]> {
    if (!input.userId) {
      throw new Error('Mã người dùng (userId) không được để trống.');
    }
    return this.favoriteRepository.findProductsByUserId(input.userId);
  }
}
