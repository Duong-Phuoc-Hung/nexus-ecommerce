import { Shipment } from '../entities/Shipment';

export interface IShipmentRepository {
  findById(id: string): Promise<Shipment | null>;
  findByOrderId(orderId: string): Promise<Shipment | null>;
  save(shipment: Shipment): Promise<void>;
  update(shipment: Shipment): Promise<void>;
}
