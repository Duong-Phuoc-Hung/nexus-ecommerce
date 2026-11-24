import { Pool } from 'pg';
import { IConversationRepository } from '../../domain/repositories/IConversationRepository';
import { IChatMessageRepository } from '../../domain/repositories/IChatMessageRepository';
import { IPolicyRepository } from '../../domain/repositories/IPolicyRepository';
import { Conversation, ChannelType } from '../../domain/entities/Conversation';
import { ChatMessage, ChatAttachment } from '../../domain/entities/ChatMessage';
import { PlatformPolicy } from '../../domain/entities/PlatformPolicy';
import { getSeedPolicies } from '../seeds/policySeeds';

export class PostgresConversationRepository implements IConversationRepository {
  constructor(private readonly pool: Pool) {}

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
      console.warn('[PostgresConversationRepository.save fallback]:', err.message);
    }
  }

  public async update(conversation: Conversation): Promise<void> {
    await this.save(conversation);
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

      query += ` ORDER BY created_at ASC LIMIT $${params.length + 1}`;
      params.push(limit);

      const res = await this.pool.query(query, params);
      let items = res.rows.map((r) => this.mapRowToMessage(r));

      if (typeof beforeSeq === 'number') {
        items = items.filter((m) => (m.seq !== undefined ? m.seq < beforeSeq : true));
      }
      if (typeof afterSeq === 'number') {
        items = items.filter((m) => (m.seq !== undefined ? m.seq > afterSeq : true));
      }

      return items;
    } catch (err: any) {
      console.warn('[PostgresChatMessageRepository.findByConversationId fallback]:', err.message);
      return [];
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
        'SELECT COUNT(*) as count FROM chat_messages WHERE conversation_id = $1',
        [conversationId],
      );
      return parseInt(res.rows[0]?.count || '0', 10) + 1;
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
      console.warn('[PostgresChatMessageRepository.save fallback]:', err.message);
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
