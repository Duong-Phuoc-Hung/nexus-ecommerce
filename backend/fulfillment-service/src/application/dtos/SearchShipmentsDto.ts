import { ShipmentDetailDto } from './ShipmentDetailDto';

export interface SearchShipmentsQueryDto {
  query?: string;
  carrier?: string;
  status?: string;
  orderId?: string;
  trackingCode?: string;
  page?: number;
  limit?: number;
}

export interface SearchShipmentsResultDto {
  items: ShipmentDetailDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
