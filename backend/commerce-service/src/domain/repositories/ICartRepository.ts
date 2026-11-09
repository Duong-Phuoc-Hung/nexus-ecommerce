export interface CartRecord {
  id: string;
  userId: string;
  expiresAt: Date;
}

export interface CartItemRecord {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Interface trừu tượng tuân thủ Dependency Inversion Principle (DIP / DDD)
 * Giúp CartService độc lập với cơ chế lưu trữ (Postgres, InMemory, v.v.)
 */
export interface ICartRepository {
  getOrCreateCart(userId: string): Promise<CartRecord>;
  getCartItems(cartId: string): Promise<CartItemRecord[]>;
  addItem(cartId: string, productId: string, quantity: number, unitPrice: number): Promise<void>;
  updateItemQuantity(cartId: string, itemId: string, quantity: number): Promise<boolean>;
  removeItem(cartId: string, itemId: string): Promise<boolean>;
  clearCart(cartId: string): Promise<void>;
  countActiveCarts(userId: string): Promise<number>;
}
