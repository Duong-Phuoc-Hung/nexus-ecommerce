import { IProductRepository } from '../../domain/repositories/IProductRepository';
import { ICategoryRepository } from '../../domain/repositories/ICategoryRepository';
import { Product, ProductStatus } from '../../domain/entities/Product';

export interface CreateProductInput {
  sellerId: string;
  sellerName?: string;
  categoryId: string;
  title: string;
  description: string;
  price: number;
  stockQuantity?: number;
  condition?: string;
  images?: string[];
  attributes?: Record<string, any>;
  allowAuction?: boolean;
}

export class CreateProductUseCase {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  public async execute(
    input: CreateProductInput,
  ): Promise<{ id: string; slug: string; title: string }> {
    // 1. Kiểm tra danh mục có tồn tại không
    const category = await this.categoryRepository.findById(input.categoryId);
    if (!category) {
      throw new Error(`Danh mục với ID '${input.categoryId}' không tồn tại trong hệ thống.`);
    }

    // 2. Validate giá và sl
    if (!input.price || input.price <= 0) {
      throw new Error('Giá sản phẩm phải lớn hơn 0 VND.');
    }
    const stock = input.stockQuantity !== undefined ? Number(input.stockQuantity) : 1;
    if (stock < 0) {
      throw new Error('Số lượng tồn kho không được âm.');
    }

    // 3. Tự động tạo slug chuẩn SEO từ tiêu đề (ví dụ: "iPhone 15 Pro" -> "iphone-15-pro-1712345678")
    const baseSlug = input.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const uniqueSlug = `${baseSlug}-${Date.now().toString().slice(-6)}`;

    // 4. Khởi tạo đối tượng Product mới
    const newProduct = new Product({
      id: '0',
      sellerId: input.sellerId,
      sellerName: input.sellerName || 'Nexus Seller',
      categoryId: input.categoryId,
      title: input.title.trim(),
      slug: uniqueSlug,
      description: input.description.trim(),
      price: input.price,
      stockQuantity: stock,
      status: ProductStatus.ACTIVE,
      condition: input.condition || 'NEW',
      images: input.images || [],
      attributes: input.attributes || {},
      allowAuction: Boolean(input.allowAuction),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 5. Lưu vào Database
    const newId = await this.productRepository.save(newProduct);

    return {
      id: newId,
      slug: uniqueSlug,
      title: newProduct.title,
    };
  }
}
