import assert from 'node:assert/strict';
import test from 'node:test';
import { createApplication } from './app';

async function withNotificationServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
  const app = createApplication();
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');

  try {
    return await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

test('GET /health returns 200 UP for notification-service', async () => {
  await withNotificationServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const json = (await res.json()) as any;
    assert.equal(json.status, 'UP');
    assert.equal(json.service, 'notification-service');
  });
});

test('POST /api/v1/notifications/email/otp sends OTP email endpoint', async () => {
  await withNotificationServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/v1/notifications/email/otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test.user@nexus.vn',
        otp: '123456',
        fullName: 'Test User',
      }),
    });
    assert.equal(res.status, 200);
    const json = (await res.json()) as any;
    assert.equal(json.success, true);
  });
});

test('POST /api/v1/notifications/email/welcome sends welcome email endpoint', async () => {
  await withNotificationServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/v1/notifications/email/welcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'welcome.user@nexus.vn',
        fullName: 'Welcome User',
      }),
    });
    assert.equal(res.status, 200);
    const json = (await res.json()) as any;
    assert.equal(json.success, true);
  });
});

test('POST /api/v1/notifications/email/send sends custom notification email endpoint', async () => {
  await withNotificationServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/v1/notifications/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alert.user@nexus.vn',
        title: 'Bảo trì hệ thống',
        body: 'Hệ thống sẽ bảo trì định kỳ lúc 00:00.',
      }),
    });
    assert.equal(res.status, 200);
    const json = (await res.json()) as any;
    assert.equal(json.success, true);
  });
});
