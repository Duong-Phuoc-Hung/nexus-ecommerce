import { CarrierCode, Shipment, ShipmentStatus } from '../entities/Shipment';

export interface ShipmentSearchCriteria {
  query?: string;
  carrier?: CarrierCode | string;
  status?: ShipmentStatus | string;
  orderId?: string;
  trackingCode?: string;
  page?: number;
  limit?: number;
}

export interface ShipmentSearchPage {
  items: Shipment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SupportCaseItem {
  id: string;
  type: string;
  order: string;
  orderId?: string;
  customer: string;
  reason: string;
  priority: 'Cao' | 'Trung bình' | 'Thấp' | string;
  age: string;
  status?: string;
}

export interface FulfillmentDashboardSummary {
  pendingCases: number;
  processingCases: number;
  resolvedToday: number;
  flaggedShipments: number;
  metrics: {
    highPriorityCount: number;
    nearOverdueCount: number;
    averageHandlingTimeMinutes: number;
    updatedTodayCount: number;
  };
  recentCases: SupportCaseItem[];
}

export interface IShipmentRepository {
  findById(id: string): Promise<Shipment | null>;
  findByTrackingCode(trackingCode: string): Promise<Shipment | null>;
  findByOrderId(orderId: string): Promise<Shipment | null>;
  search(criteria: ShipmentSearchCriteria): Promise<ShipmentSearchPage>;
  save(shipment: Shipment): Promise<void>;
  update(shipment: Shipment): Promise<void>;
  getDashboardSummary(): Promise<FulfillmentDashboardSummary>;
}
