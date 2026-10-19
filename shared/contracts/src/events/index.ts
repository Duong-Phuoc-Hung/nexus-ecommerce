/**
 * =============================================================================
 * PROJECT NEXUS - DOMAIN EVENTS PUBLIC API CONTRACTS (SCRUM-35, 36, 37)
 * =============================================================================
 */

// Base Type & Port Interface
export * from './domain-event.base';
export * from './event-publisher.interface';
export * from './in-memory-event-publisher';

// Domain Specific Events (SRS 2.8)
export * from './user.events';
export * from './catalog.events';
export * from './order.events';
export * from './auction.events';
export * from './fulfillment.events';
export * from './notification.events';
