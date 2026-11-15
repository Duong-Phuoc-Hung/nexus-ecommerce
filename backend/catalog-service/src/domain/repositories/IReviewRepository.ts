import { Review } from '../entities/Review';

export interface IReviewRepository {
  findByProductId(productId: string): Promise<Review[]>;
  save(review: Review): Promise<void>;
  findByUserAndProduct?(userId: string, productId: string): Promise<Review | null>;
}
