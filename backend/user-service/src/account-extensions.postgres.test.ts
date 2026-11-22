import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import test from 'node:test';
import { Pool } from 'pg';
import { createApplication } from './app';
import { createJwtToken } from './infrastructure/security/auth';
import { BcryptPasswordHasher } from './infrastructure/security/BcryptPasswordHasher';

test(
  'User handoff: real PostgreSQL profile, password, addresses and reputation; order verification via HTTP',
  {
    skip: !process.env.USER_HANDOFF_TEST_DB,
  },
  async () => {
    const connectionString = process.env.USER_HANDOFF_TEST_DB;
    const schema = 'handoff_test_' + randomUUID().replace(/-/g, '');
    const admin = new Pool({ connectionString });
    const pool = new Pool({ connectionString, options: '-c search_path=' + schema });
    const buyer = randomUUID();
    const seller = randomUUID();
    const staff = randomUUID();
    let caseStatus: string | undefined = 'PENDING';
    const commerce = createServer((req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          success: true,
          data: req.url?.endsWith('/cases')
            ? caseStatus
              ? [{ status: caseStatus }]
              : []
            : { id: 'ORDER-CANONICAL', buyerId: buyer, sellerId: seller, status: 'DELIVERED' },
        }),
      );
    });
    const oldCommerce = process.env.COMMERCE_SERVICE_URL;
    const oldMemory = process.env.USE_IN_MEMORY_DB;
    let server: ReturnType<ReturnType<typeof createApplication>['listen']> | undefined;
    try {
      await admin.query('CREATE SCHEMA ' + schema);
      for (const migration of [
        'V1__init_user_and_event_schema.sql',
        'V2__create_user_addresses_table.sql',
        'V2__seed_roles_and_privileges.sql',
        'V4__add_login_lockout_fields.sql',
        'V5__profile_reputation_and_seller_reviews.sql',
        'V5__profile_reputation_and_seller_reviews.sql',
      ]) {
        await pool.query(await readFile(resolve(__dirname, '../prisma', migration), 'utf8'));
      }
      const hash = await new BcryptPasswordHasher(4).hash('OldPass123');
      for (const [i, id, role] of [
        [1, buyer, 'BUYER'],
        [2, seller, 'SELLER'],
        [3, staff, 'SUPPORT_STAFF'],
      ] as const) {
        await pool.query(
          'INSERT INTO user_users (id,email,phone,password_hash,full_name,identify_number) VALUES ($1,$2,$3,$4,$5,$6)',
          [id, 'user' + i + '@example.test', '039871234' + i, hash, 'Tester ' + i, 'fixture' + i],
        );
        await pool.query(
          'INSERT INTO user_user_roles (user_id, role_id) SELECT $1,id FROM user_roles WHERE role_code = $2',
          [id, role],
        );
      }
      await new Promise<void>((done) => commerce.listen(0, '127.0.0.1', done));
      const commerceAddress = commerce.address();
      assert.ok(commerceAddress && typeof commerceAddress !== 'string');
      process.env.COMMERCE_SERVICE_URL = 'http://127.0.0.1:' + commerceAddress.port;
      process.env.USE_IN_MEMORY_DB = 'false';
      const app = createApplication({ databasePool: pool });
      server = await new Promise<ReturnType<typeof app.listen>>((done) => {
        const listener = app.listen(0, '127.0.0.1', () => done(listener));
      });
      const address = server.address();
      assert.ok(address && typeof address !== 'string');
      const base = 'http://127.0.0.1:' + address.port + '/api/v1/users';
      const buyerToken = createJwtToken({ sub: buyer, role: 'BUYER', email: 'buyer@example.test' });
      const staffToken = createJwtToken({
        sub: staff,
        role: 'SUPPORT_STAFF',
        email: 'staff@example.test',
      });
      async function request(path: string, method = 'GET', body?: object, token = buyerToken) {
        const response = await fetch(base + path, {
          method,
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
          },
          body: body && JSON.stringify(body),
        });
        return { status: response.status, body: (await response.json()) as any };
      }
      assert.equal(
        (await request('/profile', 'PATCH', { dateOfBirth: '2000-02-30' })).body.code,
        'INVALID_DATE_OF_BIRTH',
      );
      assert.equal(
        (await request('/profile', 'PATCH', { dateOfBirth: '2000-02-29', gender: 'UNSPECIFIED' }))
          .status,
        200,
      );
      const profile = await request('/profile?email=user2@example.test');
      assert.equal(profile.body.data.id, buyer);
      assert.equal(profile.body.data.dateOfBirth, '2000-02-29');
      assert.equal(profile.body.data.gender, 'UNSPECIFIED');
      assert.equal(
        (
          await request('/change-password', 'POST', {
            currentPassword: 'wrong',
            newPassword: 'NewPass456',
          })
        ).body.code,
        'INVALID_CURRENT_PASSWORD',
      );
      assert.equal(
        (
          await request('/change-password', 'POST', {
            currentPassword: 'OldPass123',
            newPassword: 'NewPass456',
          })
        ).status,
        200,
      );

      const addressInput = {
        recipientName: 'Tester',
        phone: '0901234567',
        provinceCode: '79',
        provinceName: 'TP HCM',
        wardCode: '1',
        wardName: 'Phường 1',
        street: 'Đường A',
      };
      const inserts = await Promise.all(
        Array.from({ length: 6 }, () => request('/me/addresses', 'POST', addressInput)),
      );
      assert.equal(inserts.filter((item) => item.status === 201).length, 5);
      assert.equal(inserts.filter((item) => item.body.code === 'ADDRESS_LIMIT_REACHED').length, 1);
      const addresses = await request('/me/addresses');
      assert.equal(addresses.body.meta.source, 'SERVER');
      const defaultId = addresses.body.data.find(
        (item: { isDefault: boolean }) => item.isDefault,
      ).id;
      const removed = await request('/me/addresses/' + defaultId, 'DELETE');
      assert.equal(removed.status, 200);
      assert.equal(
        removed.body.data.filter((item: { isDefault: boolean }) => item.isDefault).length,
        1,
      );

      assert.equal(
        (
          await request(
            '/' + buyer + '/adjust-reputation',
            'POST',
            { points: -100, reason: 'Test adjustment' },
            staffToken,
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await request(
            '/' + buyer + '/restrict-features',
            'POST',
            { restriction: 'BAN_BIDDING', durationDays: 2, reason: 'Test reason' },
            staffToken,
          )
        ).status,
        200,
      );
      const reputation = await request('/me/reputation');
      assert.equal(reputation.body.data.reputationScore, 0);
      assert.equal(reputation.body.data.recentHistory[0].delta, -100);
      assert.equal(reputation.body.data.activeRestrictions[0].feature, 'AUCTION_BID');
      assert.equal(reputation.body.data.biddingEligible, false);

      const publicPath = '/' + seller + '/public-profile';
      const reviewsPath = '/' + seller + '/reviews';
      assert.equal((await request(publicPath)).body.data.averageRating, null);
      assert.equal(
        (await request(reviewsPath, 'POST', { orderId: 'first', rating: 5 })).status,
        422,
      );
      caseStatus = undefined;
      const ratings = await Promise.all(
        ['order-alias', 'other-alias'].map((orderId) =>
          request(reviewsPath, 'POST', { orderId, rating: 5 }),
        ),
      );
      assert.deepEqual(ratings.map((value) => value.status).sort(), [201, 409]);
      const sellerProfile = (await request(publicPath)).body.data;
      assert.equal(sellerProfile.averageRating, 5);
      assert.equal(sellerProfile.totalReviews, 1);
      assert.ok(!('email' in sellerProfile) && !('phone' in sellerProfile));
      assert.equal((await request(reviewsPath + '?rating=5')).body.data.items.length, 1);
    } finally {
      if (server) await new Promise<void>((done) => server!.close(() => done()));
      if (commerce.listening) await new Promise<void>((done) => commerce.close(() => done()));
      if (oldCommerce === undefined) delete process.env.COMMERCE_SERVICE_URL;
      else process.env.COMMERCE_SERVICE_URL = oldCommerce;
      if (oldMemory === undefined) delete process.env.USE_IN_MEMORY_DB;
      else process.env.USE_IN_MEMORY_DB = oldMemory;
      await pool.end();
      try {
        await admin.query('DROP SCHEMA IF EXISTS ' + schema + ' CASCADE');
      } finally {
        await admin.end();
      }
    }
  },
);
