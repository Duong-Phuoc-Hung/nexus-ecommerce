import { Pool } from 'pg';
import {
  Notification,
  NotificationChannel,
  NotificationStatus,
} from '../../domain/entities/Notification';
import { INotificationRepository } from '../../domain/repositories/INotificationRepository';

export interface NotificationPreferenceRecord {
  orderEmail: boolean;
  orderPush: boolean;
  auctionEmail: boolean;
  auctionPush: boolean;
  accountEmail: boolean;
  accountPush: boolean;
}

export class PostgresNotificationRepository implements INotificationRepository {
  constructor(private readonly pool: Pool) {}

  public async findAll(): Promise<Notification[]> {
    const { rows } = await this.pool.query(
      `SELECT id, recipient_id, recipient_email, channel, category, title, body,
              status, is_read, read_at, href, sent_at, created_at, updated_at
       FROM notification_messages
       ORDER BY created_at DESC
       LIMIT 200`,
    );
    return rows.map((r) => this.mapRow(r));
  }

  public async findById(id: string): Promise<Notification | null> {
    const { rows } = await this.pool.query(
      `SELECT id, recipient_id, recipient_email, channel, category, title, body,
              status, is_read, read_at, href, sent_at, created_at, updated_at
       FROM notification_messages
       WHERE id = $1
       LIMIT 1`,
      [id],
    );
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  public async findByIdempotencyKey(key: string): Promise<Notification | null> {
    const { rows } = await this.pool.query(
      `SELECT id, recipient_id, recipient_email, channel, category, title, body,
              status, is_read, read_at, href, sent_at, created_at, updated_at
       FROM notification_messages
       WHERE idempotency_key = $1
       LIMIT 1`,
      [key],
    );
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  public async findByRecipientId(recipientId: string): Promise<Notification[]> {
    const { rows } = await this.pool.query(
      `SELECT id, recipient_id, recipient_email, channel, category, title, body,
              status, is_read, read_at, href, sent_at, created_at, updated_at
       FROM notification_messages
       WHERE recipient_id = $1
       ORDER BY created_at DESC
       LIMIT 200`,
      [recipientId],
    );
    return rows.map((r) => this.mapRow(r));
  }

  public async save(notification: Notification, idempotencyKey?: string): Promise<void> {
    const json = notification.toJSON();
    await this.pool.query(
      `INSERT INTO notification_messages (
         id, recipient_id, recipient_email, channel, category, title, body,
         status, is_read, read_at, href, idempotency_key, sent_at, created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [
        json.id,
        json.recipientId,
        json.recipientEmail ?? null,
        json.channel,
        json.category,
        json.title,
        json.body,
        json.status,
        json.read,
        json.readAt,
        json.href ?? null,
        idempotencyKey ?? null,
        json.sentAt,
        json.createdAt,
        json.updatedAt,
      ],
    );
  }

  public async update(notification: Notification): Promise<void> {
    const json = notification.toJSON();
    await this.pool.query(
      `UPDATE notification_messages
       SET status = $2, is_read = $3, read_at = $4, updated_at = NOW()
       WHERE id = $1`,
      [json.id, json.status, json.read, json.readAt],
    );
  }

  public async markAllReadForRecipient(recipientId: string): Promise<number> {
    const res = await this.pool.query(
      `UPDATE notification_messages
       SET is_read = TRUE, read_at = COALESCE(read_at, NOW()), updated_at = NOW()
       WHERE recipient_id = $1 AND is_read = FALSE`,
      [recipientId],
    );
    return res.rowCount ?? 0;
  }

  public async getPreferences(userId: string): Promise<NotificationPreferenceRecord | null> {
    const { rows } = await this.pool.query(
      `SELECT order_email, order_push, auction_email, auction_push, account_email, account_push
       FROM notification_preferences
       WHERE user_id = $1
       LIMIT 1`,
      [userId],
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      orderEmail: true,
      orderPush: true,
      auctionEmail: Boolean(r.auction_email),
      auctionPush: Boolean(r.auction_push),
      accountEmail: Boolean(r.account_email),
      accountPush: Boolean(r.account_push),
    };
  }

  public async savePreferences(
    userId: string,
    prefs: NotificationPreferenceRecord,
  ): Promise<NotificationPreferenceRecord> {
    await this.pool.query(
      `INSERT INTO notification_preferences (
         user_id, order_email, order_push, auction_email, auction_push, account_email, account_push, updated_at
       ) VALUES ($1, TRUE, TRUE, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         order_email = TRUE,
         order_push = TRUE,
         auction_email = EXCLUDED.auction_email,
         auction_push = EXCLUDED.auction_push,
         account_email = EXCLUDED.account_email,
         account_push = EXCLUDED.account_push,
         updated_at = NOW()`,
      [userId, prefs.auctionEmail, prefs.auctionPush, prefs.accountEmail, prefs.accountPush],
    );
    return {
      orderEmail: true,
      orderPush: true,
      auctionEmail: prefs.auctionEmail,
      auctionPush: prefs.auctionPush,
      accountEmail: prefs.accountEmail,
      accountPush: prefs.accountPush,
    };
  }

  private mapRow(r: any): Notification {
    const channel = Object.values(NotificationChannel).includes(r.channel)
      ? (r.channel as NotificationChannel)
      : NotificationChannel.IN_APP;
    const status = Object.values(NotificationStatus).includes(r.status)
      ? (r.status as NotificationStatus)
      : NotificationStatus.SENT;
    const category =
      r.category === 'ORDER' || r.category === 'AUCTION' || r.category === 'ACCOUNT'
        ? r.category
        : 'ACCOUNT';

    return new Notification({
      id: String(r.id),
      recipientId: String(r.recipient_id),
      recipientEmail: r.recipient_email ? String(r.recipient_email) : undefined,
      channel,
      category,
      title: String(r.title),
      body: String(r.body),
      status,
      read: Boolean(r.is_read),
      readAt: r.read_at ? new Date(r.read_at) : undefined,
      href: r.href ? String(r.href) : undefined,
      sentAt: r.sent_at ? new Date(r.sent_at) : undefined,
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.updated_at),
    });
  }
}
