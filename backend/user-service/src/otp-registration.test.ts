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

test('POST /api/v1/auth/send-otp: Validates input email', async () => {
  await withUserServer(async (baseUrl) => {
    // 1. Empty email
    const emptyRes = await fetch(`${baseUrl}/api/v1/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '' }),
    });
    assert.equal(emptyRes.status, 400);
    const emptyJson = (await emptyRes.json()) as any;
    assert.equal(emptyJson.success, false);
    assert.match(emptyJson.error, /Email không được để trống/);

    // 2. Invalid format
    const invalidRes = await fetch(`${baseUrl}/api/v1/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' }),
    });
    assert.equal(invalidRes.status, 400);
    const invalidJson = (await invalidRes.json()) as any;
    assert.equal(invalidJson.success, false);
    assert.match(invalidJson.error, /Định dạng email không hợp lệ/);
  });
});

test('POST /api/v1/auth/send-otp: Enforces 60s cooldown and security rate limits (429)', async () => {
  await withUserServer(async (baseUrl) => {
    const rateLimitEmail = 'ratelimit.test@nexus.vn';

    // 1. First send: Must succeed (200 OK)
    const firstRes = await fetch(`${baseUrl}/api/v1/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: rateLimitEmail }),
    });
    assert.equal(firstRes.status, 200);

    // 2. Immediate second send: Must trigger 60s Cooldown (429 Too Many Requests)
    const secondRes = await fetch(`${baseUrl}/api/v1/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: rateLimitEmail }),
    });
    assert.equal(secondRes.status, 429, 'Phải trả về 429 khi spam gửi OTP liên tiếp');
    const secondJson = (await secondRes.json()) as any;
    assert.equal(secondJson.success, false);
    assert.match(secondJson.error, /Vui lòng đợi \d+ giây/);
    assert.ok(secondRes.headers.get('retry-after'), 'Phải có header Retry-After');
  });
});

test('POST /api/v1/auth/send-otp and register: Full OTP lifecycle and security checks', async () => {
  await withUserServer(async (baseUrl) => {
    const testEmail = 'nguyen.test.otp@nexus.vn';
    const testFullName = 'Nguyên Test OTP';
    const testPassword = 'Password123!';

    // 1. Request OTP via POST /api/v1/auth/send-otp
    const sendOtpRes = await fetch(`${baseUrl}/api/v1/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, fullName: testFullName }),
    });
    assert.equal(sendOtpRes.status, 200);
    const sendOtpJson = (await sendOtpRes.json()) as any;
    assert.equal(sendOtpJson.success, true);
    assert.ok(sendOtpJson.devOtp, 'Phải có devOtp trong môi trường test');
    const validOtp = sendOtpJson.devOtp;
    assert.equal(validOtp.length, 6, 'Mã OTP phải có 6 chữ số');

    // 2. Try to bypass OTP: Call /register without OTP field when OTP was issued -> Must fail (400)
    const bypassRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        fullName: testFullName,
        password: testPassword,
      }),
    });
    assert.equal(bypassRes.status, 400, 'Không được phép bỏ qua OTP khi đã yêu cầu gửi OTP');
    const bypassJson = (await bypassRes.json()) as any;
    assert.equal(bypassJson.success, false);
    assert.match(bypassJson.error, /Vui lòng nhập mã xác thực OTP/);

    // 3. Try to register with incorrect OTP -> Must fail (400)
    const wrongOtpRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        fullName: testFullName,
        password: testPassword,
        otp: '000000',
      }),
    });
    assert.equal(wrongOtpRes.status, 400);
    const wrongOtpJson = (await wrongOtpRes.json()) as any;
    assert.equal(wrongOtpJson.success, false);
    assert.match(wrongOtpJson.error, /Mã xác thực OTP không chính xác hoặc đã hết hạn/);

    // 4. Register with correct OTP -> Must succeed (201)
    const successRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        fullName: testFullName,
        password: testPassword,
        otp: validOtp,
      }),
    });
    assert.equal(successRes.status, 201);
    const successJson = (await successRes.json()) as any;
    assert.equal(successJson.success, true);
    assert.equal(successJson.data.email, testEmail);
    assert.equal(successJson.data.fullName, testFullName);
    assert.equal(successJson.data.role, 'BUYER');

    // 5. Replay attack: Try to reuse the same OTP for registration -> Must fail
    const replayRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        fullName: testFullName,
        password: testPassword,
        otp: validOtp,
      }),
    });
    // Email already registered -> 409 Conflict
    assert.equal(replayRes.status, 409);

    // 6. Request OTP on already registered email -> Must fail (409 Conflict)
    const duplicateOtpRes = await fetch(`${baseUrl}/api/v1/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    });
    assert.equal(duplicateOtpRes.status, 409);
    const duplicateOtpJson = (await duplicateOtpRes.json()) as any;
    assert.equal(duplicateOtpJson.success, false);
    assert.match(duplicateOtpJson.error, /đã được đăng ký/);

    // 7. Try to reuse the consumed OTP on a different, new email -> Must fail (400 Bad Request)
    const consumedOtpRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'another.person@nexus.vn',
        fullName: 'Another Person',
        password: testPassword,
        otp: validOtp,
      }),
    });
    assert.equal(consumedOtpRes.status, 400);
    const consumedOtpJson = (await consumedOtpRes.json()) as any;
    assert.equal(consumedOtpJson.success, false);
    assert.match(consumedOtpJson.error, /Mã xác thực OTP không chính xác hoặc đã hết hạn/);

    // 8. Backward compatibility: Registering directly without OTP when no OTP was requested -> 201
    const directRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'direct.buyer@nexus.vn',
        fullName: 'Direct Buyer',
        password: testPassword,
      }),
    });
    assert.equal(directRes.status, 201);
    const directJson = (await directRes.json()) as any;
    assert.equal(directJson.success, true);
    assert.equal(directJson.data.email, 'direct.buyer@nexus.vn');
  });
});
