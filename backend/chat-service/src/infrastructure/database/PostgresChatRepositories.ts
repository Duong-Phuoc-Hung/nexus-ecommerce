import { Pool } from 'pg';
import { IConversationRepository } from '../../domain/repositories/IConversationRepository';
import { IChatMessageRepository } from '../../domain/repositories/IChatMessageRepository';
import { Conversation, ChannelType, MessageSenderRole } from '../../domain/entities/Conversation';
import { ChatMessage, ChatAttachment } from '../../domain/entities/ChatMessage';

export class PostgresConversationRepository implements IConversationRepository {
  private readCursorsEnsured: Promise<void> | null = null;

  constructor(private readonly pool: Pool) {}

  private ensureReadCursorTable(): Promise<void> {
    if (!this.readCursorsEnsured) {
      this.readCursorsEnsured = this.pool
        .query(
          `CREATE TABLE IF NOT EXISTS chat_read_cursors (
            conversation_id VARCHAR(36) NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
            user_id VARCHAR(36) NOT NULL,
            last_read_seq INTEGER NOT NULL DEFAULT 0,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (conversation_id, user_id)
          );
          CREATE INDEX IF NOT EXISTS idx_chat_read_cursors_user ON chat_read_cursors(user_id);`,
        )
        .then(() => undefined)
        .catch((err) => {
          this.readCursorsEnsured = null;
          throw err;
        });
    }
    return this.readCursorsEnsured;
  }

  public async findAccessible(userId: string, role: string): Promise<Conversation[]> {
    await this.ensureReadCursorTable();
    const staff = ['ADMIN', 'SUPPORT_STAFF'].includes(role.toUpperCase());
    const result = await this.pool.query(
      `SELECT
        c.*,
        COALESCE((SELECT MAX((m.metadata->>'seq')::integer) FROM chat_messages m WHERE m.conversation_id = c.id), 0) AS last_seq,
        COALESCE((SELECT rc.last_read_seq FROM chat_read_cursors rc WHERE rc.conversation_id = c.id AND rc.user_id = $1), 0) AS my_last_read_seq,
        COALESCE((SELECT rc.last_read_seq FROM chat_read_cursors rc WHERE rc.conversation_id = c.id AND rc.user_id = c.buyer_id), 0) AS buyer_last_read_seq,
        COALESCE((SELECT MAX(rc.last_read_seq) FROM chat_read_cursors rc WHERE rc.conversation_id = c.id AND rc.user_id <> c.buyer_id), 0) AS counterpart_last_read_seq,
        COALESCE((
          SELECT COUNT(*)::int
          FROM chat_messages m
          WHERE m.conversation_id = c.id
            AND m.sender_id <> $1
            AND m.sender_role <> 'SYSTEM'
            AND COALESCE((m.metadata->>'seq')::integer, 0) > COALESCE(
              (SELECT rc.last_read_seq FROM chat_read_cursors rc WHERE rc.conversation_id = c.id AND rc.user_id = $1),
              0
            )
        ), 0) AS unread_count,
        lm.content AS last_message_content,
        lm.sender_role AS last_message_role,
        lm.created_at AS last_message_at
      FROM chat_conversations c
      LEFT JOIN LATERAL (
        SELECT m.content, m.sender_role, m.created_at
        FROM chat_messages m
        WHERE m.conversation_id = c.id
        ORDER BY COALESCE((m.metadata->>'seq')::integer, 0) DESC, m.created_at DESC
        LIMIT 1
      ) lm ON TRUE
      WHERE
        ($2::boolean AND (c.channel_type = 'BUYER_SUPPORT' OR
          (c.channel_type = 'AI_BOT' AND c.status = 'WAITING_STAFF'))) OR
        (NOT $2::boolean AND (c.buyer_id = $1 OR
          (c.seller_id = $1 AND c.channel_type = 'BUYER_SELLER')))
      ORDER BY COALESCE(lm.created_at, c.updated_at) DESC`,
      [userId, staff],
    );
    return result.rows.map((row) => this.mapRowToConversation(row));
  }

  public async findById(id: string): Promise<Conversation | null> {
    try {
      const res = await this.pool.query('SELECT * FROM chat_conversations WHERE id = $1 LIMIT 1', [
        id,
      ]);
      if (res.rows.length === 0) return null;
      return this.mapRowToConversation(res.rows[0]);
    } catch (err: any) {
      console.warn('[PostgresConversationRepository.findById fallback]:', err.message);
      return null;
    }
  }

  public async findByOrderAndChannel(
    orderId: string,
    channelType: ChannelType,
  ): Promise<Conversation | null> {
    try {
      const res = await this.pool.query(
        'SELECT * FROM chat_conversations WHERE order_id = $1 AND channel_type = $2 LIMIT 1',
        [orderId, channelType],
      );
      if (res.rows.length === 0) return null;
      return this.mapRowToConversation(res.rows[0]);
    } catch (err: any) {
      console.warn('[PostgresConversationRepository.findByOrderAndChannel fallback]:', err.message);
      return null;
    }
  }

  public async findByOrderId(orderId: string): Promise<Conversation[]> {
    try {
      const res = await this.pool.query(
        'SELECT * FROM chat_conversations WHERE order_id = $1 ORDER BY created_at ASC',
        [orderId],
      );
      return res.rows.map((r) => this.mapRowToConversation(r));
    } catch (err: any) {
      console.warn('[PostgresConversationRepository.findByOrderId fallback]:', err.message);
      return [];
    }
  }

  public async findAll(filter?: {
    buyerId?: string;
    sellerId?: string;
    channelType?: ChannelType;
    status?: string;
    orderId?: string;
    limit?: number;
  }): Promise<Conversation[]> {
    try {
      const conditions: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (filter?.buyerId) {
        conditions.push(`buyer_id = $${idx++}`);
        values.push(filter.buyerId);
      }
      if (filter?.sellerId) {
        conditions.push(`seller_id = $${idx++}`);
        values.push(filter.sellerId);
      }
      if (filter?.channelType) {
        conditions.push(`channel_type = $${idx++}`);
        values.push(filter.channelType);
      }
      if (filter?.status) {
        conditions.push(`status = $${idx++}`);
        values.push(filter.status);
      }
      if (filter?.orderId) {
        conditions.push(`order_id = $${idx++}`);
        values.push(filter.orderId);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const limitVal = Math.min(100, Math.max(1, filter?.limit || 50));
      const sql = `SELECT * FROM chat_conversations ${whereClause} ORDER BY updated_at DESC LIMIT $${idx}`;
      values.push(limitVal);

      const res = await this.pool.query(sql, values);
      return res.rows.map((r: any) => this.mapRowToConversation(r));
    } catch (err: any) {
      console.warn('[PostgresConversationRepository.findAll fallback]:', err.message);
      return [];
    }
  }

  public async findWaitingForStaff(limit: number): Promise<Conversation[]> {
    try {
      const res = await this.pool.query(
        `SELECT * FROM chat_conversations 
         WHERE (channel_type = 'AI_BOT' OR channel_type = 'BUYER_SUPPORT') AND status = 'WAITING_STAFF' 
         ORDER BY updated_at ASC LIMIT $1`,
        [limit],
      );
      return res.rows.map((row: any) => this.mapRowToConversation(row));
    } catch (err: any) {
      console.warn('[PostgresConversationRepository.findWaitingForStaff fallback]:', err.message);
      return [];
    }
  }

  public async save(conversation: Conversation): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO chat_conversations (id, order_id, channel_type, buyer_id, seller_id, support_case_id, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           support_case_id = EXCLUDED.support_case_id,
           status = EXCLUDED.status,
           updated_at = EXCLUDED.updated_at`,
        [
          conversation.id,
          conversation.orderId,
          conversation.channelType,
          conversation.buyerId,
          conversation.sellerId,
          conversation.supportCaseId || null,
          conversation.status,
          conversation.createdAt,
          conversation.updatedAt,
        ],
      );
    } catch (err: any) {
      console.warn('[PostgresConversationRepository.save]: database write failed');
      throw err;
    }
  }

  public async update(conversation: Conversation): Promise<void> {
    await this.save(conversation);
  }

  public async markUserRead(
    conversationId: string,
    userId: string,
    lastReadSeq: number,
  ): Promise<number> {
    await this.ensureReadCursorTable();
    const safeSeq = Math.max(0, Math.floor(lastReadSeq));
    const res = await this.pool.query(
      `INSERT INTO chat_read_cursors (conversation_id, user_id, last_read_seq, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (conversation_id, user_id) DO UPDATE SET
         last_read_seq = GREATEST(chat_read_cursors.last_read_seq, EXCLUDED.last_read_seq),
         updated_at = CURRENT_TIMESTAMP
       RETURNING last_read_seq`,
      [conversationId, userId, safeSeq],
    );
    return Number(res.rows[0]?.last_read_seq ?? safeSeq);
  }

  public async getUnreadCount(conversationId: string, userId: string): Promise<number> {
    await this.ensureReadCursorTable();
    const res = await this.pool.query(
      `SELECT COUNT(*)::int AS unread_count
       FROM chat_messages m
       WHERE m.conversation_id = $1
         AND m.sender_id <> $2
         AND m.sender_role <> 'SYSTEM'
         AND COALESCE((m.metadata->>'seq')::integer, 0) > COALESCE(
           (SELECT rc.last_read_seq FROM chat_read_cursors rc WHERE rc.conversation_id = $1 AND rc.user_id = $2),
           0
         )`,
      [conversationId, userId],
    );
    return Number(res.rows[0]?.unread_count ?? 0);
  }

  public async getReadSummary(
    conversationId: string,
    userId: string,
    buyerId: string,
  ): Promise<{
    lastSeq: number;
    myLastReadSeq: number;
    buyerLastReadSeq: number;
    counterpartLastReadSeq: number;
    unreadCount: number;
  }> {
    await this.ensureReadCursorTable();
    const res = await this.pool.query(
      `SELECT
        COALESCE((SELECT MAX((m.metadata->>'seq')::integer) FROM chat_messages m WHERE m.conversation_id = $1), 0) AS last_seq,
        COALESCE((SELECT rc.last_read_seq FROM chat_read_cursors rc WHERE rc.conversation_id = $1 AND rc.user_id = $2), 0) AS my_last_read_seq,
        COALESCE((SELECT rc.last_read_seq FROM chat_read_cursors rc WHERE rc.conversation_id = $1 AND rc.user_id = $3), 0) AS buyer_last_read_seq,
        COALESCE((SELECT MAX(rc.last_read_seq) FROM chat_read_cursors rc WHERE rc.conversation_id = $1 AND rc.user_id <> $3), 0) AS counterpart_last_read_seq,
        COALESCE((
          SELECT COUNT(*)::int
          FROM chat_messages m
          WHERE m.conversation_id = $1
            AND m.sender_id <> $2
            AND m.sender_role <> 'SYSTEM'
            AND COALESCE((m.metadata->>'seq')::integer, 0) > COALESCE(
              (SELECT rc.last_read_seq FROM chat_read_cursors rc WHERE rc.conversation_id = $1 AND rc.user_id = $2),
              0
            )
        ), 0) AS unread_count`,
      [conversationId, userId, buyerId],
    );
    const row = res.rows[0] || {};
    return {
      lastSeq: Number(row.last_seq ?? 0),
      myLastReadSeq: Number(row.my_last_read_seq ?? 0),
      buyerLastReadSeq: Number(row.buyer_last_read_seq ?? 0),
      counterpartLastReadSeq: Number(row.counterpart_last_read_seq ?? 0),
      unreadCount: Number(row.unread_count ?? 0),
    };
  }

  private mapRowToConversation(row: any): Conversation {
    return new Conversation({
      id: row.id,
      orderId: row.order_id,
      channelType: row.channel_type as ChannelType,
      buyerId: row.buyer_id,
      sellerId: row.seller_id,
      supportCaseId: row.support_case_id || undefined,
      status: row.status,
      lastSeq: Number(row.last_seq ?? 0),
      buyerLastReadSeq: Number(row.buyer_last_read_seq ?? 0),
      counterpartLastReadSeq: Number(row.counterpart_last_read_seq ?? 0),
      myLastReadSeq: Number(row.my_last_read_seq ?? 0),
      unreadCount: Number(row.unread_count ?? 0),
      lastMessage: row.last_message_content ?? null,
      lastMessageRole: (row.last_message_role as MessageSenderRole | null) ?? null,
      lastMessageAt: row.last_message_at ? new Date(row.last_message_at) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }
}

export class PostgresChatMessageRepository implements IChatMessageRepository {
  constructor(private readonly pool: Pool) {}

  public async findById(id: string): Promise<ChatMessage | null> {
    try {
      const res = await this.pool.query('SELECT * FROM chat_messages WHERE id = $1 LIMIT 1', [id]);
      if (res.rows.length === 0) return null;
      return this.mapRowToMessage(res.rows[0]);
    } catch (err: any) {
      console.warn('[PostgresChatMessageRepository.findById fallback]:', err.message);
      return null;
    }
  }

  public async findByConversationId(
    conversationId: string,
    limit: number = 50,
    after?: Date,
    beforeSeq?: number,
    afterSeq?: number,
  ): Promise<ChatMessage[]> {
    try {
      let query = 'SELECT * FROM chat_messages WHERE conversation_id = $1';
      const params: any[] = [conversationId];

      if (after) {
        params.push(after);
        query += ` AND created_at > $${params.length}`;
      }

      if (typeof beforeSeq === 'number') {
        params.push(beforeSeq);
        query += ` AND (metadata->>'seq')::integer < $${params.length}`;
      }
      if (typeof afterSeq === 'number') {
        params.push(afterSeq);
        query += ` AND (metadata->>'seq')::integer > $${params.length}`;
      }
      const incremental = Boolean(after) || typeof afterSeq === 'number';
      query += ` ORDER BY created_at ${incremental ? 'ASC' : 'DESC'}, id ${incremental ? 'ASC' : 'DESC'} LIMIT $${params.length + 1}`;
      params.push(limit);
      const res = await this.pool.query(query, params);
      const items = res.rows.map((r) => this.mapRowToMessage(r));
      if (!incremental) items.reverse();

      return items;
    } catch (err: any) {
      throw err;
    }
  }

  public async findByClientMessageId(
    conversationId: string,
    clientMessageId: string,
  ): Promise<ChatMessage | null> {
    try {
      const res = await this.pool.query(
        `SELECT * FROM chat_messages 
         WHERE conversation_id = $1 AND (metadata->>'clientMessageId' = $2 OR metadata->>'client_message_id' = $2)
         LIMIT 1`,
        [conversationId, clientMessageId],
      );
      if (res.rows.length === 0) return null;
      return this.mapRowToMessage(res.rows[0]);
    } catch {
      return null;
    }
  }

  public async getNextSeq(conversationId: string): Promise<number> {
    try {
      const res = await this.pool.query(
        `SELECT GREATEST(
          COALESCE(MAX((metadata->>'seq')::integer), 0),
          COUNT(*)::integer
        ) AS max_seq
        FROM chat_messages
        WHERE conversation_id = $1`,
        [conversationId],
      );
      return parseInt(res.rows[0]?.max_seq || '0', 10) + 1;
    } catch {
      return 1;
    }
  }

  public async save(message: ChatMessage): Promise<void> {
    try {
      const metadata = message.metadata || {};
      if (message.clientMessageId) {
        metadata.clientMessageId = message.clientMessageId;
      }
      if (message.seq !== undefined) {
        metadata.seq = message.seq;
      }

      await this.pool.query(
        `INSERT INTO chat_messages (id, conversation_id, sender_id, sender_role, content, attachments, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           content = EXCLUDED.content,
           attachments = EXCLUDED.attachments,
           metadata = EXCLUDED.metadata`,
        [
          message.id,
          message.conversationId,
          message.senderId,
          message.senderRole,
          message.content,
          JSON.stringify(message.attachments || []),
          JSON.stringify(metadata),
          message.createdAt,
        ],
      );
    } catch (err: any) {
      console.warn('[PostgresChatMessageRepository.save]: database write failed');
      throw err;
    }
  }

  private mapRowToMessage(row: any): ChatMessage {
    const rawAttachments =
      typeof row.attachments === 'string' ? JSON.parse(row.attachments) : row.attachments;
    const rawMetadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
    const seq = rawMetadata?.seq;
    const clientMessageId = rawMetadata?.clientMessageId;

    return new ChatMessage({
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      senderRole: row.sender_role,
      content: row.content,
      attachments: Array.isArray(rawAttachments) ? rawAttachments : [],
      metadata: rawMetadata || undefined,
      createdAt: new Date(row.created_at),
      seq,
      clientMessageId,
    });
  }
}
