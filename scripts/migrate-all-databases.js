#!/usr/bin/env node

/**
 * =============================================================================
 * Project Nexus - Automated Database Migration & Seeding Script
 * Tự động chạy tất cả các file migration V1..., V2... của 6 Core Services vào Docker
 * Hoạt động đa nền tảng: Windows (cmd, PowerShell), macOS, Linux.
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SERVICES_CONFIG = [
  {
    name: 'user-service',
    container: 'nexus-postgres-user',
    user: 'nexus_user',
    db: 'nexus_user_db',
    dir: path.join(__dirname, '..', 'backend', 'user-service', 'prisma'),
  },
  {
    name: 'catalog-service',
    container: 'nexus-postgres-catalog',
    user: 'nexus_catalog',
    db: 'nexus_catalog_db',
    dir: path.join(__dirname, '..', 'backend', 'catalog-service', 'prisma'),
  },
  {
    name: 'commerce-service',
    container: 'nexus-postgres-commerce',
    user: 'nexus_commerce',
    db: 'nexus_commerce_db',
    dir: path.join(__dirname, '..', 'backend', 'commerce-service', 'prisma'),
  },
  {
    name: 'auction-service',
    container: 'nexus-postgres-auction',
    user: 'nexus_auction',
    db: 'nexus_auction_db',
    dir: path.join(__dirname, '..', 'backend', 'auction-service', 'prisma'),
  },
  {
    name: 'fulfillment-service',
    container: 'nexus-postgres-fulfillment',
    user: 'nexus_fulfillment',
    db: 'nexus_fulfillment_db',
    dir: path.join(__dirname, '..', 'backend', 'fulfillment-service', 'prisma'),
  },
  {
    name: 'notification-service',
    container: 'nexus-postgres-notification',
    user: 'nexus_notification',
    db: 'nexus_notification_db',
    dir: path.join(__dirname, '..', 'backend', 'notification-service', 'prisma'),
  },
];

console.log('\n' + '='.repeat(80));
console.log('🚀 [NEXUS DB MIGRATION] BẮT ĐẦU CHẠY MIGRATION CHO 6 CORE SERVICES');
console.log('='.repeat(80) + '\n');

// 1. Kiểm tra Docker đang chạy
try {
  execSync('docker ps', { stdio: 'ignore' });
} catch {
  console.error('❌ [ERROR] Docker chưa được bật hoặc không tìm thấy lệnh docker!');
  console.error('👉 Vui lòng mở Docker Desktop và chạy lệnh: pnpm docker:dev:up trước.\n');
  process.exit(1);
}

let totalSuccess = 0;
let totalFailed = 0;

for (const svc of SERVICES_CONFIG) {
  console.log(`📦 Đang xử lý: [${svc.name}] -> Container: [${svc.container}]`);

  // Kiểm tra thư mục prisma có tồn tại không
  if (!fs.existsSync(svc.dir)) {
    console.log(`   ⚠️ Thư mục ${svc.dir} không tồn tại. Bỏ qua.\n`);
    continue;
  }

  // Lấy tất cả các file SQL migration có tiền tố V (VD: V1__..., V2__...)
  const sqlFiles = fs
    .readdirSync(svc.dir)
    .filter((f) => f.startsWith('V') && f.endsWith('.sql'))
    .sort(); // Sắp xếp theo thứ tự version tăng dần V1, V2...

  if (sqlFiles.length === 0) {
    console.log(`   ℹ️ Không có file migration .sql nào.\n`);
    continue;
  }

  for (const file of sqlFiles) {
    const filePath = path.join(svc.dir, file);
    try {
      // Đọc nội dung file SQL và pipe vào lệnh psql trong Docker container
      const sqlContent = fs.readFileSync(filePath, 'utf-8');
      execSync(`docker exec -i ${svc.container} psql -U ${svc.user} -d ${svc.db}`, {
        input: sqlContent,
        stdio: ['pipe', 'ignore', 'pipe'],
      });
      console.log(`   ✅ Thành công: ${file}`);
      totalSuccess++;
    } catch (err) {
      console.error(`   ❌ Thất bại: ${file}`);
      if (err.stderr) {
        console.error(`      Lỗi: ${err.stderr.toString().trim()}`);
      }
      totalFailed++;
    }
  }
  console.log('');
}

console.log('='.repeat(80));
if (totalFailed === 0) {
  console.log(`🎉 [HOÀN TẤT] Toàn bộ migration thành công! (${totalSuccess} files đã chạy)`);
} else {
  console.log(`⚠️ [CẢNH BÁO] Có lỗi xảy ra: ${totalSuccess} thành công, ${totalFailed} thất bại.`);
}
console.log('='.repeat(80) + '\n');
