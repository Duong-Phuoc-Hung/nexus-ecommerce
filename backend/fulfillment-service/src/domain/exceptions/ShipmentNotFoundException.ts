export class ShipmentNotFoundException extends Error {
  constructor(identifier: string) {
    super(`Shipment "${identifier}" was not found.`);
    this.name = 'ShipmentNotFoundException';
  }
}
