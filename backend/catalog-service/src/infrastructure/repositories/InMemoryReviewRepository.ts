import { IReviewRepository } from '../../domain/repositories/IReviewRepository';
import { Review } from '../../domain/entities/Review';

export class InMemoryReviewRepository implements IReviewRepository {
  private readonly reviews: Review[] = [];

  public async findByProductId(productId: string): Promise<Review[]> {
    return this.reviews
      .filter((r) => r.productId === productId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public async save(review: Review): Promise<void> {
    this.reviews.push(review);
  }

  public async findByUserAndProduct(userId: string, productId: string): Promise<Review | null> {
    return this.reviews.find((r) => r.userId === userId && r.productId === productId) || null;
  }
}
