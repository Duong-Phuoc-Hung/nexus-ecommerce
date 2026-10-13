import { IShipmentRepository } from '../../domain/repositories/IShipmentRepository';
import { CarrierCode, Shipment, ShipmentStatus } from '../../domain/entities/Shipment';

export class InMemoryShipmentRepository implements IShipmentRepository {
  private readonly shipments: Map<string, Shipment> = new Map();

  constructor() {
    const sampleShipment = new Shipment({
      id: 'shp_01hqz222trk',
      orderId: 'ord_01hqz555abc',
      carrier: CarrierCode.GHN,
      trackingCode: 'GHN8829103VN',
      status: ShipmentStatus.IN_TRANSIT,
      shippingAddress: '123 Nguyen Hue, District 1, Ho Chi Minh City',
      estimatedDeliveryDate: new Date(Date.now() + 86400 * 2 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this.shipments.set(sampleShipment.id, sampleShipment);
  }

  public async findById(id: string): Promise<Shipment | null> {
    return this.shipments.get(id) || null;
  }

  public async findByOrderId(orderId: string): Promise<Shipment | null> {
    for (const s of this.shipments.values()) {
      if (s.orderId === orderId) {
        return s;
      }
    }
    return null;
  }

  public async save(shipment: Shipment): Promise<void> {
    this.shipments.set(shipment.id, shipment);
  }

  public async update(shipment: Shipment): Promise<void> {
    this.shipments.set(shipment.id, shipment);
  }
}
