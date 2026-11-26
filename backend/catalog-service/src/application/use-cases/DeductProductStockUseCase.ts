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
  idempotentReplay?: boolean;
}

export class DeductProductStockUseCase {
  // Chống trừ / hoàn kho lặp theo (orderId, productId) qua mọi instance trong cùng tiến trình
  private static readonly deductedOrderKeys = new Set<string>();
  private static readonly restoredOrderKeys = new Set<string>();

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

    if (typeof this.productRepository.deductStockOnce === 'function') {
      const persisted = await this.productRepository.deductStockOnce(
        product.id,
        input.quantity,
        input.orderId,
      );
      return {
        id: product.id,
        remainingStock: persisted.remainingStock,
        status: persisted.status,
        idempotentReplay: persisted.idempotentReplay || undefined,
      };
    }

    const dedupKey = input.orderId ? `${input.orderId}::${input.productId}` : null;
    if (dedupKey && DeductProductStockUseCase.deductedOrderKeys.has(dedupKey)) {
      return {
        id: product.id,
        remainingStock: product.stockQuantity,
        status: product.status,
        idempotentReplay: true,
      };
    }

    // Gọi trực tiếp business rule trong Domain Entity:
    product.reduceStock(input.quantity);

    // Cập nhật vào repository
    await this.productRepository.update(product);

    if (dedupKey) {
      DeductProductStockUseCase.deductedOrderKeys.add(dedupKey);
    }

    return {
      id: product.id,
      remainingStock: product.stockQuantity,
      status: product.status,
    };
  }

  public async restore(input: DeductProductStockInput): Promise<DeductProductStockResult> {
    if (!input.productId) {
      throw new Error('Mã sản phẩm (productId) không được để trống.');
    }
    if (!input.quantity || input.quantity <= 0) {
      throw new Error('Số lượng hoàn kho (quantity) phải lớn hơn 0.');
    }

    const product = await this.productRepository.findById(input.productId);
    if (!product) {
      throw new ProductNotFoundException(`Không tìm thấy sản phẩm với mã: ${input.productId}`);
    }

    if (typeof this.productRepository.restoreStockOnce === 'function') {
      const persisted = await this.productRepository.restoreStockOnce(
        product.id,
        input.quantity,
        input.orderId,
      );
      return {
        id: product.id,
        remainingStock: persisted.remainingStock,
        status: persisted.status,
        idempotentReplay: persisted.idempotentReplay || undefined,
      };
    }

    const restoreKey = input.orderId ? `${input.orderId}::${input.productId}` : null;
    if (restoreKey && DeductProductStockUseCase.restoredOrderKeys.has(restoreKey)) {
      return {
        id: product.id,
        remainingStock: product.stockQuantity,
        status: product.status,
        idempotentReplay: true,
      };
    }

    const nextStock = product.stockQuantity + Math.floor(input.quantity);
    const nextStatus =
      product.status === 'OUT_OF_STOCK' && nextStock > 0 ? 'ACTIVE' : product.status;
    product.updateDetails({
      stockQuantity: nextStock,
      status: nextStatus as any,
    });
    await this.productRepository.update(product);

    if (restoreKey) {
      DeductProductStockUseCase.restoredOrderKeys.add(restoreKey);
      DeductProductStockUseCase.deductedOrderKeys.delete(restoreKey);
    }

    return {
      id: product.id,
      remainingStock: product.stockQuantity,
      status: product.status,
    };
  }
}
