import { IReviewRepository } from '../../domain/repositories/IReviewRepository';
import { IProductRepository } from '../../domain/repositories/IProductRepository';
import { ProductNotFoundException } from '../../domain/exceptions/ProductNotFoundException';
import { Review } from '../../domain/entities/Review';
import { generateUuidV7 } from '../../infrastructure/utils/uuid';

export interface CreateProductReviewInput {
  productId: string;
  userId: string;
  orderId?: string | null;
  userName?: string;
  rating: number;
  comment?: string;
}

export class CreateProductReviewUseCase {
  constructor(
    private readonly reviewRepository: IReviewRepository,
    private readonly productRepository: IProductRepository,
  ) {}

  public async execute(input: CreateProductReviewInput): Promise<Review> {
    const product = await this.productRepository.findById(input.productId);
    if (!product) {
      throw new ProductNotFoundException(`Không tìm thấy sản phẩm với mã: ${input.productId}`);
    }

    const normalizedOrderId = input.orderId ? String(input.orderId).trim() : null;
    if (normalizedOrderId && this.reviewRepository.findByUserProductAndOrder) {
      const existing = await this.reviewRepository.findByUserProductAndOrder(
        input.userId,
        input.productId,
        normalizedOrderId,
      );
      if (existing) {
        throw new Error('DUPLICATE_REVIEW: Bạn đã đánh giá sản phẩm này cho đơn hàng này.');
      }
    }

    const review = new Review({
      id: generateUuidV7(),
      productId: input.productId,
      userId: input.userId,
      orderId: normalizedOrderId,
      userName: input.userName,
      rating: Number(input.rating),
      comment: input.comment || '',
    });

    await this.reviewRepository.save(review);
    return review;
  }
}
