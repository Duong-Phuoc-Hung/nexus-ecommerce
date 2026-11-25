import { IProductRepository } from '../../domain/repositories/IProductRepository';
import { ProductNotFoundException } from '../../domain/exceptions/ProductNotFoundException';

export interface RecoverProductInput {
  productId: string;
  sellerId: string;
  userRole?: string;
}

/**
 * Use Case: Khôi phục sản phẩm đã bị xóa mềm về lại trạng thái ACTIVE.
 * Đảm bảo tính toàn vẹn: Chỉ chính chủ Seller hoặc ADMIN mới được khôi phục.
 */
export class RecoverProductUseCase {
  constructor(private readonly productRepository: IProductRepository) {}

  public async execute(input: RecoverProductInput): Promise<void> {
    // 1. Tìm sản phẩm trong Database (bao gồm cả sản phẩm đã xóa mềm)
    const product = this.productRepository.findByIdIncludingDeleted
      ? await this.productRepository.findByIdIncludingDeleted(input.productId)
      : await this.productRepository.findById(input.productId);
    if (!product) {
      throw new ProductNotFoundException(input.productId);
    }

    // 2. Ownership Check: Bắt buộc là chính chủ Seller hoặc ADMIN mới được khôi phục
    if (product.sellerId !== input.sellerId && input.userRole !== 'ADMIN') {
      throw new Error('FORBIDDEN: Bạn không có quyền khôi phục sản phẩm của người khác.');
    }

    // 3. Gọi repository thực hiện khôi phục theo đúng product.id và product.sellerId
    if (this.productRepository.recover) {
      await this.productRepository.recover(product.id, product.sellerId);
    }
  }
}
