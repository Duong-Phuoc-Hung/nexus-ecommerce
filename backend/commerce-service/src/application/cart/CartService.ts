import { CatalogProduct, ICatalogClient } from '../checkout/ports';
import { ICartRepository } from '../../domain/repositories/ICartRepository';
import {
  AddToCartInputDto,
  CartDto,
  CartItemDto,
  CartItemStatus,
  CartSummaryDto,
  CartValidationError,
  MergeCartInputDto,
  ValidateCartInputDto,
} from './dtos/AddToCartDto';
import { PromotionService } from '../promotion/PromotionService';

export { CartValidationError } from './dtos/AddToCartDto';

export class CartService {
  constructor(
    private readonly repository: ICartRepository,
    private readonly catalog: ICatalogClient,
    private readonly promotionService?: PromotionService,
  ) {}

  public async getCart(userId: string): Promise<CartDto> {
    const cart = await this.repository.getOrCreateCart(userId);
    const dbItems = await this.repository.getCartItems(cart.id);

    const items: CartItemDto[] = [];
    let subtotal = 0;
    let totalItems = 0;

    for (const item of dbItems) {
      let product: CatalogProduct | null = null;
      let isCatalogError = false;

      try {
        product = await this.catalog.findProduct(item.productId);
      } catch {
        isCatalogError = true;
      }

      const title = product?.title || `Sản phẩm #${item.productId}`;
      const sellerId = product?.sellerId || '';
      const snapshotUnitPrice = Number(item.unitPrice);
      const currentUnitPrice = product ? Number(product.price) : snapshotUnitPrice;
      const availableStock = product ? Number(product.stockQuantity) : 0;
      const productStatus = product ? product.status : isCatalogError ? 'UNKNOWN' : 'UNAVAILABLE';
      const availability: 'AVAILABLE' | 'UNAVAILABLE' | 'UNKNOWN' = product
        ? product.status === 'ACTIVE' && product.stockQuantity > 0
          ? 'AVAILABLE'
          : 'UNAVAILABLE'
        : isCatalogError
          ? 'UNKNOWN'
          : 'UNAVAILABLE';
      const imageUrl = product?.imageUrl || null;

      // Determine advanced item status according to SRS B05
      let itemStatus: CartItemStatus = 'OK';
      let warningMessage: string | null = null;
      let canCheckout = true;

      if (!product || product.status !== 'ACTIVE') {
        itemStatus = 'UNAVAILABLE';
        warningMessage = 'Sản phẩm hiện không khả dụng hoặc đã ngừng bán.';
        canCheckout = false;
      } else if (availableStock === 0) {
        itemStatus = 'OUT_OF_STOCK';
        warningMessage = 'Sản phẩm hiện đã hết hàng.';
        canCheckout = false;
      } else if (item.quantity > availableStock) {
        itemStatus = 'INSUFFICIENT_STOCK';
        warningMessage = `Số lượng trong giỏ (${item.quantity}) vượt quá tồn kho hiện có (${availableStock}).`;
        canCheckout = false;
      } else if (currentUnitPrice !== snapshotUnitPrice) {
        itemStatus = 'PRICE_CHANGED';
        const formattedOld = new Intl.NumberFormat('vi-VN').format(snapshotUnitPrice);
        const formattedNew = new Intl.NumberFormat('vi-VN').format(currentUnitPrice);
        if (currentUnitPrice > snapshotUnitPrice) {
          warningMessage = `Giá sản phẩm vừa tăng từ ${formattedOld} ₫ lên ${formattedNew} ₫.`;
        } else {
          warningMessage = `Giá sản phẩm vừa giảm từ ${formattedOld} ₫ xuống ${formattedNew} ₫.`;
        }
        canCheckout = true;
      }

      const itemSubtotal = currentUnitPrice * item.quantity;
      subtotal += itemSubtotal;
      totalItems += item.quantity;

      items.push({
        id: item.id,
        productId: item.productId,
        title,
        sellerId,
        price: currentUnitPrice,
        stockQuantity: availableStock,
        status: productStatus,
        quantity: item.quantity,
        subtotal: itemSubtotal,
        imageUrl,
        availability,
        snapshotUnitPrice,
        currentUnitPrice,
        availableStock,
        productStatus,
        itemStatus,
        warningMessage,
        canCheckout,
      });
    }

    const summary: CartSummaryDto = {
      subtotal,
      estimatedDiscount: 0,
      estimatedTax: 0,
      estimatedShipping: null,
      estimatedTotal: subtotal,
      currency: 'VND',
    };

    return {
      id: cart.id,
      userId: cart.userId,
      expiresAt: cart.expiresAt.toISOString(),
      totalItems,
      subtotal,
      currency: 'VND',
      items,
      summary,
      hasBlockingIssues: items.some((i) => !i.canCheckout),
      validatedAt: new Date().toISOString(),
    };
  }

  public async validateCart(
    userId: string,
    input: ValidateCartInputDto,
  ): Promise<{
    items: CartItemDto[];
    summary: CartSummaryDto;
    promo: any | null;
    hasBlockingIssues: boolean;
    validatedAt: string;
  }> {
    const items: CartItemDto[] = [];
    let subtotal = 0;

    for (const line of input.items) {
      let product: CatalogProduct | null = null;
      let isCatalogError = false;

      try {
        product = await this.catalog.findProduct(line.productId);
      } catch {
        isCatalogError = true;
      }

      const title = product?.title || `Sản phẩm #${line.productId}`;
      const sellerId = product?.sellerId || '';
      const currentUnitPrice = product ? Number(product.price) : 0;
      const availableStock = product ? Number(product.stockQuantity) : 0;
      const productStatus = product ? product.status : isCatalogError ? 'UNKNOWN' : 'UNAVAILABLE';
      const availability: 'AVAILABLE' | 'UNAVAILABLE' | 'UNKNOWN' = product
        ? product.status === 'ACTIVE' && product.stockQuantity > 0
          ? 'AVAILABLE'
          : 'UNAVAILABLE'
        : isCatalogError
          ? 'UNKNOWN'
          : 'UNAVAILABLE';
      const imageUrl = product?.imageUrl || null;

      let itemStatus: CartItemStatus = 'OK';
      let warningMessage: string | null = null;
      let canCheckout = true;

      if (!product || product.status !== 'ACTIVE') {
        itemStatus = 'UNAVAILABLE';
        warningMessage = 'Sản phẩm hiện không khả dụng hoặc đã ngừng bán.';
        canCheckout = false;
      } else if (availableStock === 0) {
        itemStatus = 'OUT_OF_STOCK';
        warningMessage = 'Sản phẩm hiện đã hết hàng.';
        canCheckout = false;
      } else if (line.quantity > availableStock) {
        itemStatus = 'INSUFFICIENT_STOCK';
        warningMessage = `Số lượng đặt (${line.quantity}) vượt quá tồn kho hiện có (${availableStock}).`;
        canCheckout = false;
      }

      const itemSubtotal = currentUnitPrice * line.quantity;
      subtotal += itemSubtotal;

      items.push({
        id: line.productId,
        productId: line.productId,
        title,
        sellerId,
        price: currentUnitPrice,
        stockQuantity: availableStock,
        status: productStatus,
        quantity: line.quantity,
        subtotal: itemSubtotal,
        imageUrl,
        availability,
        snapshotUnitPrice: currentUnitPrice,
        currentUnitPrice,
        availableStock,
        productStatus,
        itemStatus,
        warningMessage,
        canCheckout,
      });
    }

    let promoResult: any = null;
    let estimatedDiscount = 0;

    if (input.promoCode && this.promotionService) {
      promoResult = await this.promotionService.validatePromotion({
        code: input.promoCode,
        userId,
        subtotal,
        items: input.items,
      });
      if (promoResult.valid) {
        estimatedDiscount = promoResult.discountAmount;
      }
    }

    const summary: CartSummaryDto = {
      subtotal,
      estimatedDiscount,
      estimatedTax: 0,
      estimatedShipping: null,
      estimatedTotal: Math.max(0, subtotal - estimatedDiscount),
      currency: 'VND',
    };

    return {
      items,
      summary,
      promo: promoResult,
      hasBlockingIssues: items.some((i) => !i.canCheckout),
      validatedAt: new Date().toISOString(),
    };
  }

  public async addItem(userId: string, input: AddToCartInputDto): Promise<CartDto> {
    const { productId, quantity } = input;

    let product: CatalogProduct | null = null;
    try {
      product = await this.catalog.findProduct(productId);
    } catch {
      throw new CartValidationError(
        503,
        'CATALOG_UNAVAILABLE',
        'Không thể kết nối đến Catalog Service để xác minh sản phẩm.',
      );
    }

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

    // Kiểm tra số lượng tồn kho (stockQuantity)
    const availableStock = typeof product.stockQuantity === 'number' ? product.stockQuantity : 0;
    if (availableStock <= 0) {
      throw new CartValidationError(
        409,
        'OUT_OF_STOCK',
        `Sản phẩm "${product.title}" hiện đã hết hàng trong kho.`,
      );
    }

    const cart = await this.repository.getOrCreateCart(userId);
    const existingItems = await this.repository.getCartItems(cart.id);
    const existingItem = existingItems.find((it) => it.productId === product!.id);
    const currentQtyInCart = existingItem ? existingItem.quantity : 0;
    const requestedTotalQty = currentQtyInCart + quantity;

    if (requestedTotalQty > availableStock) {
      throw new CartValidationError(
        409,
        'INSUFFICIENT_STOCK',
        `Số lượng yêu cầu (${requestedTotalQty}) vượt quá tồn kho thực tế (${availableStock}).`,
        {
          quantity: `Kho chỉ còn ${availableStock} sản phẩm. Giỏ hàng của bạn hiện đã có ${currentQtyInCart} món.`,
        },
      );
    }

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
      const items = await this.repository.getCartItems(cart.id);
      const targetItem = items.find((it) => it.id === itemId || it.productId === itemId);
      if (targetItem) {
        let product: CatalogProduct | null = null;
        try {
          product = await this.catalog.findProduct(targetItem.productId);
        } catch {
          // ignore error
        }
        if (product) {
          const availableStock =
            typeof product.stockQuantity === 'number' ? product.stockQuantity : 0;
          if (cleanQty > availableStock) {
            throw new CartValidationError(
              409,
              'INSUFFICIENT_STOCK',
              `Số lượng yêu cầu (${cleanQty}) vượt quá tồn kho thực tế (${availableStock}).`,
              {
                quantity: `Kho chỉ còn tối đa ${availableStock} sản phẩm.`,
              },
            );
          }
        }
      }

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

  /**
   * SCRUM-167: Gộp giỏ hàng khách (Guest Cart từ LocalStorage) vào giỏ hàng tài khoản DB khi Buyer đăng nhập.
   * - Tự động đối chiếu tồn kho và giới hạn mua tối đa của sản phẩm.
   * - Nếu sản phẩm đã có trong giỏ hàng DB: cộng dồn số lượng.
   * - Nếu sản phẩm chưa có trong giỏ: thêm mới vào giỏ hàng.
   */
  public async mergeCart(userId: string, input: MergeCartInputDto): Promise<CartDto> {
    const cart = await this.repository.getOrCreateCart(userId);

    for (const item of input.items) {
      let product: CatalogProduct | null = null;
      try {
        product = await this.catalog.findProduct(item.productId);
      } catch {
        continue; // Bỏ qua sản phẩm lỗi kết nối để không làm đứt luồng gộp giỏ
      }

      if (!product || product.status !== 'ACTIVE' || product.sellerId === userId) {
        continue;
      }

      const availableStock = typeof product.stockQuantity === 'number' ? product.stockQuantity : 0;
      if (availableStock <= 0) {
        continue;
      }

      const currentItems = await this.repository.getCartItems(cart.id);
      const existingItem = currentItems.find((it) => it.productId === product!.id);

      if (existingItem) {
        const combinedQty = Math.min(existingItem.quantity + item.quantity, availableStock, 999);
        if (combinedQty !== existingItem.quantity) {
          await this.repository.updateItemQuantity(cart.id, existingItem.id, combinedQty);
        }
      } else {
        const initialQty = Math.min(item.quantity, availableStock, 999);
        if (initialQty > 0) {
          await this.repository.addItem(cart.id, product.id, initialQty, product.price);
        }
      }
    }

    return this.getCart(userId);
  }
}
