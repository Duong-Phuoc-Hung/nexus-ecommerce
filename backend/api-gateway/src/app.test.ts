import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { createApplication } from './app';

test('gateway proxies auth requests with path, bearer header, body, and status', async (t) => {
  const upstream = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    res.statusCode = 201;
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({
        url: req.url,
        authorization: req.headers.authorization,
        body: Buffer.concat(chunks).toString('utf8'),
      }),
    );
  });

  await new Promise<void>((resolve) => upstream.listen(0, '127.0.0.1', resolve));
  const upstreamAddress = upstream.address();
  assert.ok(upstreamAddress && typeof upstreamAddress !== 'string');

  const previousUserServiceUrl = process.env.USER_SERVICE_URL;
  process.env.USER_SERVICE_URL = `http://127.0.0.1:${upstreamAddress.port}`;
  const gateway = createApplication();
  if (previousUserServiceUrl === undefined) delete process.env.USER_SERVICE_URL;
  else process.env.USER_SERVICE_URL = previousUserServiceUrl;

  const gatewayServer = gateway.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => gatewayServer.once('listening', resolve));
  const gatewayAddress = gatewayServer.address();
  assert.ok(gatewayAddress && typeof gatewayAddress !== 'string');

  t.after(async () => {
    await Promise.all([
      new Promise<void>((resolve, reject) =>
        gatewayServer.close((error) => (error ? reject(error) : resolve())),
      ),
      new Promise<void>((resolve, reject) =>
        upstream.close((error) => (error ? reject(error) : resolve())),
      ),
    ]);
  });

  const response = await fetch(`http://127.0.0.1:${gatewayAddress.port}/api/v1/auth/register`, {
    method: 'POST',
    headers: {
      authorization: 'Bearer test-token',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ email: 'proxy@example.com' }),
  });
  const payload = (await response.json()) as {
    url: string;
    authorization: string;
    body: string;
  };

  assert.equal(response.status, 201);
  assert.equal(payload.url, '/api/v1/auth/register');
  assert.equal(payload.authorization, 'Bearer test-token');
  assert.deepEqual(JSON.parse(payload.body), { email: 'proxy@example.com' });
});

test('gateway proxies category requests to catalog service with query parameters', async (t) => {
  const upstream = createServer(async (req, res) => {
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({
        url: req.url,
        success: true,
        data: [{ id: '1', name: 'Thiết bị điện tử', level: 1 }],
      }),
    );
  });

  await new Promise<void>((resolve) => upstream.listen(0, '127.0.0.1', resolve));
  const upstreamAddress = upstream.address();
  assert.ok(upstreamAddress && typeof upstreamAddress !== 'string');

  const previousCatalogServiceUrl = process.env.CATALOG_SERVICE_URL;
  process.env.CATALOG_SERVICE_URL = `http://127.0.0.1:${upstreamAddress.port}`;
  const gateway = createApplication();
  if (previousCatalogServiceUrl === undefined) delete process.env.CATALOG_SERVICE_URL;
  else process.env.CATALOG_SERVICE_URL = previousCatalogServiceUrl;

  const gatewayServer = gateway.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => gatewayServer.once('listening', resolve));
  const gatewayAddress = gatewayServer.address();
  assert.ok(gatewayAddress && typeof gatewayAddress !== 'string');

  t.after(async () => {
    await Promise.all([
      new Promise<void>((resolve, reject) =>
        gatewayServer.close((error) => (error ? reject(error) : resolve())),
      ),
      new Promise<void>((resolve, reject) =>
        upstream.close((error) => (error ? reject(error) : resolve())),
      ),
    ]);
  });

  const response = await fetch(
    `http://127.0.0.1:${gatewayAddress.port}/api/v1/categories?tree=true`,
  );
  const payload = (await response.json()) as any;

  assert.equal(response.status, 200);
  assert.equal(payload.url, '/api/v1/categories?tree=true');
  assert.equal(payload.success, true);
});

test('gateway proxies support dashboard and shipment requests to fulfillment service', async (t) => {
  const upstream = createServer(async (req, res) => {
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({
        url: req.url,
        success: true,
        data: { pendingCases: 8, processingCases: 5, resolvedToday: 17, flaggedShipments: 4 },
      }),
    );
  });

  await new Promise<void>((resolve) => upstream.listen(0, '127.0.0.1', resolve));
  const upstreamAddress = upstream.address();
  assert.ok(upstreamAddress && typeof upstreamAddress !== 'string');

  const previousFulfillmentServiceUrl = process.env.FULFILLMENT_SERVICE_URL;
  process.env.FULFILLMENT_SERVICE_URL = `http://127.0.0.1:${upstreamAddress.port}`;
  const gateway = createApplication();
  if (previousFulfillmentServiceUrl === undefined) delete process.env.FULFILLMENT_SERVICE_URL;
  else process.env.FULFILLMENT_SERVICE_URL = previousFulfillmentServiceUrl;

  const gatewayServer = gateway.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => gatewayServer.once('listening', resolve));
  const gatewayAddress = gatewayServer.address();
  assert.ok(gatewayAddress && typeof gatewayAddress !== 'string');

  t.after(async () => {
    await Promise.all([
      new Promise<void>((resolve, reject) =>
        gatewayServer.close((error) => (error ? reject(error) : resolve())),
      ),
      new Promise<void>((resolve, reject) =>
        upstream.close((error) => (error ? reject(error) : resolve())),
      ),
    ]);
  });

  const response = await fetch(
    `http://127.0.0.1:${gatewayAddress.port}/api/v1/support/dashboard/summary`,
  );
  const payload = (await response.json()) as any;

  assert.equal(response.status, 200);
  assert.equal(payload.url, '/api/v1/support/dashboard/summary');
  assert.equal(payload.data.pendingCases, 8);
});

test('gateway serves complete swagger specs for commerce and fulfillment', async (t) => {
  const gateway = createApplication();
  const gatewayServer = gateway.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => gatewayServer.once('listening', resolve));
  const gatewayAddress = gatewayServer.address();
  assert.ok(gatewayAddress && typeof gatewayAddress !== 'string');

  t.after(async () => {
    await new Promise<void>((resolve, reject) =>
      gatewayServer.close((error) => (error ? reject(error) : resolve())),
    );
  });

  // 1. Commerce spec
  const commRes = await fetch(`http://127.0.0.1:${gatewayAddress.port}/docs-json/commerce`);
  assert.equal(commRes.status, 200);
  const commJson = (await commRes.json()) as any;
  assert.equal(commJson.openapi, '3.0.0');
  assert.ok(commJson.paths['/api/v1/orders']);
  assert.ok(commJson.paths['/api/v1/orders/{id}/cancel']);

  // 2. Fulfillment spec
  const fulRes = await fetch(`http://127.0.0.1:${gatewayAddress.port}/docs-json/fulfillment`);
  assert.equal(fulRes.status, 200);
  const fulJson = (await fulRes.json()) as any;
  assert.equal(fulJson.openapi, '3.0.0');
  assert.ok(fulJson.paths['/api/v1/fulfillments/shipments']);
  assert.ok(fulJson.paths['/api/v1/fulfillments/shipments/{id}/status']);
  assert.ok(fulJson.paths['/api/v1/support/dashboard/summary']);
});
