/**
 * Project Nexus - Common Status Enums (SRS Section 2.7 & Domain Models)
 */

export enum ProductStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  SHIPPED = 'SHIPPED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum AuctionStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
  SETTLED = 'SETTLED',
  CANCELLED = 'CANCELLED',
}

export enum ShipmentStatus {
  CREATED = 'CREATED',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  RETURNED = 'RETURNED',
}

export enum TrustLevel {
  NEWBORN = 'NEWBORN',
  STANDARD = 'STANDARD',
  TRUSTED = 'TRUSTED',
  VIP = 'VIP',
  SUSPENDED = 'SUSPENDED',
}
