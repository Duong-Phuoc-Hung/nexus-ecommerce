import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { Order, OrderStatus } from '../../domain/entities/Order';

export class InMemoryOrderRepository implements IOrderRepository {
  private readonly orders: Map<string, Order> = new Map();

  constructor() {
    const sampleOrder = new Order({
      id: 'ord_01hqz555abc',
      buyerId: 'usr_01hqz789abc',
      sellerId: 'usr_01hqz333sel',
      items: [
        {
          productId: 'prod_01hqz999xyz',
          quantity: 1,
          unitPrice: 399.99,
          totalPrice: 399.99,
        },
      ],
      totalAmount: 399.99,
      status: OrderStatus.PAID,
      paymentTransactionId: 'pi_3MtwxAEhyASWD2Re1fA5sample',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this.orders.set(sampleOrder.id, sampleOrder);
  }

  public async findById(id: string): Promise<Order | null> {
    return this.orders.get(id) || null;
  }

  public async findByBuyerId(buyerId: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter((o) => o.buyerId === buyerId);
  }

  public async save(order: Order): Promise<void> {
    this.orders.set(order.id, order);
  }

  public async update(order: Order): Promise<void> {
    this.orders.set(order.id, order);
  }
}
