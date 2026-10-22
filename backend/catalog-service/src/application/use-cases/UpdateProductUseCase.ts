import { Product } from '../../domain/entities/Product';
import { IProductRepository } from '../../domain/repositories/IProductRepository';
import { ICategoryRepository } from '../../domain/repositories/ICategoryRepository';
import { IEventPublisher } from '../ports/IEventPublisher';
import { ProductNotFoundException } from '../../domain/exceptions/ProductNotFoundException';
import { ProductConflictException } from '../../domain/exceptions/ProductConflictException';
import { ForbiddenException } from '../../domain/exceptions/AuthExceptions';
import { ProductUpdatedEvent } from '../../domain/events/ProductUpdatedEvent';

export interface UpdateProductInput {
  title?: string;
  description?: string;
  categoryId?: string;
  price?: number;
  currency?: string;
  stockQuantity?: number;
  status?: any;
  condition?: string;
  saleType?: string;
  images?: string[];
  primaryImage?: string;
  attributes?: Record<string, string>;
  slug?: string;
  allowAuction?: boolean;
  expectedUpdatedAt?: string;
  version?: number;
}

export interface UpdateUserContext {
  sub: string;
  role: string;
}

export class UpdateProductUseCase {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly categoryRepository?: ICategoryRepository,
    private readonly eventPublisher?: IEventPublisher,
  ) {}

  public async execute(
    productId: string,
    updates: UpdateProductInput,
    user: UpdateUserContext,
  ): Promise<Product> {
    const product = await this.productRepository.findById(productId);
    if (!product) {
      throw new ProductNotFoundException(`Không tìm thấy sản phẩm với mã: ${productId}`);
    }

    // 1. Phân quyền (RBAC): Chỉ Admin hoặc Seller chủ sở hữu mới được sửa
    const normalizedRole = (user.role || '').toUpperCase();
    if (normalizedRole !== 'ADMIN' && product.sellerId !== user.sub) {
      throw new ForbiddenException(
        `Bạn không có quyền chỉnh sửa sản phẩm này (Chỉ chủ sở hữu hoặc ADMIN mới có quyền).`,
      );
    }

    // 2. Xử lý xung đột đồng thời (Optimistic Concurrency Control)
    if (updates.expectedUpdatedAt) {
      const expectedTime = new Date(updates.expectedUpdatedAt).getTime();
      const actualTime = product.updatedAt.getTime();

      // Cho phép lệch tối đa 1000ms do làm tròn ISO string
      if (!isNaN(expectedTime) && Math.abs(expectedTime - actualTime) > 1000) {
        throw new ProductConflictException(
          'Dữ liệu sản phẩm đã bị thay đổi bởi phiên cập nhật khác. Vui lòng tải lại trước khi lưu.',
          product.updatedAt.toISOString(),
          updates.expectedUpdatedAt,
        );
      }
    }

    // 3. Ràng buộc phiên đấu giá: Không cho sửa giá hoặc cấu hình đấu giá nếu sản phẩm đang liên kết với phiên đấu giá
    if (product.allowAuction && updates.price !== undefined && updates.price !== product.price) {
      // Nếu sản phẩm đã được kích hoạt chế độ đấu giá, từ chối việc thay đổi giá trực tiếp qua Product API
      if (product.status === 'ACTIVE') {
        throw new ForbiddenException(
          'Không thể thay đổi giá trực tiếp khi sản phẩm đã được cấu hình cho phiên đấu giá đang kích hoạt.',
        );
      }
    }

    // 4. Nếu đổi danh mục, kiểm tra danh mục mới có tồn tại và đang kích hoạt (is_active = true)
    let resolvedCategoryId = updates.categoryId;
    let resolvedCategoryName = product.categoryName;
    if (updates.categoryId && this.categoryRepository) {
      const category = await this.categoryRepository.findById(updates.categoryId);
      if (!category || !category.isActive) {
        throw new Error(
          `Danh mục mới '${updates.categoryId}' không tồn tại hoặc đang bị tạm khóa.`,
        );
      }
      resolvedCategoryId = category.id;
      resolvedCategoryName = category.name;
    }

    // 5. Cập nhật thực thể
    product.updateDetails({
      title: updates.title,
      description: updates.description,
      categoryId: resolvedCategoryId,
      categoryName: resolvedCategoryName,
      price: updates.price,
      currency: updates.currency,
      stockQuantity: updates.stockQuantity,
      status: updates.status,
      condition: updates.condition,
      saleType: updates.saleType,
      images: updates.images,
      primaryImage: updates.primaryImage,
      attributes: updates.attributes,
      slug: updates.slug,
      allowAuction: updates.allowAuction,
    });

    await this.productRepository.update(product);

    if (this.eventPublisher) {
      await this.eventPublisher.publish(
        ProductUpdatedEvent.EVENT_NAME,
        new ProductUpdatedEvent({
          productId: product.id,
          sellerId: product.sellerId,
          title: product.title,
          price: product.price,
          stockQuantity: product.stockQuantity,
          status: product.status,
          timestamp: product.updatedAt.toISOString(),
        }),
      );
    }

    return product;
  }
}
