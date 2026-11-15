import { IFavoriteRepository } from '../../domain/repositories/IFavoriteRepository';
import { IProductRepository } from '../../domain/repositories/IProductRepository';
import { ProductNotFoundException } from '../../domain/exceptions/ProductNotFoundException';
import { Favorite } from '../../domain/entities/Favorite';
import { generateUuidV7 } from '../../infrastructure/utils/uuid';

export interface ToggleFavoriteInput {
  userId: string;
  productId: string;
}

export interface ToggleFavoriteResult {
  productId: string;
  isFavorited: boolean;
  message: string;
}

export class ToggleFavoriteUseCase {
  constructor(
    private readonly favoriteRepository: IFavoriteRepository,
    private readonly productRepository: IProductRepository,
  ) {}

  public async execute(input: ToggleFavoriteInput): Promise<ToggleFavoriteResult> {
    if (!input.userId) {
      throw new Error('Mã người dùng (userId) không được để trống.');
    }
    if (!input.productId) {
      throw new Error('Mã sản phẩm (productId) không được để trống.');
    }

    const product = await this.productRepository.findById(input.productId);
    if (!product) {
      throw new ProductNotFoundException(`Không tìm thấy sản phẩm với mã: ${input.productId}`);
    }

    const existing = await this.favoriteRepository.findByUserAndProduct(
      input.userId,
      input.productId,
    );
    if (existing) {
      // Đã có trong danh sách -> Bỏ thích (Unfavorite)
      await this.favoriteRepository.remove(input.userId, input.productId);
      return {
        productId: input.productId,
        isFavorited: false,
        message: 'Đã xóa sản phẩm khỏi danh sách yêu thích.',
      };
    }

    // Chưa có -> Thêm vào danh sách yêu thích (Favorite)
    const favorite = new Favorite({
      id: generateUuidV7(),
      userId: input.userId,
      productId: input.productId,
      createdAt: new Date(),
    });

    await this.favoriteRepository.add(favorite);
    return {
      productId: input.productId,
      isFavorited: true,
      message: 'Đã thêm sản phẩm vào danh sách yêu thích thành công.',
    };
  }
}
