import { IProductRepository } from '../../domain/repositories/IProductRepository';
import { ProductNotFoundException } from '../../domain/exceptions/ProductNotFoundException';
import { ProductDetailDto } from '../dtos/ProductDetailDto';

export class GetProductDetailUseCase {
  constructor(private readonly productRepository: IProductRepository) {}

  public async execute(productId: string): Promise<ProductDetailDto> {
    const product = await this.productRepository.findById(productId);

    if (!product) {
      throw new ProductNotFoundException(productId);
    }

    return {
      id: product.id,
      sellerId: product.sellerId,
      categoryId: product.categoryId,
      title: product.title,
      description: product.description,
      price: product.price,
      currency: 'VND',
      stockQuantity: product.stockQuantity,
      status: product.status,
      createdAt: product.createdAt.toISOString(),
      images: product.images,
      primaryImage: product.primaryImage,
      attributes: product.attributes,
      condition: product.condition,
      slug: product.slug,
      allowAuction: product.allowAuction,
    };
  }
}
