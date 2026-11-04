import { IProductRepository } from '../../domain/repositories/IProductRepository';
import { ProductNotFoundException } from '../../domain/exceptions/ProductNotFoundException';

export interface DeleteProductInput {
  productId: string;
  sellerId: string;
  userRole?: string;
}

export class DeleteProductUseCase {
  constructor(private readonly productRepository: IProductRepository) {}

  public async execute(input: DeleteProductInput): Promise<void> {
    // 1. Tìm sản phẩm trong Database
    const product = await this.productRepository.findById(input.productId);
    if (!product) {
      throw new ProductNotFoundException(input.productId);
    }

    // 2. Ownership Check: Bắt buộc là chính chủ Seller hoặc ADMIN mới được xóa
    if (product.sellerId !== input.sellerId && input.userRole !== 'ADMIN') {
      throw new Error('FORBIDDEN: Bạn không có quyền xóa sản phẩm của người khác.');
    }

    // 3. Tiến hành xóa mềm sản phẩm
    await this.productRepository.delete(input.productId);
  }
}
