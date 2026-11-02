import assert from 'node:assert/strict';
import test from 'node:test';
import { createApplication } from './app';

async function withUserServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
  process.env.NODE_ENV = 'test';
  process.env.USE_IN_MEMORY_DB = 'true';
  process.env.BOOTSTRAP_ADMIN_EMAIL = 'admin.test@nexus-ecommerce.com';
  process.env.BOOTSTRAP_ADMIN_PASSWORD = 'AdminPassword123!';

  const server = createApplication().listen(0, '127.0.0.1');
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

test('GET /api/v1/auth/roles enforces RBAC (401 unauth, 403 buyer, 200 support/admin)', async () => {
  await withUserServer(async (baseUrl) => {
    // 1. Unauthenticated -> 401
    const unauthRes = await fetch(`${baseUrl}/api/v1/auth/roles`);
    assert.equal(unauthRes.status, 401);

    // 2. Authenticate as BUYER -> 403
    const buyerLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'buyer.test@nexus-ecommerce.com',
        password: 'Password123!',
      }),
    });
    assert.equal(buyerLoginRes.status, 200);
    const buyerToken = ((await buyerLoginRes.json()) as any).data.accessToken;

    const buyerRolesRes = await fetch(`${baseUrl}/api/v1/auth/roles`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    assert.equal(buyerRolesRes.status, 403, 'Buyer không có quyền xem roles');

    // 3. Authenticate as SUPPORT_STAFF (có ROLE.VIEW) -> 200
    const staffLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'staff.test@nexus-ecommerce.com',
        password: 'Password123!',
      }),
    });
    assert.equal(staffLoginRes.status, 200);
    const staffToken = ((await staffLoginRes.json()) as any).data.accessToken;

    const staffRolesRes = await fetch(`${baseUrl}/api/v1/auth/roles`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.equal(staffRolesRes.status, 200);

    // 4. Authenticate as ADMIN -> 200
    const adminLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin.test@nexus-ecommerce.com',
        password: 'AdminPassword123!',
      }),
    });
    assert.equal(adminLoginRes.status, 200);
    const adminToken = ((await adminLoginRes.json()) as any).data.accessToken;

    const adminRolesRes = await fetch(`${baseUrl}/api/v1/auth/roles`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(adminRolesRes.status, 200);
    const rolesJson = (await adminRolesRes.json()) as any;
    assert.equal(rolesJson.success, true);
    assert.ok(Array.isArray(rolesJson.data));

    // Verify all system roles are returned with their permissions
    const returnedRoles = rolesJson.data.map((r: any) => r.role);
    assert.ok(returnedRoles.includes('BUYER'));
    assert.ok(returnedRoles.includes('SELLER'));
    assert.ok(returnedRoles.includes('ADMIN'));
    assert.ok(returnedRoles.includes('SUPPORT_STAFF'));

    const adminRoleDef = rolesJson.data.find((r: any) => r.role === 'ADMIN');
    assert.ok(adminRoleDef.permissions.includes('ROLE.UPDATE'));
    assert.ok(adminRoleDef.permissions.includes('ROLE.VIEW'));
  });
});

test('PUT /api/v1/users/:id/role enforces RBAC, validates role input, updates role and revokes sessions', async () => {
  await withUserServer(async (baseUrl) => {
    // 1. Unauthenticated -> 401
    const unauthRes = await fetch(`${baseUrl}/api/v1/users/usr_01hqz789abc/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'SELLER' }),
    });
    assert.equal(unauthRes.status, 401);

    // 2. Authenticate as BUYER -> 403
    const buyerLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'buyer.test@nexus-ecommerce.com',
        password: 'Password123!',
      }),
    });
    assert.equal(buyerLoginRes.status, 200);
    const buyerToken = ((await buyerLoginRes.json()) as any).data.accessToken;

    const buyerUpdateRoleRes = await fetch(`${baseUrl}/api/v1/users/usr_01hqz789abc/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buyerToken}`,
      },
      body: JSON.stringify({ role: 'ADMIN' }),
    });
    assert.equal(buyerUpdateRoleRes.status, 403, 'Buyer không được phép gán role');

    // 3. Authenticate as SUPPORT_STAFF -> 403 (SUPPORT_STAFF chỉ có ROLE.VIEW, không có ROLE.UPDATE)
    const staffLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'staff.test@nexus-ecommerce.com',
        password: 'Password123!',
      }),
    });
    assert.equal(staffLoginRes.status, 200);
    const staffToken = ((await staffLoginRes.json()) as any).data.accessToken;

    const staffUpdateRoleRes = await fetch(`${baseUrl}/api/v1/users/usr_01hqz789abc/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({ role: 'SELLER' }),
    });
    assert.equal(staffUpdateRoleRes.status, 403, 'Support Staff không được phép gán role');

    // 4. Authenticate as ADMIN
    const adminLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin.test@nexus-ecommerce.com',
        password: 'AdminPassword123!',
      }),
    });
    assert.equal(adminLoginRes.status, 200);
    const adminToken = ((await adminLoginRes.json()) as any).data.accessToken;

    // 5. Admin updates with invalid role -> 400 Bad Request
    const invalidRoleRes = await fetch(`${baseUrl}/api/v1/users/usr_01hqz789abc/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ role: 'SUPER_ADMIN' }),
    });
    assert.equal(invalidRoleRes.status, 400);

    // 6. Admin updates non-existent user -> 404 Not Found
    const notFoundRes = await fetch(`${baseUrl}/api/v1/users/usr_non_existent/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ role: 'SELLER' }),
    });
    assert.equal(notFoundRes.status, 404);

    // 7. Admin updates valid user (buyer -> SELLER) -> 200 OK
    const updateSuccessRes = await fetch(`${baseUrl}/api/v1/users/usr_01hqz789abc/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ role: 'SELLER' }),
    });
    assert.equal(updateSuccessRes.status, 200);
    const updateJson = (await updateSuccessRes.json()) as any;
    assert.equal(updateJson.success, true);
    assert.equal(updateJson.data.id, 'usr_01hqz789abc');
    assert.equal(updateJson.data.role, 'SELLER');

    // 8. Session Revocation Check (SRS 3.1.2 requirement):
    // Buyer's previous active token must now be REVOKED/INVALID
    const revokedCheckRes = await fetch(`${baseUrl}/api/v1/users/profile`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    assert.equal(
      revokedCheckRes.status,
      401,
      'Token cũ của user phải bị vô hiệu hóa ngay sau khi đổi role',
    );
  });
});
