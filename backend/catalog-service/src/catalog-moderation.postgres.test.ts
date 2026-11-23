import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import test from 'node:test';
import { createApplication } from './app';
import { PrismaClientWrapper } from './infrastructure/database/PrismaClient';

const db = process.env.CATALOG_MODERATION_TEST_DB;
const secret = 'catalog-moderation-test-secret';

function bearer(role: string, sub: string) {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const claims = encode({ sub, roles: [role], exp: Math.floor(Date.now() / 1000) + 120 });
  const message = `${encode({ alg: 'HS256', typ: 'JWT' })}.${claims}`;
  return `Bearer ${message}.${createHmac('sha256', secret).update(message).digest('base64url')}`;
}

test(
  'moderation enqueues new listings, records decisions and hides only a rejected review',
  { skip: !db },
  async (t) => {
    process.env.JWT_ACCESS_SECRET = secret;
    process.env.DATABASE_URL = db;
    process.env.NODE_ENV = 'development';
    process.env.USE_IN_MEMORY = 'false';
    const prisma = PrismaClientWrapper.getInstance();
    t.after(() => prisma.$disconnect());

    const server = createApplication().listen(0, '127.0.0.1');
    t.after(() => server.close());
    await once(server, 'listening');
    const address = server.address();
    assert(address && typeof address !== 'string');
    const seller = randomUUID();
    const admin = randomUUID();
    const buyer = randomUUID();

    const { port } = address;
    type ResponseBody = {
      data?: {
        id: string;
        status: string;
        pagination: { total: number };
        items: Array<{ id: string }>;
        history: Array<{ decision: string }>;
        lastDecision: { reason: string };
      };
    };

    async function request(
      method: string,
      suffix: string,
      role?: string,
      sub?: string,
      payload?: unknown,
    ) {
      const response = await fetch(`http://127.0.0.1:${port}/api/v1/products${suffix}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(role && sub && { Authorization: bearer(role, sub) }),
        },
        body: payload === undefined ? undefined : JSON.stringify(payload),
      });
      return { status: response.status, body: (await response.json()) as ResponseBody };
    }

    assert.equal((await request('GET', '/moderation/queue')).status, 401);
    assert.equal((await request('GET', '/moderation/queue', 'SELLER', seller)).status, 403);
    const category = await prisma.category.findFirstOrThrow();
    const title = `Catalog moderation ${randomUUID().slice(0, 8)}`;
    const created = await request('POST', '', 'SELLER', seller, {
      title,
      description: 'Product under moderation',
      price: 100_000,
      categoryId: String(category.id),
      stockQuantity: 5,
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const productId = created.body.data!.id;
    assert.equal((await request('GET', `/${productId}?scope=admin`)).status, 404);
    assert.equal((await request('GET', '?scope=admin&status=DRAFT')).status, 401);
    assert.equal((await request('GET', '?scope=admin&status=DRAFT', 'ADMIN', admin)).status, 200);
    const pending = await request(
      'GET',
      `/moderation/queue?status=PENDING&q=${encodeURIComponent(title)}`,
      'ADMIN',
      admin,
    );
    assert.equal(pending.body.data!.pagination.total, 1);
    const caseId = pending.body.data!.items[0].id;
    assert.equal(
      (
        await request('POST', `/${productId}/moderate`, 'ADMIN', admin, {
          caseId,
          decision: 'REQUEST_CHANGES',
          reason: 'Too short',
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request('POST', `/${productId}/moderate`, 'ADMIN', admin, {
          caseId,
          decision: 'REQUEST_CHANGES',
          reason: 'Please provide the product specification.',
        })
      ).body.data!.status,
      'CHANGES_REQUESTED',
    );
    const sellerStatus = await request('GET', `/${productId}/moderation`, 'SELLER', seller);
    assert.equal(
      sellerStatus.body.data!.lastDecision.reason,
      'Please provide the product specification.',
    );
    const blocked = await request('PUT', `/${productId}`, 'SELLER', seller, { status: 'ACTIVE' });
    assert.equal(blocked.status >= 400, true);
    assert.equal(
      (await request('POST', `/${productId}/moderation/resubmit`, 'SELLER', seller)).body.data!
        .status,
      'PENDING',
    );
    assert.equal(
      (
        await request('POST', `/${productId}/moderate`, 'ADMIN', admin, {
          caseId,
          decision: 'APPROVE',
        })
      ).body.data!.status,
      'APPROVED',
    );
    assert.equal((await request('GET', `/${productId}`)).status, 200);
    const detail = await request('GET', `/moderation/cases/${caseId}`, 'ADMIN', admin);
    assert.deepEqual(
      detail.body.data!.history.map((row: { decision: string }) => row.decision),
      ['APPROVE', 'RESUBMIT', 'REQUEST_CHANGES'],
    );

    const reviewId = randomUUID();
    await prisma.review.create({
      data: { id: reviewId, userId: buyer, productId, rating: 2, comment: 'Review' },
    });
    const report = await request(
      'POST',
      `/${productId}/reviews/${reviewId}/reports`,
      'BUYER',
      buyer,
      { reason: 'Review includes prohibited information.' },
    );
    assert.equal(report.status, 201, JSON.stringify(report.body));
    const reviewCase = report.body.data!.id;
    const rejected = await request('POST', `/${productId}/moderate`, 'ADMIN', admin, {
      caseId: reviewCase,
      decision: 'REJECT',
      reason: 'Remove this review.',
      violationCategory: 'OTHER',
    });
    assert.equal(rejected.status, 200, JSON.stringify(rejected.body));
    assert.equal(
      (await prisma.review.findUniqueOrThrow({ where: { id: reviewId } })).moderatedHidden,
      true,
    );
    assert.equal((await request('GET', `/${productId}`)).status, 200);
    const reviews = await request('GET', `/${productId}/reviews`);
    assert(!JSON.stringify(reviews.body).includes(reviewId));
  },
);
