import { IProductRepository } from '../../domain/repositories/IProductRepository';
import { ICategoryRepository } from '../../domain/repositories/ICategoryRepository';
import { Product, ProductStatus } from '../../domain/entities/Product';
import { ProductNotFoundException } from '../../domain/exceptions/ProductNotFoundException';

export interface UpdateProductInput {
  productId: string;
  sellerId: string;
  userRole?: string;
  title?: string;
  description?: string;
  price?: number;
  stockQuantity?: number;
  categoryId?: string;
  condition?: string;
  status?: ProductStatus;
  images?: string[];
  attributes?: Record<string, string>;
  allowAuction?: boolean;
}

export class UpdateProductUseCase {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  public async execute(input: UpdateProductInput): Promise<Product> {
    // 1. Tìm sản phẩm hiện tại trong Database
    const product = await this.productRepository.findById(input.productId);
    if (!product) {
      throw new ProductNotFoundException(input.productId);
    }

    // 2. Ownership Check: Bắt buộc phải là chủ sản phẩm (sellerId) HOẶC ADMIN mới được sửa
    if (product.sellerId !== input.sellerId && input.userRole !== 'ADMIN') {
      throw new Error('FORBIDDEN: Bạn không có quyền chỉnh sửa sản phẩm này.');
    }

    // 3. Nếu Seller đổi danh mục mới, kiểm tra danh mục đó có tồn tại không
    if (input.categoryId && input.categoryId !== product.categoryId) {
      const category = await this.categoryRepository.findById(input.categoryId);
      if (!category) {
        throw new Error(`Danh mục với ID '${input.categoryId}' không tồn tại.`);
      }
    }

    // 4. Gọi hàm nghiệp vụ Entity để validate và cập nhật dữ liệu
    product.updateDetails({
      title: input.title,
      description: input.description,
      price: input.price,
      stockQuantity: input.stockQuantity,
      categoryId: input.categoryId,
      condition: input.condition,
      status: input.status,
      images: input.images,
      attributes: input.attributes,
      allowAuction: input.allowAuction,
    });

    // 5. Lưu vào Database
    await this.productRepository.update(product);

    return product;
  }
}
