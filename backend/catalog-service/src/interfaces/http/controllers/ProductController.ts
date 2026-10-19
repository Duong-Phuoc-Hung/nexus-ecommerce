import { Request, Response } from 'express';
import { GetProductDetailUseCase } from '../../../application/use-cases/GetProductDetailUseCase';
import { ProductNotFoundException } from '../../../domain/exceptions/ProductNotFoundException';
import { IProductRepository } from '../../../domain/repositories/IProductRepository';

export class ProductController {
  constructor(
    private readonly getProductDetailUseCase: GetProductDetailUseCase,
    private readonly productRepository: IProductRepository,
  ) {}

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
