/**
 * ==============================================================================
 * Project Nexus - Comprehensive Backend Services Unit & Integration Tests
 * Exercises Domain Use-Cases, Repositories, Controllers, and Routes across
 * all 6 Bounded Contexts and API Gateway.
 * ==============================================================================
 */

process.env.USE_IN_MEMORY_DB = 'true';
process.env.SKIP_REDIS_HEALTHCHECK = 'true';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

// Helper to run express app on ephemeral port
async function withServer(app, run) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');

  try {
    return await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

describe('🔬 [Unit & Integration] 6 Bounded Contexts & API Gateway Verification', () => {
  test('1. API Gateway Endpoints', async () => {
    const { createApplication } = require(path.join(ROOT_DIR, 'backend/api-gateway/dist/app.js'));
    const app = createApplication();
    await withServer(app, async (baseUrl) => {
      const healthRes = await fetch(`${baseUrl}/health`);
      assert.equal(healthRes.status, 200);
      const healthData = await healthRes.json();
      assert.equal(healthData.status, 'UP');
      assert.equal(healthData.gateway, 'api-gateway');

      const infoRes = await fetch(`${baseUrl}/api/v1`);
      assert.equal(infoRes.status, 200);
      const infoData = await infoRes.json();
      assert.equal(infoData.name, 'Nexus E-Commerce & Auction API Gateway');
      assert.ok(infoData.boundedContexts.length >= 6);
    });
  });

  test('2. User Service Endpoints & Use Cases', async () => {
    const { createApplication } = require(path.join(ROOT_DIR, 'backend/user-service/dist/app.js'));
    const app = createApplication();
    await withServer(app, async (baseUrl) => {
      const healthRes = await fetch(`${baseUrl}/health`);
      assert.equal(healthRes.status, 200);

      // 1. Unauthorized request without token fails with 401
      const unauthRes = await fetch(`${baseUrl}/api/v1/users/profile`);
      assert.equal(unauthRes.status, 401);

      // 2. POST /api/v1/auth/register creates new account
      const regRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'newdev@nexus.com',
          password: 'Password@123',
          fullName: 'New Developer',
        }),
      });
      assert.equal(regRes.status, 201);
      const regData = await regRes.json();
      assert.equal(regData.success, true);

      // 3. POST /api/v1/auth/login logs in and receives JWT token
      const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'buyer.test@nexus-ecommerce.com', password: 'Password123!' }),
      });
      assert.equal(loginRes.status, 200);
      const loginData = await loginRes.json();
      assert.equal(loginData.success, true);
      assert.ok(loginData.data.token);

      // 4. GET /api/v1/users/profile with Bearer token succeeds with 200
      const profileRes = await fetch(`${baseUrl}/api/v1/users/profile`, {
        headers: { Authorization: `Bearer ${loginData.data.token}` },
      });
      assert.equal(profileRes.status, 200);
      const profileData = await profileRes.json();
      assert.equal(profileData.success, true);
      assert.equal(profileData.data.email, 'buyer.test@nexus-ecommerce.com');
      // 5. POST /api/v1/auth/forgot-password requests password reset token
      const forgotRes = await fetch(`${baseUrl}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'buyer.test@nexus-ecommerce.com' }),
      });
      assert.equal(forgotRes.status, 200);
      const forgotData = await forgotRes.json();
      assert.equal(forgotData.success, true);

      // 6. POST /api/v1/auth/logout revokes session token
      const logoutRes = await fetch(`${baseUrl}/api/v1/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${loginData.data.token}` },
      });
      assert.equal(logoutRes.status, 200);
      const logoutData = await logoutRes.json();
      assert.equal(logoutData.success, true);
    });
  });

  test('3. Catalog Service Endpoints & Use Cases', async () => {
    const { createApplication } = require(
      path.join(ROOT_DIR, 'backend/catalog-service/dist/app.js'),
    );
    const app = createApplication();
    await withServer(app, async (baseUrl) => {
      const healthRes = await fetch(`${baseUrl}/health`);
      assert.equal(healthRes.status, 200);

      // GET /api/v1/products (List all products)
      const listRes = await fetch(`${baseUrl}/api/v1/products`);
      assert.equal(listRes.status, 200);
      const listData = await listRes.json();
      assert.equal(listData.success, true);
      assert.ok(Array.isArray(listData.data));

      // GET /api/v1/products/search
      const searchRes = await fetch(`${baseUrl}/api/v1/products/search?q=sony`);
      assert.equal(searchRes.status, 200);
      const searchData = await searchRes.json();
      assert.equal(searchData.success, true);

      // GET /api/v1/products/prod_01hqz999xyz
      const prodRes = await fetch(`${baseUrl}/api/v1/products/prod_01hqz999xyz`);
      assert.equal(prodRes.status, 200);
      const prodData = await prodRes.json();
      assert.equal(prodData.success, true);
      assert.equal(prodData.data.title, 'Sony WH-1000XM5 Wireless Headphones');
    });
  });

  test('4. Commerce Service Endpoints & Use Cases', async () => {
    const { createApplication } = require(
      path.join(ROOT_DIR, 'backend/commerce-service/dist/app.js'),
    );
    const app = createApplication();
    await withServer(app, async (baseUrl) => {
      const healthRes = await fetch(`${baseUrl}/health`);
      assert.equal(healthRes.status, 200);

      // GET /api/v1/orders/ord_01hqz555abc
      const orderRes = await fetch(`${baseUrl}/api/v1/orders/ord_01hqz555abc`, {
        headers: { 'x-user-id': 'usr_staff_001', 'x-user-role': 'SUPPORT_STAFF' },
      });
      assert.equal(orderRes.status, 200);
      const orderData = await orderRes.json();
      assert.equal(orderData.success, true);
      assert.equal(orderData.data.id, 'ord_01hqz555abc');

      // POST /api/v1/orders/checkout (Checkout flow)
      const checkoutRes = await fetch(`${baseUrl}/api/v1/orders/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ productId: 'prod_01hqz999xyz', quantity: 1, unitPrice: 399.99 }],
          shippingAddress: '123 Tech Boulevard, Silicon District',
        }),
      });
      assert.equal(checkoutRes.status, 201);
      const checkoutData = await checkoutRes.json();
      assert.equal(checkoutData.success, true);
      assert.ok(checkoutData.data.orderId);
    });
  });

  test('5. Auction Service Endpoints & Use Cases', async () => {
    const { createApplication } = require(
      path.join(ROOT_DIR, 'backend/auction-service/dist/app.js'),
    );
    const app = createApplication();
    await withServer(app, async (baseUrl) => {
      const healthRes = await fetch(`${baseUrl}/health`);
      assert.equal(healthRes.status, 200);

      // GET /api/v1/auctions/auc_01hqz777live
      const aucRes = await fetch(`${baseUrl}/api/v1/auctions/auc_01hqz777live`);
      assert.equal(aucRes.status, 200);
      const aucData = await aucRes.json();
      assert.equal(aucData.success, true);
      assert.equal(aucData.data.id, 'auc_01hqz777live');
    });
  });

  test('6. Fulfillment Service Endpoints & Use Cases', async () => {
    const { createApplication } = require(
      path.join(ROOT_DIR, 'backend/fulfillment-service/dist/app.js'),
    );
    const app = createApplication();
    await withServer(app, async (baseUrl) => {
      const healthRes = await fetch(`${baseUrl}/health`);
      assert.equal(healthRes.status, 200);

      // GET /api/v1/fulfillments/shp_01hqz222trk
      const shpRes = await fetch(`${baseUrl}/api/v1/fulfillments/shp_01hqz222trk`, {
        headers: { 'x-user-id': 'usr_staff_001', 'x-user-role': 'SUPPORT_STAFF' },
      });
      assert.equal(shpRes.status, 200);
      const shpData = await shpRes.json();
      assert.equal(shpData.success, true);
      assert.equal(shpData.data.id, 'shp_01hqz222trk');

      // PATCH /api/v1/fulfillments/shipments/shp_01hqz222trk/status
      const patchRes = await fetch(
        `${baseUrl}/api/v1/fulfillments/shipments/shp_01hqz222trk/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': 'usr_staff_001',
            'x-user-role': 'SUPPORT_STAFF',
          },
          body: JSON.stringify({ status: 'DELIVERED', trackingCode: 'VNPOST998811' }),
        },
      );
      assert.equal(patchRes.status, 200);
      const patchData = await patchRes.json();
      assert.equal(patchData.success, true);
      assert.equal(patchData.data.newStatus, 'DELIVERED');
    });
  });

  test('7. Notification Service Endpoints & Use Cases', async () => {
    const { createApplication } = require(
      path.join(ROOT_DIR, 'backend/notification-service/dist/app.js'),
    );
    const app = createApplication();
    await withServer(app, async (baseUrl) => {
      const healthRes = await fetch(`${baseUrl}/health`);
      assert.equal(healthRes.status, 200);

      // GET /api/v1/notifications/ntf_01hqz111welcome
      const notifRes = await fetch(`${baseUrl}/api/v1/notifications/ntf_01hqz111welcome`);
      assert.equal(notifRes.status, 200);
      const notifData = await notifRes.json();
      assert.equal(notifData.success, true);
      assert.equal(notifData.data.id, 'ntf_01hqz111welcome');

      // POST /api/v1/notifications/send
      const sendRes = await fetch(`${baseUrl}/api/v1/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: 'usr_01hqz789abc',
          channel: 'EMAIL',
          title: 'Order Confirmed',
          body: 'Your order #ord_01hqz555abc has been confirmed.',
        }),
      });
      assert.equal(sendRes.status, 202);
      const sendData = await sendRes.json();
      assert.equal(sendData.success, true);
      assert.equal(sendData.data.channel, 'EMAIL');
    });
  });
});
