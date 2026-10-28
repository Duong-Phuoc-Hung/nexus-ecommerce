import assert from 'node:assert/strict';
import test from 'node:test';
import { createApplication } from './app';

async function withUserServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
  process.env.NODE_ENV = 'test';
  process.env.USE_IN_MEMORY_DB = 'true';
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

test('POST /api/v1/auth/register saves real phone, rejects fake roles, and enforces duplicate phone checks', async () => {
  await withUserServer(async (baseUrl) => {
    // 1. Đăng ký tài khoản với role: ADMIN (thử leo thang đặc quyền) và phone thật
    const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'realphone.buyer@nexus.vn',
        fullName: 'Real Phone Buyer',
        password: 'Password123!',
        phone: '0987654321',
        role: 'ADMIN', // Thử nâng quyền
      }),
    });

    assert.equal(res.status, 201);
    const json = (await res.json()) as any;
    assert.equal(json.success, true);
    assert.equal(json.data.phone, '0987654321');
    assert.equal(json.data.role, 'BUYER'); // Chặn nâng quyền, luôn là BUYER

    // 2. Đăng ký tài khoản khác nhưng dùng trùng số điện thoại
    const dupPhoneRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'other.buyer@nexus.vn',
        fullName: 'Other Buyer',
        password: 'Password123!',
        phone: '0987654321', // Trùng phone
      }),
    });
    assert.equal(dupPhoneRes.status, 409);
    const dupJson = (await dupPhoneRes.json()) as any;
    assert.ok(dupJson.error.includes('Số điện thoại'));

    // 3. Đăng ký với số điện thoại sai định dạng VN
    const invalidPhoneRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'invalidphone@nexus.vn',
        fullName: 'Invalid Phone',
        password: 'Password123!',
        phone: '12345678', // Sai định dạng
      }),
    });
    assert.equal(invalidPhoneRes.status, 400);
  });
});

test('Profile & Address Book flow: CRUD addresses, 5 address limit, default promotion, and route collision prevention', async () => {
  await withUserServer(async (baseUrl) => {
    // 1. Đăng ký tài khoản Buyer A
    const regRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'buyer.a@nexus.vn',
        fullName: 'Buyer A',
        password: 'Password123!',
        phone: '0911223344',
      }),
    });
    assert.equal(regRes.status, 201);

    // 2. Đăng nhập để lấy token Buyer A
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'buyer.a@nexus.vn',
        password: 'Password123!',
      }),
    });
    assert.equal(loginRes.status, 200);
    const loginJson = (await loginRes.json()) as any;
    const tokenA = loginJson.data.accessToken || loginJson.data.token;
    assert.ok(tokenA);

    // 3. GET /api/v1/users/profile trả về phone
    const profileRes = await fetch(`${baseUrl}/api/v1/users/profile`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(profileRes.status, 200);
    const profileJson = (await profileRes.json()) as any;
    assert.equal(profileJson.data.phone, '0911223344');

    // 4. PATCH /api/v1/users/profile cập nhật fullName và phone
    const patchProfileRes = await fetch(`${baseUrl}/api/v1/users/profile`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fullName: 'Buyer A Updated',
        phone: '0922334455',
      }),
    });
    assert.equal(patchProfileRes.status, 200);
    const patchJson = (await patchProfileRes.json()) as any;
    assert.equal(patchJson.data.fullName, 'Buyer A Updated');
    assert.equal(patchJson.data.phone, '0922334455');

    // 5. GET /api/v1/users/me/addresses: KIỂM TRA TRÁNH XUNG ĐỘT ROUTE!
    // Buyer gọi route này KHÔNG ĐƯỢC BỊ /:id nuốt thành 403 Forbidden!
    const listRes1 = await fetch(`${baseUrl}/api/v1/users/me/addresses`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(listRes1.status, 200);
    const listJson1 = (await listRes1.json()) as any;
    assert.deepEqual(listJson1.data, []);

    // 6. POST /api/v1/users/me/addresses: Tạo địa chỉ đầu tiên (tự động là default)
    const add1Res = await fetch(`${baseUrl}/api/v1/users/me/addresses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        label: 'Nhà riêng',
        recipientName: 'Buyer A',
        phone: '0922334455',
        provinceCode: '79',
        provinceName: 'Thành phố Hồ Chí Minh',
        wardCode: '26734',
        wardName: 'Phường Bến Nghé',
        street: '123 Lê Lợi',
        note: 'Giao giờ hành chính',
      }),
    });
    assert.equal(add1Res.status, 201);
    const add1 = (await add1Res.json()) as any;
    assert.equal(add1.data.isDefault, true); // Địa chỉ đầu tiên tự động default
    const addrId1 = add1.data.id;

    // 7. Tạo thêm 4 địa chỉ nữa (đạt tối đa 5 địa chỉ)
    for (let i = 2; i <= 5; i++) {
      const res = await fetch(`${baseUrl}/api/v1/users/me/addresses`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientName: `Buyer A - ${i}`,
          phone: '0922334455',
          provinceCode: '79',
          provinceName: 'Thành phố Hồ Chí Minh',
          wardCode: '26734',
          wardName: 'Phường Bến Nghé',
          street: `${i} Nguyễn Huệ`,
        }),
      });
      assert.equal(res.status, 201);
    }

    // 8. Tạo địa chỉ thứ 6 -> BỊ TỪ CHỐI 422 ADDRESS_LIMIT_REACHED
    const add6Res = await fetch(`${baseUrl}/api/v1/users/me/addresses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipientName: 'Buyer A - 6',
        phone: '0922334455',
        provinceCode: '79',
        provinceName: 'Thành phố Hồ Chí Minh',
        wardCode: '26734',
        wardName: 'Phường Bến Nghé',
        street: '6 Nguyễn Huệ',
      }),
    });
    assert.equal(add6Res.status, 422);
    const add6Json = (await add6Res.json()) as any;
    assert.equal(add6Json.code, 'ADDRESS_LIMIT_REACHED');

    // 9. Lấy danh sách 5 địa chỉ
    const listRes2 = await fetch(`${baseUrl}/api/v1/users/me/addresses`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(listRes2.status, 200);
    const listJson2 = (await listRes2.json()) as any;
    assert.equal(listJson2.data.length, 5);
    const addr2Id = listJson2.data[1].id;

    // 10. PUT /api/v1/users/me/addresses/:id/default -> Đổi mặc định sang địa chỉ thứ 2
    const setDefaultRes = await fetch(`${baseUrl}/api/v1/users/me/addresses/${addr2Id}/default`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(setDefaultRes.status, 200);

    const listRes3 = await fetch(`${baseUrl}/api/v1/users/me/addresses`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const listJson3 = (await listRes3.json()) as any;
    // Kiểm tra chỉ có duy nhất 1 địa chỉ default
    const defaults = listJson3.data.filter((a: any) => a.isDefault);
    assert.equal(defaults.length, 1);
    assert.equal(defaults[0].id, addr2Id);

    // 11. Buyer B đăng nhập và thử can thiệp vào địa chỉ của Buyer A -> Bị chặn 403
    const regB = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'buyer.b@nexus.vn',
        fullName: 'Buyer B',
        password: 'Password123!',
        phone: '0977889900',
      }),
    });
    assert.equal(regB.status, 201);
    const loginB = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'buyer.b@nexus.vn',
        password: 'Password123!',
      }),
    });
    const tokenB = ((await loginB.json()) as any).data.accessToken;

    const crossUpdateRes = await fetch(`${baseUrl}/api/v1/users/me/addresses/${addrId1}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${tokenB}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ recipientName: 'Hacker' }),
    });
    assert.equal(crossUpdateRes.status, 403);

    // 12. Buyer A xóa địa chỉ mặc định (addr2Id) -> Tự động chuyển mặc định cho địa chỉ còn lại tạo sớm nhất
    const delRes = await fetch(`${baseUrl}/api/v1/users/me/addresses/${addr2Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(delRes.status, 200);

    const listRes4 = await fetch(`${baseUrl}/api/v1/users/me/addresses`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const listJson4 = (await listRes4.json()) as any;
    assert.equal(listJson4.data.length, 4);
    const remainingDefaults = listJson4.data.filter((a: any) => a.isDefault);
    assert.equal(remainingDefaults.length, 1);
    assert.equal(remainingDefaults[0].id, addrId1); // addrId1 tạo sớm nhất nên được tự động thăng làm default!
  });
});
