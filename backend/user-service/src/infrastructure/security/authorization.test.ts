import assert from 'node:assert/strict';
import test from 'node:test';
import { createJwtToken } from './auth';
import { requireAuth, requirePermission } from './authorization';

test('requireAuth accepts valid JWT and enriches request user', () => {
  const req: any = {
    headers: {
      authorization: `Bearer ${createJwtToken({ sub: 'usr_123', email: 'test@nexus.com', role: 'BUYER' })}`,
    },
  };
  const res: any = {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.payload = payload;
      return this;
    },
  };
  const next = () => {
    req.nextCalled = true;
  };

  requireAuth(req, res, next);

  assert.equal(req.nextCalled, true);
  assert.equal(req.user?.sub, 'usr_123');
  assert.equal(req.user?.role, 'BUYER');
});

test('requirePermission rejects missing permission', () => {
  const req: any = {
    user: { role: 'BUYER', permissions: ['PROFILE.VIEW'] },
  };
  const res: any = {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.payload = payload;
      return this;
    },
  };

  const next = () => {
    req.nextCalled = true;
  };

  requirePermission('USER.LIST')(req, res, next);

  assert.equal(res.statusCode, 403);
  assert.equal(req.nextCalled, undefined);
});
