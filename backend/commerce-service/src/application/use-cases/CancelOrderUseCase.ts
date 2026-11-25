import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { OrderNotFoundException } from '../../domain/exceptions/OrderNotFoundException';
import { OrderStatus } from '../../domain/entities/Order';
import { OrderDetailDto } from '../dtos/OrderDetailDto';
import { GetOrderDetailUseCase } from './GetOrderDetailUseCase';
import { ICatalogClient } from '../checkout/ports';

export class CancelOrderUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly getOrderDetailUseCase: GetOrderDetailUseCase,
    private readonly catalogClient?: ICatalogClient,
  ) {}

  public async execute(orderId: string, reason?: string): Promise<OrderDetailDto> {
    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      throw new OrderNotFoundException(orderId);
    }

    const previousStatus = order.status;
    const stockWasDeducted =
      previousStatus === OrderStatus.PROCESSING ||
      previousStatus === OrderStatus.PAID ||
      previousStatus === OrderStatus.SHIPPED ||
      order.timeline.some(
        (t) => t.status === 'STOCK_DEDUCTED' || (t.note?.includes('STOCK_DEDUCTED') ?? false),
      );

    order.cancel(reason);
    await this.orderRepository.update(order);

    // GAP-LOG-01: Hoàn tồn kho Catalog nếu đơn đã từng trừ tồn kho (COD / PayOS đã PAID)
    if (
      previousStatus !== OrderStatus.CANCELLED &&
      stockWasDeducted &&
      this.catalogClient &&
      typeof this.catalogClient.restoreStock === 'function'
    ) {
      for (const item of order.items) {
        if (item.productId && item.quantity > 0) {
          try {
            await this.catalogClient.restoreStock(item.productId, item.quantity, order.id);
          } catch (err: any) {
            console.warn(
              `[CancelOrderUseCase] Không thể hoàn kho cho sản phẩm ${item.productId}:`,
              err?.message || err,
            );
          }
        }
      }
    }

    return this.getOrderDetailUseCase.execute(orderId);
  }
}
