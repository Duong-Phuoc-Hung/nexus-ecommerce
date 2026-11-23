import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { PostgresUserRepository } from './infrastructure/repositories/PostgresUserRepository';

test('PostgreSQL User Service Persistence Test Suite (Real Database Port 5432)', async (t) => {
  const pool = new Pool({
    host: '127.0.0.1',
    port: 5432,
    user: process.env.USER_DB_USER || 'nexus_user',
    password: process.env.USER_DB_PASSWORD || 'nexus_password',
    database: process.env.USER_DB_NAME || 'nexus_user_db',
    connectionTimeoutMillis: 3000,
  });

  try {
    await pool.query('SELECT 1');
  } catch {
    t.skip('Bỏ qua test do PostgreSQL user-service (Port 5432) chưa sẵn sàng');
    return;
  }

  const userRepo = new PostgresUserRepository(pool);

  t.after(async () => {
    await pool.end();
  });

  await t.test(
    '1. PostgresUserRepository: Đọc hồ sơ đầy đủ CCCD, Giới tính, Ngày sinh, Địa chỉ từ CSDL thật',
    async () => {
      const buyerId = '01a15822-43b8-78c3-a246-16bff78bc6e8';
      const user = await userRepo.findById(buyerId);

      assert.ok(user !== null, 'Buyer should exist in user_users');
      assert.equal(user.email, 'buyer@gmail.com');
      assert.equal(user.fullName, 'Nguyễn Văn Buyer');
      assert.equal(user.identifyNumber, '001099000004');
      assert.equal(user.gender, 'MALE');
      assert.ok(user.dateOfBirth !== null);
      assert.equal(user.address, '123 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh');
    },
  );

  await t.test(
    '2. PostgresUserRepository: Đọc danh sách đánh giá cộng đồng trực tiếp từ bảng user_ratings',
    async () => {
      const sellerId = '01a15822-3fd0-7b39-ad01-f11da72d5b80';
      const reviews = await userRepo.getUserReviews!(sellerId);

      assert.ok(reviews.length >= 2, `Expected at least 2 reviews in DB, got ${reviews.length}`);
      const first = reviews[0];
      assert.equal(first.toUserId, sellerId);
      assert.ok(first.rating >= 1 && first.rating <= 5);
      assert.ok(first.comment && first.comment.length > 0);
    },
  );

  await t.test(
    '3. PostgresUserRepository: Cập nhật điểm uy tín và lưu phạt vào bảng user_reputations & user_penalties',
    async () => {
      const sellerId = '01a15822-3fd0-7b39-ad01-f11da72d5b80';
      const seller = await userRepo.findById(sellerId);
      assert.ok(seller !== null);

      const oldScore = seller.reputationScore;
      seller.adjustReputation(-10, 'Vi phạm thời gian đóng gói hàng hóa quá 48h', 'usr_staff_001');

      await userRepo.update(seller);

      // Truy vấn lại từ PostgreSQL để chứng minh dữ liệu đã ghi xuống ổ đĩa/container
      const reloaded = await userRepo.findById(sellerId);
      assert.ok(reloaded !== null);
      assert.equal(reloaded.reputationScore, oldScore - 10);
      assert.ok(reloaded.reputationHistory.length >= 1);
      const latestPenalty = reloaded.reputationHistory[0];
      assert.equal(latestPenalty.points, -10);
      assert.equal(latestPenalty.reason, 'Vi phạm thời gian đóng gói hàng hóa quá 48h');
    },
  );
});
