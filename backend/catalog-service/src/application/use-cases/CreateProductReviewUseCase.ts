import { IReviewRepository } from '../../domain/repositories/IReviewRepository';
import { IProductRepository } from '../../domain/repositories/IProductRepository';
import { ProductNotFoundException } from '../../domain/exceptions/ProductNotFoundException';
import { Review } from '../../domain/entities/Review';
import { generateUuidV7 } from '../../infrastructure/utils/uuid';

export interface CreateProductReviewInput {
  productId: string;
  userId: string;
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

    const review = new Review({
      id: generateUuidV7(),
      productId: input.productId,
      userId: input.userId,
      userName: input.userName,
      rating: Number(input.rating),
      comment: input.comment || '',
    });

    await this.reviewRepository.save(review);
    return review;
  }
}
