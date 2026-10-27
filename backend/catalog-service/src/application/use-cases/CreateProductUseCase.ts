import { IProductRepository } from '../../domain/repositories/IProductRepository';
import { ICategoryRepository } from '../../domain/repositories/ICategoryRepository';
import { Product, ProductStatus } from '../../domain/entities/Product';
import {
  InvalidSellerAccountError,
  IUserDirectory,
  UserDirectoryUnavailableError,
} from '../ports/IUserDirectory';

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
  attributes?: Record<string, string>;
  allowAuction?: boolean;
  status?: ProductStatus;
  userRole?: string;
  accessToken?: string;
}

export class CreateProductUseCase {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly categoryRepository: ICategoryRepository,
    private readonly userDirectory?: IUserDirectory,
  ) {}

  public async execute(
    input: CreateProductInput,
  ): Promise<{ id: string; slug: string; title: string }> {
    // 1. Kiểm tra danh mục có tồn tại không
    const category = await this.categoryRepository.findById(input.categoryId);
    if (!category || !category.isActive) {
      throw new Error(`Danh mục với ID '${input.categoryId}' không tồn tại trong hệ thống.`);
    }

    if (!input.title.trim() || input.title.trim().length > 255) {
      throw new Error('Tên sản phẩm phải có từ 1 đến 255 ký tự.');
    }
    if (!input.description.trim()) {
      throw new Error('Mô tả sản phẩm là bắt buộc.');
    }
    if (!Number.isFinite(input.price) || input.price <= 0 || !/^\d+(\.\d{1,2})?$/.test(String(input.price))) {
      throw new Error('Giá sản phẩm phải lớn hơn 0 VND.');
    }
    const stock = input.stockQuantity !== undefined ? Number(input.stockQuantity) : 1;
    if (!Number.isSafeInteger(stock) || stock < 0) {
      throw new Error('Số lượng tồn kho phải là số nguyên không âm.');
    }
    const condition = input.condition || 'NEW';
    if (!['NEW', 'LIKE_NEW', 'USED', 'REFURBISHED'].includes(condition)) {
      throw new Error('Tình trạng sản phẩm không hợp lệ.');
    }
    if (input.status !== undefined && !Object.values(ProductStatus).includes(input.status)) {
      throw new Error('Trạng thái sản phẩm không hợp lệ.');
    }
    const images = input.images || [];
    if (
      !Array.isArray(images) ||
      images.length > 5 ||
      images.some((image) => {
        try {
          const url = new URL(image);
          return url.protocol !== 'http:' && url.protocol !== 'https:';
        } catch {
          return true;
        }
      })
    ) {
      throw new Error('Sản phẩm được phép có tối đa 5 ảnh URL HTTP hoặc HTTPS.');
    }

    let sellerId = input.sellerId;
    let sellerName = input.sellerName || 'Nexus Seller';
    if (input.userRole === 'ADMIN') {
      if (!sellerId) throw new Error('Admin phải chọn sellerId cho sản phẩm.');
      if (!this.userDirectory || !input.accessToken) {
        throw new UserDirectoryUnavailableError();
      }
      const seller = await this.userDirectory.findById(sellerId, input.accessToken);
      if (!seller || seller.role !== 'SELLER' || seller.status !== 'ACTIVE') {
        throw new InvalidSellerAccountError();
      }
      sellerId = seller.id;
      sellerName = seller.fullName;
    } else if (!sellerId) {
      throw new Error('Seller ID là bắt buộc.');
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
      sellerId,
      sellerName,
      categoryId: input.categoryId,
      title: input.title.trim(),
      slug: uniqueSlug,
      description: input.description.trim(),
      price: input.price,
      stockQuantity: stock,
      status: input.status || ProductStatus.ACTIVE,
      condition,
      images,
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
