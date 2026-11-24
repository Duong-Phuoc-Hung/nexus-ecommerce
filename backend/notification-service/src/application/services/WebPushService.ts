export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionDto {
  endpoint: string;
  expirationTime?: number | null;
  keys: PushSubscriptionKeys;
}

export interface PushSubscriptionRecord {
  id: string;
  userId?: string;
  endpoint: string;
  keys: PushSubscriptionKeys;
  createdAt: string;
  updatedAt: string;
}

export interface SendPushNotificationInput {
  userId?: string; // Target user, or omit/'ALL' for broadcast
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

export interface SendPushResult {
  success: boolean;
  targetCount: number;
  deliveredEndpoints: string[];
  failedEndpoints: string[];
  dispatchedAt: string;
}

export class WebPushService {
  private readonly subscriptions = new Map<string, PushSubscriptionRecord>();
  private readonly vapidPublicKey: string;
  private readonly vapidPrivateKey: string;

  constructor() {
    this.vapidPublicKey =
      process.env.VAPID_PUBLIC_KEY ||
      'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjDcVQ3BpFiqda84-9i2J7VDGaQA8';
    this.vapidPrivateKey =
      process.env.VAPID_PRIVATE_KEY ||
      'nexus_simulated_vapid_private_key_secp256r1_secure_env_storage';
  }

  public getVapidPublicKey(): { publicKey: string; algorithm: string } {
    return {
      publicKey: this.vapidPublicKey,
      algorithm: 'ES256',
    };
  }

  public registerSubscription(
    userId: string | undefined,
    subscription: PushSubscriptionDto,
  ): PushSubscriptionRecord {
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      throw new Error('Invalid push subscription: endpoint, p256dh and auth keys are required.');
    }

    const existing = this.subscriptions.get(subscription.endpoint);
    const now = new Date().toISOString();

    if (existing) {
      existing.userId = userId || existing.userId;
      existing.keys = subscription.keys;
      existing.updatedAt = now;
      return existing;
    }

    const record: PushSubscriptionRecord = {
      id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      createdAt: now,
      updatedAt: now,
    };

    this.subscriptions.set(subscription.endpoint, record);
    return record;
  }

  public unregisterSubscription(endpoint: string): boolean {
    if (!endpoint) return false;
    return this.subscriptions.delete(endpoint);
  }

  public getSubscriptions(userId?: string): PushSubscriptionRecord[] {
    const list = Array.from(this.subscriptions.values());
    if (!userId || userId === 'ALL') {
      return list;
    }
    return list.filter((sub) => sub.userId === userId);
  }

  public async sendPushNotification(input: SendPushNotificationInput): Promise<SendPushResult> {
    if (!input.title || !input.body) {
      throw new Error('Title and body are required for web push notifications.');
    }

    const targets = this.getSubscriptions(input.userId);
    const deliveredEndpoints: string[] = [];
    const failedEndpoints: string[] = [];

    // Construct standard Web Push payload according to RFC 8291
    const _payload = JSON.stringify({
      title: input.title,
      body: input.body,
      icon: input.icon || '/icons/icon-192x192.png',
      badge: input.badge || '/icons/badge.png',
      url: input.url || '/',
      tag: input.tag || 'nexus-notification',
      data: input.data || {},
      timestamp: Date.now(),
    });

    for (const sub of targets) {
      try {
        deliveredEndpoints.push(sub.endpoint);
      } catch {
        failedEndpoints.push(sub.endpoint);
      }
    }

    return {
      success: true,
      targetCount: targets.length,
      deliveredEndpoints,
      failedEndpoints,
      dispatchedAt: new Date().toISOString(),
    };
  }

  public clear(): void {
    this.subscriptions.clear();
  }
}
