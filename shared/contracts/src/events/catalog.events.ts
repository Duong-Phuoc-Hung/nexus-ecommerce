/**
 * =============================================================================
 * PROJECT NEXUS - PRODUCT CATALOG DOMAIN EVENTS (SRS 2.8 & SCRUM-37)
 * =============================================================================
 * Danh mục hợp đồng sự kiện thuộc Bounded Context Catalog (catalog-service).
 * =============================================================================
 */

import { DomainEvent, DomainEventInitOptions } from './domain-event.base';

export interface ProductCreatedPayload {
  productId: string;
  sellerId: string;
  title: string;
  price: number;
  stockQuantity: number;
  categoryId?: string;
  createdAt: string;
}

export class ProductCreatedDomainEvent extends DomainEvent<ProductCreatedPayload> {
  public static readonly EVENT_TYPE = 'catalog.product.created';

  constructor(
    payload: ProductCreatedPayload,
    options?: Partial<
      Omit<DomainEventInitOptions<ProductCreatedPayload>, 'type' | 'sourceService' | 'payload'>
    >,
  ) {
    super({
      ...options,
      type: ProductCreatedDomainEvent.EVENT_TYPE,
      sourceService: 'catalog-service',
      payload,
    });
  }
}

export interface ProductUpdatedPayload {
  productId: string;
  sellerId: string;
  title?: string;
  price?: number;
  stockQuantity?: number;
  updatedAt: string;
}

export class ProductUpdatedDomainEvent extends DomainEvent<ProductUpdatedPayload> {
  public static readonly EVENT_TYPE = 'catalog.product.updated';

  constructor(
    payload: ProductUpdatedPayload,
    options?: Partial<
      Omit<DomainEventInitOptions<ProductUpdatedPayload>, 'type' | 'sourceService' | 'payload'>
    >,
  ) {
    super({
      ...options,
      type: ProductUpdatedDomainEvent.EVENT_TYPE,
      sourceService: 'catalog-service',
      payload,
    });
  }
}

export interface ProductStatusChangedPayload {
  productId: string;
  oldStatus: string;
  newStatus: string;
  changedBy: string;
  changedAt: string;
}

export class ProductStatusChangedDomainEvent extends DomainEvent<ProductStatusChangedPayload> {
  public static readonly EVENT_TYPE = 'catalog.product.status_changed';

  constructor(
    payload: ProductStatusChangedPayload,
    options?: Partial<
      Omit<
        DomainEventInitOptions<ProductStatusChangedPayload>,
        'type' | 'sourceService' | 'payload'
      >
    >,
  ) {
    super({
      ...options,
      type: ProductStatusChangedDomainEvent.EVENT_TYPE,
      sourceService: 'catalog-service',
      payload,
    });
  }
}

export interface CategoryCreatedPayload {
  categoryId: string;
  name: string;
  slug: string;
  parentId?: string;
  createdAt: string;
}

export class CategoryCreatedDomainEvent extends DomainEvent<CategoryCreatedPayload> {
  public static readonly EVENT_TYPE = 'catalog.category.created';

  constructor(
    payload: CategoryCreatedPayload,
    options?: Partial<
      Omit<DomainEventInitOptions<CategoryCreatedPayload>, 'type' | 'sourceService' | 'payload'>
    >,
  ) {
    super({
      ...options,
      type: CategoryCreatedDomainEvent.EVENT_TYPE,
      sourceService: 'catalog-service',
      payload,
    });
  }
}
