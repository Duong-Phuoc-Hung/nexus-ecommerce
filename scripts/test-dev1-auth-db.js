#!/usr/bin/env node

/**
 * ==============================================================================
 * Project Nexus - DEV 1 Test Script: Database Integration & Role Verification
 * Kiểm tra kết nối từ code Backend vào PostgreSQL thật trong Docker (cổng 5432)
 * Kiểm tra tìm kiếm tài khoản theo Email, lấy đúng Role (ADMIN, SELLER, BUYER)
 * và xác thực mật khẩu BCrypt (123456).
 * ==============================================================================
 */

const path = require('path');
const bcrypt = require('../backend/user-service/node_modules/bcryptjs');
const {
  PostgresUserRepository,
} = require('../backend/user-service/dist/infrastructure/repositories/PostgresUserRepository');

async function runDev1Verification() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 [DEV 1 TEST] KIỂM TRA TÍCH HỢP POSTGRESQL & XÁC THỰC ROLE (RBAC)');
  console.log('='.repeat(70) + '\n');

  const userRepo = new PostgresUserRepository();

  const testAccounts = [
    { email: 'admin@gmail.com', expectedRole: 'ADMIN', testPassword: '123456' },
    { email: 'seller@gmail.com', expectedRole: 'SELLER', testPassword: '123456' },
    { email: 'buyer@gmail.com', expectedRole: 'BUYER', testPassword: '123456' },
    { email: 'admin@nexus.internal', expectedRole: 'ADMIN', testPassword: '123456' },
  ];

  let passedCount = 0;

  for (const acc of testAccounts) {
    console.log(`🔍 Đang truy vấn từ Database: [${acc.email}]...`);
    try {
      const user = await userRepo.findByEmail(acc.email);

      if (!user) {
        console.error(`   ❌ THẤT BẠI: Không tìm thấy user với email ${acc.email} trong DB!`);
        continue;
      }

      console.log(`   ✅ TÌM THẤY USER THÀNH CÔNG!`);
      console.log(`      • ID Database    : ${user.id}`);
      console.log(`      • Tên hiển thị   : ${user.fullName}`);
      console.log(`      • Email          : ${user.email}`);
      console.log(
        `      • Vai trò (Role) : ${user.role} ${user.role === acc.expectedRole ? '✅ (Khớp đúng kỳ vọng)' : '❌ (Sai Role!)'}`,
      );
      console.log(`      • Điểm uy tín    : ${user.reputationScore} điểm`);
      console.log(`      • Trạng thái     : ${user.status}`);

      // Kiểm tra mật khẩu bằng BCrypt
      const isPasswordMatch = bcrypt.compareSync(acc.testPassword, user.passwordHash);
      if (isPasswordMatch) {
        console.log(
          `      • Mật khẩu test  : "${acc.testPassword}" ➔ ✅ KHỚP 100% VỚI PASSWORD_HASH TRONG DB!`,
        );
        passedCount++;
      } else {
        console.error(`      • Mật khẩu test  : "${acc.testPassword}" ➔ ❌ KHÔNG KHỚP MẬT KHẨU!`);
      }
      console.log('-'.repeat(70));
    } catch (err) {
      console.error(`   ❌ LỖI KẾT NỐI DB: ${err.message}`);
    }
  }

  await userRepo.close();

  console.log('\n' + '='.repeat(70));
  if (passedCount === testAccounts.length) {
    console.log(
      `🎉 [KẾT QUẢ DEV 1]: HOÀN HẢO! ${passedCount}/${testAccounts.length} TÀI KHOẢN ĐỀU QUERY THÀNH CÔNG TỪ POSTGRESQL!`,
    );
    console.log(
      `👉 ĐÃ SẴN SÀNG CUNG CẤP HÀM NÀY CHO DEV 2 (AUTH SERVICE) VÀ DEV 3 (API CONTROLLER) SỬ DỤNG!`,
    );
  } else {
    console.log(`⚠️ Có ${testAccounts.length - passedCount} tài khoản chưa đạt.`);
  }
  console.log('='.repeat(70) + '\n');
}

runDev1Verification();
