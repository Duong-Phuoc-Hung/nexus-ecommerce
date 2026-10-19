/**
 * =============================================================================
 * PROJECT NEXUS - USER & IAM DOMAIN EVENTS (SRS 2.8 & SCRUM-37)
 * =============================================================================
 * Danh mục hợp đồng sự kiện thuộc Bounded Context User & IAM (user-service).
 * =============================================================================
 */

import { DomainEvent, DomainEventInitOptions } from './domain-event.base';

export interface UserRegisteredPayload {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  registeredAt: string;
}

export class UserRegisteredDomainEvent extends DomainEvent<UserRegisteredPayload> {
  public static readonly EVENT_TYPE = 'user.registered';

  constructor(
    payload: UserRegisteredPayload,
    options?: Partial<
      Omit<DomainEventInitOptions<UserRegisteredPayload>, 'type' | 'sourceService' | 'payload'>
    >,
  ) {
    super({
      ...options,
      type: UserRegisteredDomainEvent.EVENT_TYPE,
      sourceService: 'user-service',
      payload,
    });
  }
}

export interface UserUpdatedPayload {
  userId: string;
  email?: string;
  fullName?: string;
  phoneNumber?: string;
  updatedAt: string;
}

export class UserUpdatedDomainEvent extends DomainEvent<UserUpdatedPayload> {
  public static readonly EVENT_TYPE = 'user.updated';

  constructor(
    payload: UserUpdatedPayload,
    options?: Partial<
      Omit<DomainEventInitOptions<UserUpdatedPayload>, 'type' | 'sourceService' | 'payload'>
    >,
  ) {
    super({
      ...options,
      type: UserUpdatedDomainEvent.EVENT_TYPE,
      sourceService: 'user-service',
      payload,
    });
  }
}

export interface UserPasswordResetRequestedPayload {
  userId: string;
  email: string;
  resetToken: string;
  expiresAt: string;
}

export class UserPasswordResetRequestedDomainEvent extends DomainEvent<UserPasswordResetRequestedPayload> {
  public static readonly EVENT_TYPE = 'user.password_reset_requested';

  constructor(
    payload: UserPasswordResetRequestedPayload,
    options?: Partial<
      Omit<
        DomainEventInitOptions<UserPasswordResetRequestedPayload>,
        'type' | 'sourceService' | 'payload'
      >
    >,
  ) {
    super({
      ...options,
      type: UserPasswordResetRequestedDomainEvent.EVENT_TYPE,
      sourceService: 'user-service',
      payload,
    });
  }
}

export interface UserRoleAssignedPayload {
  userId: string;
  oldRole: string;
  newRole: string;
  assignedBy: string;
  assignedAt: string;
}

export class UserRoleAssignedDomainEvent extends DomainEvent<UserRoleAssignedPayload> {
  public static readonly EVENT_TYPE = 'user.role_assigned';

  constructor(
    payload: UserRoleAssignedPayload,
    options?: Partial<
      Omit<DomainEventInitOptions<UserRoleAssignedPayload>, 'type' | 'sourceService' | 'payload'>
    >,
  ) {
    super({
      ...options,
      type: UserRoleAssignedDomainEvent.EVENT_TYPE,
      sourceService: 'user-service',
      payload,
    });
  }
}

export interface UserLockedPayload {
  userId: string;
  email: string;
  reason: string;
  failedAttempts: number;
  lockedAt: string;
}

export class UserLockedDomainEvent extends DomainEvent<UserLockedPayload> {
  public static readonly EVENT_TYPE = 'user.locked';

  constructor(
    payload: UserLockedPayload,
    options?: Partial<
      Omit<DomainEventInitOptions<UserLockedPayload>, 'type' | 'sourceService' | 'payload'>
    >,
  ) {
    super({
      ...options,
      type: UserLockedDomainEvent.EVENT_TYPE,
      sourceService: 'user-service',
      payload,
    });
  }
}
