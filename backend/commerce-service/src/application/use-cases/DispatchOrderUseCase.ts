import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { GetOrderDetailUseCase } from './GetOrderDetailUseCase';
import { OrderNotFoundException } from '../../domain/exceptions/OrderNotFoundException';
import { OrderDetailDto } from '../dtos/OrderDetailDto';
import { IShippingOrderClient } from '../ports/IShippingOrderClient';

export interface DispatchOrderInput {
  orderId: string;
  operatorId?: string;
  operatorRole?: string;
  carrierCode?: string;
  trackingCode?: string;
}

export class DispatchOrderUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly getOrderDetailUseCase: GetOrderDetailUseCase,
    private readonly shippingOrderClient?: IShippingOrderClient,
  ) {}

  public async execute(input: DispatchOrderInput): Promise<OrderDetailDto> {
    const order = await this.orderRepository.findById(input.orderId);

    if (!order) {
      throw new OrderNotFoundException(input.orderId);
    }

    // BẢO MẬT CHỐNG IDOR: Nếu role là SELLER, chỉ cho phép dispatch đơn thuộc gian hàng của mình
    if (
      input.operatorRole === 'SELLER' &&
      input.operatorId &&
      order.sellerId !== input.operatorId
    ) {
      throw new Error('Bạn không có quyền bàn giao đơn hàng của gian hàng khác.');
    }

    const carrier = input.carrierCode || 'GHN';
    let trackingCode = input.trackingCode;
    let awbBarcodeUrl: string | undefined;

    // Tự động tạo vận đơn sang 3PL (GHN Sandbox) nếu chưa có sẵn tracking code thủ công
    if (!trackingCode && this.shippingOrderClient) {
      try {
        const outbound = await this.shippingOrderClient.createShippingOrder({
          orderId: order.id,
          orderCode: order.id,
          recipientName: order.buyerName || 'Khách hàng',
          recipientPhone: order.buyerEmail || '0901234567',
          shippingAddress: 'Địa chỉ nhận hàng Nexus',
          items: order.items.map((it) => ({
            name: it.productName || 'Sản phẩm Nexus',
            quantity: it.quantity,
            price: it.unitPrice,
          })),
        });
        trackingCode = outbound.trackingCode;
        awbBarcodeUrl = outbound.awbBarcodeUrl;
      } catch (err: any) {
        console.warn('[DispatchOrderUseCase] Outbound carrier creation warning:', err.message);
      }
    }

    order.dispatch(trackingCode, carrier, awbBarcodeUrl);

    await this.orderRepository.update(order);

    // Tự động đồng bộ tạo vận đơn sang fulfillment-service phục vụ kiểm thử Sandbox (SRS 3.6)
    await this.syncToFulfillmentService(order, carrier, order.trackingCode || trackingCode || '');

    return this.getOrderDetailUseCase.execute(input.orderId);
  }

  private async syncToFulfillmentService(
    order: { id: string; buyerName?: string; buyerEmail?: string },
    carrier: string,
    trackingCode: string,
  ): Promise<void> {
    const fulfillmentUrl = (
      process.env.FULFILLMENT_SERVICE_URL ||
      `http://127.0.0.1:${process.env.FULFILLMENT_SERVICE_PORT || 4005}`
    ).replace(/\/$/, '');

    try {
      const payload = {
        orderId: order.id,
        carrier,
        trackingCode,
        shippingAddress: 'Địa chỉ nhận hàng Nexus (Sandbox)',
        recipientName: order.buyerName || 'Khách hàng',
        recipientPhone: order.buyerEmail || '0901234567',
        city: 'TP. Hồ Chí Minh',
        status: 'READY_TO_PICK',
      };

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${fulfillmentUrl}/api/v1/fulfillment/shipments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'usr_system',
          'x-user-role': 'ADMIN',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timer);

      if (res && !res.ok) {
        await fetch(`${fulfillmentUrl}/api/v1/fulfillments/shipments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': 'usr_system',
            'x-user-role': 'ADMIN',
          },
          body: JSON.stringify(payload),
        }).catch(() => null);
      }
    } catch (err: any) {
      console.warn('[DispatchOrderUseCase] Fulfillment sync warning:', err.message);
    }
  }
}
