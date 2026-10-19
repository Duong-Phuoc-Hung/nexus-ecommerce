/**
 * =============================================================================
 * PROJECT NEXUS - NOTIFICATION & SYSTEM DOMAIN EVENTS (SRS 2.8 & SCRUM-37)
 * =============================================================================
 * Danh mục hợp đồng sự kiện thuộc Bounded Context Notification & System.
 * =============================================================================
 */

import { DomainEvent, DomainEventInitOptions } from './domain-event.base';

export interface NotificationDispatchedPayload {
  notificationId: string;
  recipientId: string;
  channel: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
  template: string;
  dispatchedAt: string;
}

export class NotificationDispatchedDomainEvent extends DomainEvent<NotificationDispatchedPayload> {
  public static readonly EVENT_TYPE = 'notification.dispatched';

  constructor(
    payload: NotificationDispatchedPayload,
    options?: Partial<
      Omit<
        DomainEventInitOptions<NotificationDispatchedPayload>,
        'type' | 'sourceService' | 'payload'
      >
    >,
  ) {
    super({
      ...options,
      type: NotificationDispatchedDomainEvent.EVENT_TYPE,
      sourceService: 'notification-service',
      payload,
    });
  }
}

export interface NotificationFailedPayload {
  notificationId: string;
  recipientId: string;
  channel: string;
  errorReason: string;
  failedAt: string;
}

export class NotificationFailedDomainEvent extends DomainEvent<NotificationFailedPayload> {
  public static readonly EVENT_TYPE = 'notification.failed';

  constructor(
    payload: NotificationFailedPayload,
    options?: Partial<
      Omit<DomainEventInitOptions<NotificationFailedPayload>, 'type' | 'sourceService' | 'payload'>
    >,
  ) {
    super({
      ...options,
      type: NotificationFailedDomainEvent.EVENT_TYPE,
      sourceService: 'notification-service',
      payload,
    });
  }
}

export interface SystemConfigUpdatedPayload {
  key: string;
  oldValue?: string;
  newValue: string;
  updatedBy: string;
  updatedAt: string;
}

export class SystemConfigUpdatedDomainEvent extends DomainEvent<SystemConfigUpdatedPayload> {
  public static readonly EVENT_TYPE = 'system.config_updated';

  constructor(
    payload: SystemConfigUpdatedPayload,
    options?: Partial<
      Omit<DomainEventInitOptions<SystemConfigUpdatedPayload>, 'type' | 'sourceService' | 'payload'>
    >,
  ) {
    super({
      ...options,
      type: SystemConfigUpdatedDomainEvent.EVENT_TYPE,
      sourceService: 'system',
      payload,
    });
  }
}

export interface MessageBrokerStatusPayload {
  brokerType: 'RABBITMQ';
  endpoint: string;
  timestamp: string;
  reason?: string;
}

export class MessageBrokerUnavailableDomainEvent extends DomainEvent<MessageBrokerStatusPayload> {
  public static readonly EVENT_TYPE = 'system.broker_unavailable';

  constructor(
    payload: MessageBrokerStatusPayload,
    options?: Partial<
      Omit<DomainEventInitOptions<MessageBrokerStatusPayload>, 'type' | 'sourceService' | 'payload'>
    >,
  ) {
    super({
      ...options,
      type: MessageBrokerUnavailableDomainEvent.EVENT_TYPE,
      sourceService: 'system',
      payload,
    });
  }
}

export class MessageBrokerRecoveredDomainEvent extends DomainEvent<MessageBrokerStatusPayload> {
  public static readonly EVENT_TYPE = 'system.broker_recovered';

  constructor(
    payload: MessageBrokerStatusPayload,
    options?: Partial<
      Omit<DomainEventInitOptions<MessageBrokerStatusPayload>, 'type' | 'sourceService' | 'payload'>
    >,
  ) {
    super({
      ...options,
      type: MessageBrokerRecoveredDomainEvent.EVENT_TYPE,
      sourceService: 'system',
      payload,
    });
  }
}
