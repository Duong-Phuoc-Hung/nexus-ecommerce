import { IReviewRepository } from '../../domain/repositories/IReviewRepository';
import { IProductRepository } from '../../domain/repositories/IProductRepository';
import { ProductNotFoundException } from '../../domain/exceptions/ProductNotFoundException';
import { Review } from '../../domain/entities/Review';

export interface GetProductReviewsResult {
  productId: string;
  totalReviews: number;
  averageRating: number;
  reviews: Review[];
}

export class GetProductReviewsUseCase {
  constructor(
    private readonly reviewRepository: IReviewRepository,
    private readonly productRepository: IProductRepository,
  ) {}

  public async execute(productId: string): Promise<GetProductReviewsResult> {
    if (!productId) {
      throw new Error('Mã sản phẩm (productId) không được để trống.');
    }

    const product = await this.productRepository.findById(productId);
    if (!product) {
      throw new ProductNotFoundException(`Không tìm thấy sản phẩm với mã: ${productId}`);
    }

    const reviews = await this.reviewRepository.findByProductId(productId);
    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10) / 10
        : 0;

    return {
      productId,
      totalReviews,
      averageRating,
      reviews,
    };
  }
}
