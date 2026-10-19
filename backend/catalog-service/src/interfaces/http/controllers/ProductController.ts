import { Request, Response } from 'express';
import { GetProductDetailUseCase } from '../../../application/use-cases/GetProductDetailUseCase';
import { ProductNotFoundException } from '../../../domain/exceptions/ProductNotFoundException';
import { IProductRepository } from '../../../domain/repositories/IProductRepository';
import { SearchProductsUseCase } from '../../../application/use-cases/SearchProductsUseCase';
import { parseSearchProductsQuery } from '../dtos/SearchProductsQueryDto';

export class ProductController {
  constructor(
    private readonly getProductDetailUseCase: GetProductDetailUseCase,
    private readonly productRepository: IProductRepository,
    private readonly searchProductsUseCase: SearchProductsUseCase,
  ) {}

  public async search(req: Request, res: Response): Promise<void> {
    const validation = parseSearchProductsQuery(req.query as Record<string, unknown>);
    if (!validation.valid) {
      res.status(400).json({ success: false, error: validation.error });
      return;
    }

    try {
      const result = await this.searchProductsUseCase.execute(validation.value);
      res.status(200).json({
        success: true,
        data: result.products.map((product) => ({
          id: product.id,
          sellerId: product.sellerId,
          categoryId: product.categoryId,
          title: product.title,
          price: product.price,
          stockQuantity: product.stockQuantity,
          status: product.status,
        })),
        meta: result.meta,
      });
    } catch {
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }

  public async getAll(_req: Request, res: Response): Promise<void> {
    const products = await this.productRepository.findAll();
    res.status(200).json({
      success: true,
      data: products.map((p) => ({
        id: p.id,
        sellerId: p.sellerId,
        categoryId: p.categoryId,
        title: p.title,
        description: p.description,
        price: p.price,
        stockQuantity: p.stockQuantity,
        status: p.status,
        images: p.images,
        primaryImage: p.primaryImage,
        condition: p.condition,
        slug: p.slug,
        allowAuction: p.allowAuction,
        attributes: p.attributes,
      })),
    });
  }

  public async getById(req: Request, res: Response): Promise<void> {
    try {
      const productId = req.params.id as string;
      const product = await this.getProductDetailUseCase.execute(productId);
      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      if (error instanceof ProductNotFoundException) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
      });
    }
  }
}
