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
