import { PrismaClient } from '@prisma/client';
import { PrismaClientWrapper } from '../database/PrismaClient';
import {
  IProductRepository,
  ProductSearchCriteria,
  ProductSearchPage,
} from '../../domain/repositories/IProductRepository';
import { Product, ProductStatus } from '../../domain/entities/Product';
import {
  ListCatalogProductsQuery,
  ListCatalogProductsResult,
} from '../../application/use-cases/ListCatalogProductsUseCase';

export class PostgresProductRepository implements IProductRepository {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || PrismaClientWrapper.getInstance();
  }

  // 1. Xem chi tiết sản phẩm theo ID hoặc Slug
  public async findById(id: string): Promise<Product | null> {
    const isNumeric = /^\d+$/.test(id);
    const row = isNumeric
      ? await this.prisma.product.findFirst({
          where: { id: BigInt(id), deletedAt: null },
          include: { images: { orderBy: { displayOrder: 'asc' } }, attributes: true },
        })
      : await this.prisma.product.findFirst({
          where: { slug: id, deletedAt: null },
          include: { images: { orderBy: { displayOrder: 'asc' } }, attributes: true },
        });

    if (!row) return null;
    return this.mapRowToProduct(row);
  }

  // 2. Lấy danh sách sản phẩm đang bán ngoài trang chủ
  public async findAll(limit: number = 20, offset: number = 0): Promise<Product[]> {
    const rows = await this.prisma.product.findMany({
      where: { status: 'ACTIVE', deletedAt: null },
      skip: offset,
      take: limit,
      include: { images: { orderBy: { displayOrder: 'asc' } }, attributes: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.mapRowToProduct(r));
  }

  // 3. Lọc sản phẩm theo mã danh mục
  public async findByCategory(categoryId: string): Promise<Product[]> {
    const rows = await this.prisma.product.findMany({
      where: { categoryId: BigInt(categoryId), status: 'ACTIVE', deletedAt: null },
      include: { images: { orderBy: { displayOrder: 'asc' } }, attributes: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.mapRowToProduct(r));
  }

  // 4. Xem kho hàng của Seller (kèm lọc trạng thái nếu có)
  public async findBySellerId(sellerId: string, status?: string): Promise<Product[]> {
    const where: any = { sellerId, deletedAt: null };
    if (status) where.status = status;

    const rows = await this.prisma.product.findMany({
      where,
      include: { images: { orderBy: { displayOrder: 'asc' } }, attributes: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.mapRowToProduct(r));
  }

  // 5. Tìm kiếm sản phẩm theo từ khóa q và khoảng giá
  public async search(criteria: ProductSearchCriteria): Promise<ProductSearchPage> {
    const where: any = {
      deletedAt: null,
      status: 'ACTIVE',
      OR: [
        { title: { contains: criteria.q, mode: 'insensitive' } },
        { description: { contains: criteria.q, mode: 'insensitive' } },
      ],
    };

    if (criteria.categoryId) where.categoryId = BigInt(criteria.categoryId);
    if (criteria.minPrice !== undefined) {
      where.basePrice = { ...where.basePrice, gte: criteria.minPrice };
    }
    if (criteria.maxPrice !== undefined) {
      where.basePrice = { ...where.basePrice, lte: criteria.maxPrice };
    }

    const [total, rows] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip: criteria.offset,
        take: criteria.limit,
        include: { images: { orderBy: { displayOrder: 'asc' } }, attributes: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      products: rows.map((r) => this.mapRowToProduct(r)),
      total,
    };
  }

  // 6. Danh sách sản phẩm nâng cao (hỗ trợ phân trang, bộ lọc và quyền Admin scope=admin)
  public async list(query: ListCatalogProductsQuery): Promise<ListCatalogProductsResult> {
    const where: any = {};
    if (query.scope === 'buyer') {
      where.deletedAt = null;
      where.status = 'ACTIVE';
    } else if (query.status) {
      where.status = query.status;
    }

    if (query.categoryId) where.categoryId = BigInt(query.categoryId);
    if (query.condition) where.condition = query.condition;
    if (query.saleType === 'AUCTION') where.allowAuction = true;
    else if (query.saleType === 'FIXED_PRICE') where.allowAuction = false;

    if (query.minPrice !== undefined) {
      where.basePrice = { ...where.basePrice, gte: query.minPrice };
    }
    if (query.maxPrice !== undefined) {
      where.basePrice = { ...where.basePrice, lte: query.maxPrice };
    }

    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    let orderBy: any = { createdAt: 'desc' };
    if (query.sort === 'oldest') orderBy = { createdAt: 'asc' };
    else if (query.sort === 'price_asc') orderBy = { basePrice: 'asc' };
    else if (query.sort === 'price_desc') orderBy = { basePrice: 'desc' };

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));

    const [total, rows] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { images: { orderBy: { displayOrder: 'asc' } }, attributes: true },
        orderBy,
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      products: rows.map((r) => this.mapRowToProduct(r)),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  // 7. Tạo sản phẩm mới (kèm bộ sưu tập ảnh và thông số kỹ thuật)
  public async save(product: Product): Promise<string> {
    const created = await this.prisma.product.create({
      data: {
        sellerId: product.sellerId,
        categoryId: BigInt(product.categoryId),
        title: product.title,
        slug:
          product.slug ||
          product.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') +
            '-' +
            Date.now(),
        description: product.description,
        status: product.status,
        condition: product.condition,
        basePrice: product.price,
        allowAuction: product.allowAuction,
        images: {
          create: product.images.map((url, idx) => ({
            imageUrl: url,
            displayOrder: idx + 1,
            isPrimary: idx === 0,
          })),
        },
        attributes: {
          create: Object.entries(product.attributes || {}).map(([key, val]) => ({
            attributeKey: key,
            attributeValue: String(val),
          })),
        },
      },
    });

    return String(created.id);
  }

  // 8. Cập nhật sản phẩm (chạy trong transaction để cập nhật đồng bộ cả ảnh và thuộc tính)
  public async update(product: Product): Promise<void> {
    const pId = BigInt(product.id);

    await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: pId },
        data: {
          title: product.title,
          description: product.description,
          categoryId: BigInt(product.categoryId),
          basePrice: product.price,
          status: product.status,
          condition: product.condition,
          allowAuction: product.allowAuction,
        },
      });

      if (product.images && product.images.length > 0) {
        await tx.productImage.deleteMany({ where: { productId: pId } });
        await tx.productImage.createMany({
          data: product.images.map((url, idx) => ({
            productId: pId,
            imageUrl: url,
            displayOrder: idx + 1,
            isPrimary: idx === 0,
          })),
        });
      }

      if (product.attributes && Object.keys(product.attributes).length > 0) {
        await tx.productAttribute.deleteMany({ where: { productId: pId } });
        await tx.productAttribute.createMany({
          data: Object.entries(product.attributes).map(([key, val]) => ({
            productId: pId,
            attributeKey: key,
            attributeValue: String(val),
          })),
        });
      }
    });
  }

  // 9. Xóa mềm sản phẩm (chuyển trạng thái sang ARCHIVED và ghi nhận thời điểm xóa)
  public async delete(id: string): Promise<void> {
    await this.prisma.product.update({
      where: { id: BigInt(id) },
      data: {
        deletedAt: new Date(),
        status: 'ARCHIVED',
      },
    });
  }

  // 10. Khôi phục sản phẩm đã xóa mềm (đặt lại deletedAt = null và status = ACTIVE)
  public async recover(id: string, sellerId?: string): Promise<void> {
    const where: any = { id: BigInt(id) };
    if (sellerId) where.sellerId = sellerId;

    await this.prisma.product.updateMany({
      where,
      data: {
        deletedAt: null,
        status: 'ACTIVE',
      },
    });
  }

  // Hàm chuyển đổi từ dữ liệu thô của Prisma sang đối tượng Domain Product
  private mapRowToProduct(row: any): Product {
    const images = (row.images || []).map((img: any) => img.imageUrl);
    const attributes: Record<string, string> = {};
    (row.attributes || []).forEach((attr: any) => {
      attributes[attr.attributeKey] = attr.attributeValue;
    });

    return new Product({
      id: String(row.id),
      sellerId: row.sellerId,
      sellerName: 'Nexus Official Store',
      categoryId: String(row.categoryId),
      title: row.title,
      slug: row.slug,
      description: row.description,
      status: row.status as ProductStatus,
      condition: row.condition,
      price: Number(row.basePrice),
      stockQuantity: 10,
      allowAuction: Boolean(row.allowAuction),
      images,
      attributes,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  }
}
