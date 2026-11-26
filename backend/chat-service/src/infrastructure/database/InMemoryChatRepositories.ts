import { IConversationRepository } from '../../domain/repositories/IConversationRepository';
import { IChatMessageRepository } from '../../domain/repositories/IChatMessageRepository';
import { IPolicyRepository } from '../../domain/repositories/IPolicyRepository';
import { Conversation, ChannelType } from '../../domain/entities/Conversation';
import { ChatMessage } from '../../domain/entities/ChatMessage';
import { PlatformPolicy } from '../../domain/entities/PlatformPolicy';
import { getSeedPolicies } from '../seeds/policySeeds';

export class InMemoryConversationRepository implements IConversationRepository {
  private readonly items = new Map<string, Conversation>();
  private readonly readCursors = new Map<string, number>();

  constructor(private readonly messageRepo?: IChatMessageRepository) {}

  private cursorKey(conversationId: string, userId: string): string {
    return `${conversationId}::${userId}`;
  }

  public async findAccessible(userId: string, role: string): Promise<Conversation[]> {
    const accessible = Array.from(this.items.values()).filter((conversation) =>
      conversation.canAccess(userId, role),
    );
    const enriched = await Promise.all(
      accessible.map(async (conv) => {
        const msgs = this.messageRepo
          ? await this.messageRepo.findByConversationId(conv.id, 1000)
          : [];
        const summary = await this.getReadSummary(conv.id, userId, conv.buyerId);
        const latest = msgs.at(-1);
        return new Conversation({
          id: conv.id,
          orderId: conv.orderId,
          channelType: conv.channelType,
          buyerId: conv.buyerId,
          sellerId: conv.sellerId,
          supportCaseId: conv.supportCaseId,
          status: conv.status,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          lastSeq: summary.lastSeq,
          buyerLastReadSeq: summary.buyerLastReadSeq,
          counterpartLastReadSeq: summary.counterpartLastReadSeq,
          myLastReadSeq: summary.myLastReadSeq,
          unreadCount: summary.unreadCount,
          lastMessage: latest?.content ?? null,
          lastMessageRole: latest?.senderRole ?? null,
          lastMessageAt: latest?.createdAt ?? null,
        });
      }),
    );
    return enriched.sort((a, b) => {
      const aTime = (a.toDto().lastMessageAt || a.updatedAt).getTime();
      const bTime = (b.toDto().lastMessageAt || b.updatedAt).getTime();
      return bTime - aTime;
    });
  }

  public async findById(id: string): Promise<Conversation | null> {
    return this.items.get(id) || null;
  }

  public async findByOrderAndChannel(
    orderId: string,
    channelType: ChannelType,
  ): Promise<Conversation | null> {
    for (const conv of this.items.values()) {
      if (conv.orderId === orderId && conv.channelType === channelType) {
        return conv;
      }
    }
    return null;
  }

  public async findByOrderId(orderId: string): Promise<Conversation[]> {
    const list: Conversation[] = [];
    for (const conv of this.items.values()) {
      if (conv.orderId === orderId) {
        list.push(conv);
      }
    }
    return list;
  }

  public async findAll(filter?: {
    buyerId?: string;
    sellerId?: string;
    channelType?: ChannelType;
    status?: string;
    orderId?: string;
    limit?: number;
  }): Promise<Conversation[]> {
    let list = Array.from(this.items.values());

    if (filter?.buyerId) {
      list = list.filter((c) => c.buyerId === filter.buyerId);
    }
    if (filter?.sellerId) {
      list = list.filter((c) => c.sellerId === filter.sellerId);
    }
    if (filter?.channelType) {
      list = list.filter((c) => c.channelType === filter.channelType);
    }
    if (filter?.status) {
      list = list.filter((c) => c.status === filter.status);
    }
    if (filter?.orderId) {
      list = list.filter((c) => c.orderId === filter.orderId);
    }

    list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    const limit = filter?.limit || 50;
    return list.slice(0, limit);
  }

  public async save(conversation: Conversation): Promise<void> {
    this.items.set(conversation.id, conversation);
  }

  public async findWaitingForStaff(limit: number): Promise<Conversation[]> {
    return Array.from(this.items.values())
      .filter(
        (conversation) =>
          (conversation.channelType === 'AI_BOT' || conversation.channelType === 'BUYER_SUPPORT') &&
          conversation.status === 'WAITING_STAFF',
      )
      .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())
      .slice(0, limit);
  }

  public async update(conversation: Conversation): Promise<void> {
    this.items.set(conversation.id, conversation);
  }

  public async markUserRead(
    conversationId: string,
    userId: string,
    lastReadSeq: number,
  ): Promise<number> {
    const key = this.cursorKey(conversationId, userId);
    const prev = this.readCursors.get(key) ?? 0;
    const next = Math.max(prev, Math.max(0, Math.floor(lastReadSeq)));
    this.readCursors.set(key, next);
    return next;
  }

  public async getUnreadCount(conversationId: string, userId: string): Promise<number> {
    const cursor = this.readCursors.get(this.cursorKey(conversationId, userId)) ?? 0;
    if (!this.messageRepo) return 0;
    const msgs = await this.messageRepo.findByConversationId(conversationId, 1000);
    return msgs.filter(
      (m) =>
        m.senderId !== userId &&
        m.senderRole !== 'SYSTEM' &&
        typeof m.seq === 'number' &&
        m.seq > cursor,
    ).length;
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
    const conv = this.items.get(conversationId);
    const msgs = this.messageRepo
      ? await this.messageRepo.findByConversationId(conversationId, 1000)
      : [];
    const maxMsgSeq = msgs.reduce((max, m) => Math.max(max, m.seq ?? 0), 0);
    const lastSeq = Math.max(conv?.lastSeq ?? 0, maxMsgSeq);
    const myLastReadSeq = this.readCursors.get(this.cursorKey(conversationId, userId)) ?? 0;
    const buyerLastReadSeq =
      this.readCursors.get(this.cursorKey(conversationId, buyerId)) ?? conv?.buyerLastReadSeq ?? 0;
    let counterpartLastReadSeq = conv?.counterpartLastReadSeq ?? 0;
    const prefix = `${conversationId}::`;
    for (const [k, v] of this.readCursors.entries()) {
      if (k.startsWith(prefix) && k !== this.cursorKey(conversationId, buyerId)) {
        counterpartLastReadSeq = Math.max(counterpartLastReadSeq, v);
      }
    }
    const unreadCount = await this.getUnreadCount(conversationId, userId);
    return {
      lastSeq,
      myLastReadSeq,
      buyerLastReadSeq,
      counterpartLastReadSeq,
      unreadCount,
    };
  }

  public clear(): void {
    this.items.clear();
    this.readCursors.clear();
  }
}

export class InMemoryChatMessageRepository implements IChatMessageRepository {
  private readonly messages: ChatMessage[] = [];

  public async findById(id: string): Promise<ChatMessage | null> {
    const found = this.messages.find((m) => m.id === id);
    return found || null;
  }

  public async findByConversationId(
    conversationId: string,
    limit: number = 50,
    after?: Date,
    beforeSeq?: number,
    afterSeq?: number,
  ): Promise<ChatMessage[]> {
    let list = this.messages.filter((m) => m.conversationId === conversationId);
    if (after) {
      list = list.filter((m) => m.createdAt.getTime() > after.getTime());
    }
    if (typeof beforeSeq === 'number') {
      list = list.filter((m) => (m.seq !== undefined ? m.seq < beforeSeq : true));
    }
    if (typeof afterSeq === 'number') {
      list = list.filter((m) => (m.seq !== undefined ? m.seq > afterSeq : true));
    }
    list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return after || typeof afterSeq === 'number' ? list.slice(0, limit) : list.slice(-limit);
  }

  public async findByClientMessageId(
    conversationId: string,
    clientMessageId: string,
  ): Promise<ChatMessage | null> {
    if (!clientMessageId) return null;
    const found = this.messages.find(
      (m) => m.conversationId === conversationId && m.clientMessageId === clientMessageId,
    );
    return found || null;
  }

  public async getNextSeq(conversationId: string): Promise<number> {
    const convMessages = this.messages.filter((m) => m.conversationId === conversationId);
    let maxSeq = 0;
    for (const m of convMessages) {
      if (typeof m.seq === 'number' && m.seq > maxSeq) {
        maxSeq = m.seq;
      }
    }
    return maxSeq + 1;
  }

  public async save(message: ChatMessage): Promise<void> {
    if (typeof message.seq !== 'number') {
      const nextSeq = await this.getNextSeq(message.conversationId);
      message.setSeq(nextSeq);
    }
    this.messages.push(message);
  }

  public clear(): void {
    this.messages.length = 0;
  }
}

export class InMemoryPolicyRepository implements IPolicyRepository {
  private readonly policies = new Map<string, PlatformPolicy>();

  constructor() {
    this.seed();
  }

  public seed(): void {
    const seeds = getSeedPolicies();
    for (const p of seeds) {
      this.policies.set(p.policyCode, p);
    }
  }

  public async findById(id: string): Promise<PlatformPolicy | null> {
    for (const p of this.policies.values()) {
      if (p.id === id) return p;
    }
    return null;
  }

  public async findByCode(code: string): Promise<PlatformPolicy | null> {
    return this.policies.get(code) || null;
  }

  public async search(query: string, category?: string): Promise<PlatformPolicy[]> {
    const lower = (query || '').toLowerCase();
    const results: PlatformPolicy[] = [];

    for (const p of this.policies.values()) {
      if (!p.isActive) continue;
      if (category && p.category.toLowerCase() !== category.toLowerCase()) continue;

      const matched =
        p.content.toLowerCase().includes(lower) ||
        p.title.toLowerCase().includes(lower) ||
        p.policyCode.toLowerCase().includes(lower) ||
        (lower.includes('đấu giá') && p.category === 'AUCTION') ||
        (lower.includes('mất cọc') && p.category === 'AUCTION') ||
        (lower.includes('quá hạn') && p.category === 'AUCTION') ||
        (lower.includes('đổi trả') && p.category === 'REFUND') ||
        (lower.includes('hoàn tiền') && p.category === 'REFUND') ||
        (lower.includes('phát lại') && p.category === 'SHIPPING');

      if (matched) {
        results.push(p);
      }
    }

    return results;
  }

  public async listAllActive(): Promise<PlatformPolicy[]> {
    return Array.from(this.policies.values()).filter((p) => p.isActive);
  }

  public async save(policy: PlatformPolicy): Promise<void> {
    this.policies.set(policy.policyCode, policy);
  }
}
