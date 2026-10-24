import { IProductRepository } from '../../domain/repositories/IProductRepository';
import { Product } from '../../domain/entities/Product';

export interface GetSellerProductsInput {
  sellerId: string;
  status?: string;
}

export class GetSellerProductsUseCase {
  constructor(private readonly productRepository: IProductRepository) {}

  public async execute(input: GetSellerProductsInput): Promise<Product[]> {
    if (!input.sellerId) {
      throw new Error('Seller ID là bắt buộc.');
    }
    return this.productRepository.findBySellerId(input.sellerId, input.status);
  }
}
