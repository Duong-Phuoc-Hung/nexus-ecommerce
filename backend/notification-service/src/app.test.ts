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

test('Web Push Notifications: VAPID Key, Subscribe, Broadcast & Unsubscribe lifecycle', async () => {
  await withNotificationServer(async (baseUrl) => {
    // 1. GET /api/v1/notifications/push/vapid-public-key
    const vapidRes = await fetch(`${baseUrl}/api/v1/notifications/push/vapid-public-key`);
    assert.equal(vapidRes.status, 200);
    const vapidJson = (await vapidRes.json()) as any;
    assert.equal(vapidJson.success, true);
    assert.ok(vapidJson.data.publicKey);
    assert.equal(vapidJson.data.algorithm, 'ES256');

    // 2. POST /api/v1/notifications/push/subscribe
    const mockEndpoint = 'https://fcm.googleapis.com/fcm/send/test-sub-token-123';
    const subRes = await fetch(`${baseUrl}/api/v1/notifications/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'usr_buyer_001',
        subscription: {
          endpoint: mockEndpoint,
          keys: {
            p256dh:
              'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9t04knZX-MDSHWeS8WWD0nG5pLSmW4B_yA9f7kP9kGfM6c',
            auth: 'tBHItJI5svbpez7KI4CCXg',
          },
        },
      }),
    });
    assert.equal(subRes.status, 201);
    const subJson = (await subRes.json()) as any;
    assert.equal(subJson.success, true);
    assert.equal(subJson.data.userId, 'usr_buyer_001');
    assert.equal(subJson.data.endpoint, mockEndpoint);

    // 3. GET /api/v1/notifications/push/subscriptions?userId=usr_buyer_001
    const listRes = await fetch(
      `${baseUrl}/api/v1/notifications/push/subscriptions?userId=usr_buyer_001`,
    );
    assert.equal(listRes.status, 200);
    const listJson = (await listRes.json()) as any;
    assert.equal(listJson.count, 1);
    assert.equal(listJson.data[0].endpoint, mockEndpoint);

    // 4. POST /api/v1/notifications/push/send (Dispatches push to buyer)
    const sendRes = await fetch(`${baseUrl}/api/v1/notifications/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'usr_buyer_001',
        title: 'Đơn hàng NX-ORD-8021 đã xuất kho',
        body: 'Vận đơn GHN đang trên đường giao tới bạn.',
        url: '/orders/NX-ORD-8021',
      }),
    });
    assert.equal(sendRes.status, 200);
    const sendJson = (await sendRes.json()) as any;
    assert.equal(sendJson.success, true);
    assert.equal(sendJson.data.targetCount, 1);
    assert.deepEqual(sendJson.data.deliveredEndpoints, [mockEndpoint]);

    // 5. POST /api/v1/notifications/push/unsubscribe
    const unsubRes = await fetch(`${baseUrl}/api/v1/notifications/push/unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: mockEndpoint,
      }),
    });
    assert.equal(unsubRes.status, 200);
    const unsubJson = (await unsubRes.json()) as any;
    assert.equal(unsubJson.success, true);
    assert.equal(unsubJson.removed, true);

    // 6. Verify list is now empty for that user
    const listEmptyRes = await fetch(
      `${baseUrl}/api/v1/notifications/push/subscriptions?userId=usr_buyer_001`,
    );
    const listEmptyJson = (await listEmptyRes.json()) as any;
    assert.equal(listEmptyJson.count, 0);
  });
});

test('TASK-NOT-01: SSE Stream, in-app inbox and mark as read', async () => {
  await withNotificationServer(async (baseUrl) => {
    // 1. Kết nối SSE stream
    const controller = new AbortController();
    const streamRes = await fetch(`${baseUrl}/api/v1/notifications/stream`, {
      signal: controller.signal,
    });
    assert.equal(streamRes.status, 200);
    assert.match(streamRes.headers.get('content-type') || '', /text\/event-stream/);

    // 2. Gửi thông báo in-app
    const sendRes = await fetch(`${baseUrl}/api/v1/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientId: 'buyer_test_uuid',
        channel: 'IN_APP',
        title: 'Đơn hàng đã được xác nhận',
        body: 'Người bán đã chuẩn bị hàng cho bạn.',
      }),
    });
    assert.equal(sendRes.status, 202);
    const sendJson = (await sendRes.json()) as any;
    assert.equal(sendJson.success, true);
    assert.equal(sendJson.data.recipientId, 'buyer_test_uuid');
    assert.equal(sendJson.data.status, 'DELIVERED');
    const noticeId = sendJson.data.id;

    // 3. Tra cứu hộp thư đến: GET /api/v1/notifications/inbox
    const inboxRes = await fetch(`${baseUrl}/api/v1/notifications/inbox?userId=buyer_test_uuid`);
    assert.equal(inboxRes.status, 200);
    const inboxJson = (await inboxRes.json()) as any;
    assert.equal(inboxJson.success, true);
    assert.equal(inboxJson.data.total, 1);
    assert.equal(inboxJson.data.unreadCount, 1);
    assert.equal(inboxJson.data.items[0].title, 'Đơn hàng đã được xác nhận');
    assert.equal(inboxJson.data.items[0].read, false);

    // 4. Đánh dấu đã đọc: PUT /api/v1/notifications/:id/read
    const readRes = await fetch(`${baseUrl}/api/v1/notifications/${noticeId}/read`, {
      method: 'PUT',
    });
    assert.equal(readRes.status, 200);

    // 5. Kiểm tra lại inbox: unreadCount = 0
    const checkRes = await fetch(`${baseUrl}/api/v1/notifications/inbox?userId=buyer_test_uuid`);
    const checkJson = (await checkRes.json()) as any;
    assert.equal(checkJson.data.unreadCount, 0);
    assert.equal(checkJson.data.items[0].read, true);

    // Dọn dẹp stream connection
    controller.abort();
  });
});

test('GET /api/v1/notifications alias and /preferences endpoints', async () => {
  await withNotificationServer(async (baseUrl) => {
    // 1. GET /api/v1/notifications trả về danh sách inbox trực tiếp
    const aliasRes = await fetch(`${baseUrl}/api/v1/notifications`);
    assert.equal(aliasRes.status, 200);
    const aliasJson = (await aliasRes.json()) as any;
    assert.equal(aliasJson.success, true);
    assert.ok(Array.isArray(aliasJson.data.items));

    // 2. GET /api/v1/notifications/preferences
    const getPrefsRes = await fetch(`${baseUrl}/api/v1/notifications/preferences`);
    assert.equal(getPrefsRes.status, 200);
    const getPrefsJson = (await getPrefsRes.json()) as any;
    assert.equal(getPrefsJson.success, true);
    assert.equal(getPrefsJson.data.orderEmail, true);
    assert.equal(getPrefsJson.data.orderPush, true);

    // 3. PUT /api/v1/notifications/preferences
    const putPrefsRes = await fetch(`${baseUrl}/api/v1/notifications/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderEmail: true, orderPush: false }),
    });
    assert.equal(putPrefsRes.status, 200);
    const putPrefsJson = (await putPrefsRes.json()) as any;
    assert.equal(putPrefsJson.success, true);
  });
});
