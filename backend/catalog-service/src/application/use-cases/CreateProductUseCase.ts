import crypto from 'node:crypto';
import { Product, ProductStatus } from '../../domain/entities/Product';
import { IProductRepository } from '../../domain/repositories/IProductRepository';
import { ICategoryRepository } from '../../domain/repositories/ICategoryRepository';
import { IEventPublisher } from '../ports/IEventPublisher';
import { ProductCreatedEvent } from '../../domain/events/ProductCreatedEvent';

export interface CreateProductInput {
  title: string;
  description: string;
  categoryId: string;
  sellerId?: string;
  price: number;
  currency?: string;
  stockQuantity: number;
  status?: ProductStatus;
  condition?: string;
  saleType?: string;
  images?: string[];
  primaryImage?: string;
  attributes?: Record<string, string>;
  slug?: string;
  allowAuction?: boolean;
}

export interface CreateProductContext {
  userId: string;
  userRole: string;
}

export class CreateProductUseCase {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly categoryRepository: ICategoryRepository,
    private readonly eventPublisher?: IEventPublisher,
  ) {}

  public async execute(input: CreateProductInput, context: CreateProductContext): Promise<Product> {
    if (!context || !context.userId) {
      throw new Error('Yêu cầu xác thực tài khoản người dùng.');
    }

    const normalizedRole = (context.userRole || '').toUpperCase();
    if (normalizedRole !== 'SELLER' && normalizedRole !== 'ADMIN') {
      throw new Error(
        'Chỉ Người bán (SELLER) hoặc Quản trị viên (ADMIN) mới có quyền tạo sản phẩm.',
      );
    }

    // Chỉ ADMIN mới có quyền chỉ định sellerId khác; người bán bình thường luôn bị gán sellerId = context.userId
    const sellerId = normalizedRole === 'ADMIN' && input.sellerId ? input.sellerId : context.userId;

    // Kiểm tra danh mục có tồn tại và đang hoạt động (is_active = true) hay không
    const category = await this.categoryRepository.findById(input.categoryId);
    if (!category || !category.isActive) {
      throw new Error(
        `Danh mục sản phẩm '${input.categoryId}' không tồn tại hoặc đang bị tạm khóa.`,
      );
    }

    const productId = `prod_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const slug = input.slug || this.generateSlug(input.title);
    const saleType = input.saleType || (input.allowAuction ? 'AUCTION' : 'FIXED_PRICE');
    const currency = input.currency || 'VND';

    const product = new Product({
      id: productId,
      sellerId,
      categoryId: category.id,
      categoryName: category.name,
      sellerName: 'Nexus Official Store',
      title: input.title,
      description: input.description,
      price: input.price,
      currency,
      stockQuantity: input.stockQuantity,
      status: input.status || ProductStatus.DRAFT,
      condition: input.condition || 'NEW',
      saleType,
      images: input.images || [],
      primaryImage: input.primaryImage,
      attributes: input.attributes || {},
      slug,
      allowAuction: saleType === 'AUCTION' || Boolean(input.allowAuction),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.productRepository.save(product);

    if (this.eventPublisher) {
      await this.eventPublisher.publish(
        ProductCreatedEvent.EVENT_NAME,
        new ProductCreatedEvent({
          productId: product.id,
          sellerId: product.sellerId,
          title: product.title,
          price: product.price,
          stockQuantity: product.stockQuantity,
          timestamp: new Date().toISOString(),
        }),
      );
    }

    return product;
  }

  private generateSlug(title: string): string {
    const baseSlug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100);

    const suffix = crypto.randomBytes(3).toString('hex');
    return `${baseSlug}-${suffix}`;
  }
}
