import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { createApplication } from './app';
import { Conversation } from './domain/entities/Conversation';
import { HandoverConflictException } from './domain/exceptions/HandoverConflictException';
import {
  InMemoryChatMessageRepository,
  InMemoryConversationRepository,
} from './infrastructure/database/InMemoryChatRepositories';
import { HandoverConversationUseCase } from './application/use-cases/HandoverConversationUseCase';
import { SendMessageUseCase } from './application/use-cases/SendMessageUseCase';

const image = {
  imageBase64:
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=',
  mimeType: 'image/png',
};

function token(
  sub: string,
  role: string,
  secret?: string,
  exp = Math.floor(Date.now() / 1000) + 300,
  rolesArray = false,
): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({ sub, ...(rolesArray ? { roles: [role] } : { role }), exp }),
  ).toString('base64url');
  const key =
    secret ??
    process.env.JWT_ACCESS_SECRET ??
    process.env.JWT_SECRET ??
    'nexus_super_secret_jwt_access_key_min_32_chars_local_dev';
  const signature = crypto
    .createHmac('sha256', key)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
}

function conversation(status = 'BOT_ACTIVE') {
  return new Conversation({
    id: crypto.randomUUID(),
    orderId: 'order-1',
    channelType: 'AI_BOT',
    buyerId: 'buyer-1',
    sellerId: 'seller-1',
    status,
  });
}

test('BE-04: legacy ACTIVE, idempotent/concurrent handover, terminal state and persistence failure', async () => {
  const repo = new InMemoryConversationRepository();
  const legacy = conversation('ACTIVE');
  await repo.save(legacy);
  const handover = new HandoverConversationUseCase(repo);
  const input = { conversationId: legacy.id, userId: 'buyer-1' };
  const results = await Promise.all([
    handover.execute(input, 'buyer-1', 'BUYER'),
    handover.execute(input, 'buyer-1', 'BUYER'),
  ]);
  assert.equal(results[0].status, 'WAITING_STAFF');
  assert.equal(results[0].updatedAt.getTime(), results[1].updatedAt.getTime());
  assert.equal((await repo.findWaitingForStaff(10)).length, 1);
  assert.equal(results[0].canAccess('staff-1', 'SUPPORT_STAFF'), true);
  assert.equal(results[0].canAccess('seller-1', 'SELLER'), false);

  const closed = conversation('CLOSED');
  await repo.save(closed);
  await assert.rejects(
    handover.execute({ ...input, conversationId: closed.id }, 'buyer-1', 'BUYER'),
    HandoverConflictException,
  );
  const active = conversation();
  await repo.save(active);
  repo.update = async () => {
    throw new Error('Storage unavailable');
  };
  await assert.rejects(
    handover.execute({ ...input, conversationId: active.id }, 'buyer-1', 'BUYER'),
  );
  assert.equal((await repo.findById(active.id))?.status, 'BOT_ACTIVE');
});

test('BE-04: no AI message is stored if handover completes during model generation', async () => {
  const repo = new InMemoryConversationRepository();
  const messages = new InMemoryChatMessageRepository();
  const conv = conversation();
  await repo.save(conv);
  let finish!: (value: { content: string; modelUsed: 'rule-based-fallback' }) => void;
  let started!: () => void;
  const generating = new Promise<void>((resolve) => {
    started = resolve;
  });
  const useCase = new SendMessageUseCase(messages, repo, undefined, {
    generateReply: () => {
      started();
      return new Promise((resolve) => {
        finish = resolve;
      });
    },
  });
  const input = {
    conversationId: conv.id,
    senderId: 'buyer-1',
    senderRole: 'BUYER' as const,
    content: 'Gặp CSKH',
  };
  const pending = useCase.execute(input, 'buyer-1', 'BUYER');
  await generating;
  await new HandoverConversationUseCase(repo).execute(
    { conversationId: conv.id, userId: 'buyer-1' },
    'buyer-1',
    'BUYER',
  );
  finish({ content: 'Late bot response', modelUsed: 'rule-based-fallback' });
  assert.equal((await pending).reply, undefined);
  assert.equal((await useCase.execute(input, 'buyer-1', 'BUYER')).reply, undefined);
  assert.ok(
    (await messages.findByConversationId(conv.id)).every((message) => message.senderRole !== 'AI'),
  );
});

test('BE-01/BE-04: HTTP auth, damage JSON, handover, staff queue and channel isolation', async () => {
  const app = createApplication({
    damageAssessor: {
      assessImage: async () => ({
        is_damaged: false,
        damage_type: 'BÌNH_THƯỜNG',
        severity: 'THẤP',
        summary: '[MOCK] Test fixture.',
      }),
    },
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api/v1/chat`;
  async function request(
    path: string,
    actor: string,
    role: string,
    body?: unknown,
    method = 'POST',
  ) {
    return fetch(`${base}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token(actor, role)}`,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  try {
    for (const headers of [
      { 'x-user-id': 'buyer-1', 'x-user-role': 'BUYER' },
      { Authorization: `Bearer ${token('buyer-1', 'BUYER', 'wrong-key')}` },
      { Authorization: `Bearer ${token('buyer-1', 'BUYER', undefined, 1)}` },
    ]) {
      const response = await fetch(`${base}/handover`, { method: 'POST', headers });
      assert.equal(response.status, 401);
    }
    const assessed = await request('/assess-image', 'buyer-1', 'BUYER', image);
    assert.equal(assessed.status, 200);
    const result = (await assessed.json()) as { data: Record<string, unknown> };
    assert.deepEqual(Object.keys(result.data).sort(), [
      'damage_type',
      'is_damaged',
      'severity',
      'summary',
    ]);
    assert.equal(
      (await request('/assess-image', 'buyer-1', 'BUYER', { ...image, imageBase64: 'bad' })).status,
      400,
    );

    const opened = await request('/conversations', 'buyer-1', 'BUYER', {
      orderId: 'order-1',
      channelType: 'AI_BOT',
      sellerId: 'seller-1',
    });
    const initial = (await opened.json()) as { data: { id: string; status: string } };
    assert.equal(initial.data.status, 'BOT_ACTIVE');
    const input = { conversationId: initial.data.id, userId: 'buyer-1' };
    assert.equal((await request('/handover', 'buyer-2', 'BUYER', input)).status, 403);
    assert.equal(
      (await request('/handover', 'buyer-2', 'BUYER', { ...input, userId: 'buyer-2' })).status,
      403,
    );
    assert.equal(
      (await request('/handover', 'seller-1', 'SELLER', { ...input, userId: 'seller-1' })).status,
      403,
    );
    assert.equal((await request('/handover', 'buyer-1', 'BUYER', {})).status, 400);
    assert.equal(
      (await request('/handover', 'buyer-1', 'BUYER', { ...input, conversationId: 'missing' }))
        .status,
      404,
    );
    assert.equal(
      (
        await request(
          `/conversations/${initial.data.id}`,
          'staff-1',
          'SUPPORT_STAFF',
          undefined,
          'GET',
        )
      ).status,
      403,
    );

    const handovers = await Promise.all([
      request('/handover', 'buyer-1', 'BUYER', input),
      request('/handover', 'buyer-1', 'BUYER', input),
    ]);
    assert.ok(handovers.every((response) => response.status === 200));
    const handed = (await handovers[0].json()) as { data: { status: string } };
    assert.equal(handed.data.status, 'WAITING_STAFF');
    assert.equal((await request('/handover', 'buyer-1', 'BUYER', undefined, 'GET')).status, 403);
    assert.equal(
      (await request('/handover?limit=1.2', 'staff-1', 'SUPPORT_STAFF', undefined, 'GET')).status,
      400,
    );
    const queued = await request('/handover', 'staff-1', 'SUPPORT_STAFF', undefined, 'GET');
    const queue = (await queued.json()) as { data: Array<{ id: string }> };
    assert.deepEqual(
      queue.data.map((conv) => conv.id),
      [initial.data.id],
    );
    const actualUserServiceClaims = await fetch(`${base}/handover`, {
      headers: {
        Authorization: `Bearer ${token('staff-1', 'SUPPORT_STAFF', undefined, Math.floor(Date.now() / 1000) + 300, true)}`,
      },
    });
    assert.equal(actualUserServiceClaims.status, 200);
    assert.equal(
      (
        await request(
          `/conversations/${initial.data.id}`,
          'staff-1',
          'SUPPORT_STAFF',
          undefined,
          'GET',
        )
      ).status,
      200,
    );
    const spoofedStaff = await fetch(`${base}/conversations/${initial.data.id}`, {
      headers: { 'x-user-id': 'staff-1', 'x-user-role': 'SUPPORT_STAFF' },
    });
    assert.equal(spoofedStaff.status, 401);
    assert.equal(
      (await request(`/conversations/${initial.data.id}`, 'seller-1', 'SELLER', undefined, 'GET'))
        .status,
      403,
    );
    const message = await request(
      `/conversations/${initial.data.id}/messages`,
      'buyer-1',
      'BUYER',
      { content: 'Tôi đang chờ CSKH' },
    );
    const sent = (await message.json()) as { data: { reply: unknown } };
    assert.equal(sent.data.reply, null);
    const staffReply = await request(
      `/conversations/${initial.data.id}/messages`,
      'staff-1',
      'SUPPORT_STAFF',
      { content: 'CSKH đã nhận yêu cầu' },
    );
    assert.equal(staffReply.status, 201);

    const sellerChannel = await request('/conversations', 'buyer-1', 'BUYER', {
      orderId: 'order-1',
      channelType: 'BUYER_SELLER',
      sellerId: 'seller-1',
    });
    const sellerConv = (await sellerChannel.json()) as { data: { id: string; status: string } };
    assert.equal(sellerConv.data.status, 'ACTIVE');
    assert.equal(
      (
        await request('/handover', 'buyer-1', 'BUYER', {
          ...input,
          conversationId: sellerConv.data.id,
        })
      ).status,
      409,
    );
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
