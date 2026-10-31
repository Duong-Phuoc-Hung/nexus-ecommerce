import { ICatalogClient } from '../checkout/ports';
import { PostgresCartRepository } from '../../infrastructure/repositories/PostgresCartRepository';
import { AddToCartInputDto, CartDto, CartItemDto, CartValidationError } from './dtos/AddToCartDto';

export { CartValidationError } from './dtos/AddToCartDto';

export class CartService {
  constructor(
    private readonly repository: PostgresCartRepository,
    private readonly catalog: ICatalogClient,
  ) {}

  public async getCart(userId: string): Promise<CartDto> {
    const cart = await this.repository.getOrCreateCart(userId);
    const dbItems = await this.repository.getCartItems(cart.id);

    const items: CartItemDto[] = [];
    let subtotal = 0;
    let totalItems = 0;

    for (const item of dbItems) {
      const product = await this.catalog.findProduct(item.productId).catch(() => null);
      const title = product?.title || `Sản phẩm #${item.productId}`;
      const sellerId = product?.sellerId || '';
      const price = product ? product.price : item.unitPrice;
      const stock = product ? product.stockQuantity : 99;
      const status = product ? product.status : 'ACTIVE';
      const itemSubtotal = price * item.quantity;

      subtotal += itemSubtotal;
      totalItems += item.quantity;

      items.push({
        id: item.id,
        productId: item.productId,
        title,
        sellerId,
        price,
        stockQuantity: stock,
        status,
        quantity: item.quantity,
        subtotal: itemSubtotal,
      });
    }

    return {
      id: cart.id,
      userId: cart.userId,
      expiresAt: cart.expiresAt.toISOString(),
      totalItems,
      subtotal,
      currency: 'VND',
      items,
    };
  }

  public async addItem(userId: string, input: AddToCartInputDto): Promise<CartDto> {
    const { productId, quantity } = input;

    const product = await this.catalog.findProduct(productId);
    if (!product) {
      throw new CartValidationError(
        404,
        'PRODUCT_NOT_FOUND',
        `Không tìm thấy sản phẩm #${productId}.`,
      );
    }
    if (product.status !== 'ACTIVE') {
      throw new CartValidationError(400, 'PRODUCT_INACTIVE', 'Sản phẩm này hiện không còn bán.');
    }
    if (product.sellerId === userId) {
      throw new CartValidationError(
        422,
        'CANNOT_BUY_OWN_PRODUCT',
        'Bạn không thể thêm sản phẩm của chính mình vào giỏ.',
      );
    }

    const cart = await this.repository.getOrCreateCart(userId);
    await this.repository.addItem(cart.id, product.id, quantity, product.price);

    return this.getCart(userId);
  }

  public async updateItemQuantity(
    userId: string,
    itemId: string,
    quantity: number,
  ): Promise<CartDto> {
    const cleanQty = Math.floor(quantity);
    const cart = await this.repository.getOrCreateCart(userId);

    if (cleanQty <= 0) {
      await this.repository.removeItem(cart.id, itemId);
    } else {
      const updated = await this.repository.updateItemQuantity(
        cart.id,
        itemId,
        Math.min(999, cleanQty),
      );
      if (!updated) {
        throw new CartValidationError(404, 'ITEM_NOT_FOUND', 'Món hàng không tồn tại trong giỏ.');
      }
    }

    return this.getCart(userId);
  }

  public async removeItem(userId: string, itemId: string): Promise<CartDto> {
    const cart = await this.repository.getOrCreateCart(userId);
    const removed = await this.repository.removeItem(cart.id, itemId);
    if (!removed) {
      throw new CartValidationError(404, 'ITEM_NOT_FOUND', 'Món hàng không tồn tại trong giỏ.');
    }
    return this.getCart(userId);
  }

  public async clearCart(userId: string): Promise<CartDto> {
    const cart = await this.repository.getOrCreateCart(userId);
    await this.repository.clearCart(cart.id);
    return this.getCart(userId);
  }
}
