import {
  IProductRepository,
  ProductFilterCriteria,
  ProductListPage,
  ProductSearchCriteria,
  ProductSearchPage,
} from '../../domain/repositories/IProductRepository';
import { Product, ProductStatus } from '../../domain/entities/Product';

export class InMemoryProductRepository implements IProductRepository {
  private readonly products: Map<string, Product> = new Map();

  constructor() {
    this.seedDefaultProducts();
  }

  private seedDefaultProducts(): void {
    const sampleProduct = new Product({
      id: 'prod_01hqz999xyz',
      sellerId: 'usr_01hqz789abc',
      sellerName: 'Sound Space Official',
      categoryId: 'cat_electronics',
      categoryName: 'Thiết bị điện tử',
      title: 'Sony WH-1000XM5 Wireless Headphones',
      description: 'Industry Leading Noise Canceling Wireless Headphones with Auto NC Optimizer',
      price: 399.99,
      currency: 'VND',
      stockQuantity: 50,
      status: ProductStatus.ACTIVE,
      condition: 'NEW',
      saleType: 'FIXED_PRICE',
      slug: 'sony-wh-1000xm5-wireless-headphones',
      images: [
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
        'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800',
      ],
      primaryImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
      attributes: { Brand: 'Sony', Connectivity: 'Bluetooth 5.2', Color: 'Black' },
      allowAuction: false,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    });

    const sampleProduct2 = new Product({
      id: 'prod_02hqz999iphone',
      sellerId: 'usr_01hqz789abc',
      sellerName: 'Apple Authorized Reseller',
      categoryId: '100',
      categoryName: 'iPhone',
      title: 'iPhone 15 Pro Max 256GB Titan Tự Nhiên',
      description: 'Thiết kế khung titan chuẩn hàng không vũ trụ siêu nhẹ và bền bỉ.',
      price: 29990000,
      currency: 'VND',
      stockQuantity: 20,
      status: ProductStatus.ACTIVE,
      condition: 'NEW',
      saleType: 'FIXED_PRICE',
      slug: 'iphone-15-pro-max-256gb-titan-tu-nhien',
      images: ['https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800'],
      primaryImage: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800',
      attributes: { Brand: 'Apple', Storage: '256GB', Color: 'Titanium' },
      allowAuction: false,
      createdAt: new Date('2026-01-02T00:00:00Z'),
      updatedAt: new Date('2026-01-02T00:00:00Z'),
    });

    const sampleDraftProduct = new Product({
      id: 'prod_03draft_watch',
      sellerId: 'usr_01hqz789abc',
      sellerName: 'Watch Collectors Hub',
      categoryId: '16',
      categoryName: 'Đồng hồ cao cấp',
      title: 'Đồng hồ cơ Rolex Submariner Date Bản Nháp',
      description: 'Bản nháp đang chờ duyệt thông số kiểm định.',
      price: 250000000,
      currency: 'VND',
      stockQuantity: 1,
      status: ProductStatus.DRAFT,
      condition: 'LIKE_NEW',
      saleType: 'FIXED_PRICE',
      slug: 'rolex-submariner-date-draft',
      images: ['https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800'],
      primaryImage: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800',
      allowAuction: false,
      createdAt: new Date('2026-01-03T00:00:00Z'),
      updatedAt: new Date('2026-01-03T00:00:00Z'),
    });

    this.products.set(sampleProduct.id, sampleProduct);
    this.products.set(sampleProduct2.id, sampleProduct2);
    this.products.set(sampleDraftProduct.id, sampleDraftProduct);
  }

  public async findById(id: string): Promise<Product | null> {
    const found = this.products.get(id);
    if (found) return found;
    for (const p of this.products.values()) {
      if (p.slug === id) return p;
    }
    return null;
  }

  public async findAll(limit = 50, offset = 0): Promise<Product[]> {
    const list = Array.from(this.products.values());
    return list.slice(offset, offset + limit);
  }

  public async findFiltered(criteria: ProductFilterCriteria): Promise<ProductListPage> {
    let items = Array.from(this.products.values());

    if (criteria.q) {
      const q = criteria.q.toLowerCase().trim();
      const normalize = (s: string) =>
        s
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/đ/g, 'd')
          .toLowerCase();

      const normalizedQ = normalize(q);

      items = items.filter(
        (p) =>
          normalize(p.title).includes(normalizedQ) ||
          normalize(p.description).includes(normalizedQ) ||
          (p.sellerName && normalize(p.sellerName).includes(normalizedQ)) ||
          (p.slug && normalize(p.slug).includes(normalizedQ)),
      );
    }

    if (criteria.categoryId) {
      items = items.filter(
        (p) =>
          p.categoryId === criteria.categoryId ||
          (criteria.categoryId === 'cat_electronics' &&
            (p.categoryId === '1' || p.categoryId === 'cat_electronics')),
      );
    }

    if (criteria.sellerId) {
      items = items.filter((p) => p.sellerId === criteria.sellerId);
    }

    if (criteria.status) {
      items = items.filter((p) => p.status === criteria.status);
    }

    if (criteria.condition) {
      items = items.filter((p) => p.condition === criteria.condition);
    }

    if (criteria.minPrice !== undefined) {
      items = items.filter((p) => p.price >= criteria.minPrice!);
    }

    if (criteria.maxPrice !== undefined) {
      items = items.filter((p) => p.price <= criteria.maxPrice!);
    }

    // Sắp xếp theo quy tắc
    if (criteria.sort === 'price-asc') {
      items.sort((a, b) => a.price - b.price);
    } else if (criteria.sort === 'price-desc') {
      items.sort((a, b) => b.price - a.price);
    } else if (criteria.sort === 'newest') {
      items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } else if (criteria.sort === 'oldest') {
      items.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    } else {
      // featured: mặc định sắp xếp theo mốc tạo mới nhất
      items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    const total = items.length;
    const offset = criteria.offset || 0;
    const limit = criteria.limit || 12;
    const paged = items.slice(offset, offset + limit);

    return { products: paged, total };
  }

  public async findByCategory(categoryId: string): Promise<Product[]> {
    return Array.from(this.products.values()).filter((p) => p.categoryId === categoryId);
  }

  public async search(criteria: ProductSearchCriteria): Promise<ProductSearchPage> {
    const keyword = criteria.q.toLocaleLowerCase();
    const matches = Array.from(this.products.values()).filter((product) => {
      if (!product.isAvailable()) return false;
      if (
        !product.title.toLocaleLowerCase().includes(keyword) &&
        !product.description.toLocaleLowerCase().includes(keyword)
      ) {
        return false;
      }
      if (criteria.categoryId && product.categoryId !== criteria.categoryId) return false;
      if (criteria.minPrice !== undefined && product.price < criteria.minPrice) return false;
      if (criteria.maxPrice !== undefined && product.price > criteria.maxPrice) return false;
      return true;
    });

    return {
      products: matches.slice(criteria.offset, criteria.offset + criteria.limit),
      total: matches.length,
    };
  }

  public async save(product: Product): Promise<void> {
    this.products.set(product.id, product);
  }

  public async update(product: Product): Promise<void> {
    this.products.set(product.id, product);
  }

  public async delete(id: string): Promise<void> {
    this.products.delete(id);
  }
}
