import { IProductRepository } from '../../domain/repositories/IProductRepository';
import { ProductNotFoundException } from '../../domain/exceptions/ProductNotFoundException';

export interface DeductProductStockInput {
  productId: string;
  quantity: number;
  orderId?: string;
  reason?: string;
}

export interface DeductProductStockResult {
  id: string;
  remainingStock: number;
  status: string;
}

export class DeductProductStockUseCase {
  constructor(private readonly productRepository: IProductRepository) {}

  public async execute(input: DeductProductStockInput): Promise<DeductProductStockResult> {
    if (!input.productId) {
      throw new Error('Mã sản phẩm (productId) không được để trống.');
    }
    if (!input.quantity || input.quantity <= 0) {
      throw new Error('Số lượng trừ kho (quantity) phải lớn hơn 0.');
    }

    const product = await this.productRepository.findById(input.productId);
    if (!product) {
      throw new ProductNotFoundException(`Không tìm thấy sản phẩm với mã: ${input.productId}`);
    }

    // Gọi trực tiếp business rule trong Domain Entity:
    product.reduceStock(input.quantity);

    // Cập nhật vào repository
    await this.productRepository.update(product);

    return {
      id: product.id,
      remainingStock: product.stockQuantity,
      status: product.status,
    };
  }
}
