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

function waitForPostgres(container, user, db, maxRetries = 25) {
  process.stdout.write(`   ⏳ Chờ container [${container}] sẵn sàng tiếp nhận kết nối... `);
  for (let i = 0; i < maxRetries; i++) {
    try {
      execSync(`docker exec ${container} pg_isready -U ${user} -d ${db}`, { stdio: 'ignore' });
      process.stdout.write('Sẵn sàng! ✅\n');
      return true;
    } catch {
      const end = Date.now() + 1000;
      while (Date.now() < end) {}
    }
  }
  process.stdout.write('Timeout! ❌\n');
  return false;
}

for (const svc of SERVICES_CONFIG) {
  console.log(`📦 Đang xử lý: [${svc.name}] -> Container: [${svc.container}]`);

  // Kiểm tra thư mục prisma có tồn tại không
  if (!fs.existsSync(svc.dir)) {
    console.log(`   ⚠️ Thư mục ${svc.dir} không tồn tại. Bỏ qua.\n`);
    continue;
  }

  // Chờ PostgreSQL container hoàn tất khởi động và sẵn sàng nhận kết nối
  const isReady = waitForPostgres(svc.container, svc.user, svc.db);
  if (!isReady) {
    console.error(`   ❌ [ERROR] Container ${svc.container} chưa sẵn sàng sau 25s. Bỏ qua.\n`);
    totalFailed++;
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
      // Đọc nội dung file SQL và pipe vào lệnh psql trong Docker container (ép chuẩn UTF-8 chống lỗi font Windows)
      const sqlContent = fs.readFileSync(filePath, 'utf-8');
      execSync(
        `docker exec -i -e PGCLIENTENCODING=UTF8 ${svc.container} psql -U ${svc.user} -d ${svc.db}`,
        {
          input: Buffer.from(`SET client_encoding = 'UTF8';\n${sqlContent}`, 'utf-8'),
          stdio: ['pipe', 'ignore', 'pipe'],
        },
      );
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
