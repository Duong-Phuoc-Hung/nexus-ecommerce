/**
 * Script kiểm tra tính hợp lệ của tên nhánh Git (Branch Name Verification)
 * Tự động kích hoạt thông qua Husky pre-commit / pre-push hook.
 *
 * Mục tiêu:
 * 1. Chặn tuyệt đối commit/push trực tiếp trên nhánh chính (main, master).
 * 2. Ép buộc tuân thủ danh sách 25 nhánh chuẩn hóa thuộc 4 Sprints của Project Nexus,
 *    hoặc định dạng nhánh mở rộng chuẩn (fix/be-*, fix/fe-*, hotfix/*).
 */

const { execSync } = require('child_process');

// 1. Danh sách 25 nhánh chuẩn của 4 Sprints dự án Nexus E-Commerce
const SPRINT_BRANCHES = {
  'Sprint 1: Hạ tầng & Hợp đồng dùng chung': [
    'chore/devops-docker-environment',
    'feat/shared-contracts-enums',
    'feat/shared-contracts-events',
    'feat/shared-utils-core',
  ],
  'Sprint 2: Dịch vụ dữ liệu nền tảng (Backend)': [
    'feat/be-user-auth-iam',
    'feat/be-user-reputation',
    'feat/be-catalog-management',
    'feat/be-catalog-search-discovery',
    'feat/be-fulfillment-sku-inventory',
    'feat/be-fulfillment-shipping-carriers',
  ],
  'Sprint 3: Mua sắm, Đấu giá & Gateway (Backend)': [
    'feat/be-commerce-cart',
    'feat/be-commerce-checkout-order',
    'feat/be-commerce-stripe-payment',
    'feat/be-auction-lifecycle',
    'feat/be-auction-bidding-redis',
    'feat/be-auction-settlement',
    'feat/be-notification-service',
    'feat/be-api-gateway',
  ],
  'Sprint 4: Giao diện người dùng (Frontend)': [
    'feat/fe-customer-auth-catalog',
    'feat/fe-customer-cart-checkout',
    'feat/fe-customer-auction-live',
    'feat/fe-customer-reputation-seller',
    'feat/fe-admin-rbac-moderation',
    'feat/fe-admin-auction-orders',
    'feat/fe-admin-system-logs',
  ],
};

const ALL_STANDARD_BRANCHES = Object.values(SPRINT_BRANCHES).flat();

// 2. Nhánh bảo vệ cấm commit trực tiếp
const PROTECTED_BRANCHES = ['main', 'master', 'production', 'release'];

// 3. Regex kiểm tra các nhánh hỗ trợ (bugfix, hotfix, refactor) theo quy chuẩn dự án
const ALLOWED_BRANCH_PATTERNS = [
  // Nhánh tính năng hoặc bảo trì chính
  /^(feat|chore)\/(devops|shared|be|fe)-[a-z0-9-]+$/,
  // Nhánh sửa lỗi phát sinh
  /^(fix|hotfix|refactor|test|docs)\/(devops|shared|be|fe)-[a-z0-9-]+$/,
  // Nhánh develop/staging
  /^(develop|staging)$/,
];

function getCurrentBranch() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    return branch;
  } catch {
    return null;
  }
}

function printHelpBanner(currentBranch) {
  console.error('\n' + '='.repeat(80));
  console.error(' [GIT HOOK ERROR] TÊN NHÁNH KHÔNG HỢP LỆ HOẶC CỐ TÌNH COMMIT TRÊN NHÁNH CHÍNH');
  console.error('='.repeat(80));
  console.error(`Nhánh hiện tại của bạn: "${currentBranch}"`);
  console.error('\n QUY TẮC PHÂN NHÁNH CỦA PROJECT NEXUS:');
  console.error('  1. TUYỆT ĐỐI KHÔNG commit trực tiếp trên nhánh: main / master.');
  console.error('  2. Bắt buộc checkout từ main sang 1 trong 25 nhánh chuẩn của Sprint.');
  console.error(
    '  3. Hoặc đặt tên theo mẫu: feat/be-<tên>, feat/fe-<tên>, fix/be-<tên>, hotfix/<tên>\n',
  );

  console.error('DANH SÁCH 25 NHÁNH CHUẨN 4 SPRINTS:');
  for (const [sprintName, branches] of Object.entries(SPRINT_BRANCHES)) {
    console.error(`\n  🔹 ${sprintName}:`);
    for (const b of branches) {
      console.error(`     • ${b}`);
    }
  }

  console.error('\nHƯỚNG DẪN ĐỔI TÊN NHÁNH HIỆN TẠI:');
  console.error(`   git branch -m <tên-nhánh-chuẩn>`);
  console.error('   Ví dụ: git branch -m chore/devops-docker-environment\n');
  console.error('='.repeat(80) + '\n');
}

function verifyBranch() {
  const currentBranch = getCurrentBranch();

  // Bỏ qua kiểm tra trong môi trường detached HEAD (CI/CD checkout commit hash)
  if (!currentBranch || currentBranch === 'HEAD') {
    return;
  }

  // Chặn commit trên main/master
  if (PROTECTED_BRANCHES.includes(currentBranch)) {
    console.error('\n' + '='.repeat(80));
    console.error(
      `[GIT HOOK BLOCKED] KHÔNG ĐƯỢC PHÉP COMMIT TRỰC TIẾP TRÊN NHÁNH "${currentBranch}"!`,
    );
    console.error('='.repeat(80));
    console.error('👉 Vui lòng tạo nhánh tính năng mới theo quy chuẩn:');
    console.error('   git checkout -b <tên-nhánh-chuẩn>');
    console.error('   Ví dụ: git checkout -b chore/devops-docker-environment\n');
    process.exit(1);
  }

  // Kiểm tra nếu nằm trong 25 nhánh chuẩn
  if (ALL_STANDARD_BRANCHES.includes(currentBranch)) {
    return; // Hợp lệ hoàn toàn
  }

  // Kiểm tra nếu khớp với pattern regex mở rộng
  const isPatternMatched = ALLOWED_BRANCH_PATTERNS.some((pattern) => pattern.test(currentBranch));
  if (isPatternMatched) {
    return; // Hợp lệ theo pattern
  }

  // Không hợp lệ
  printHelpBanner(currentBranch);
  process.exit(1);
}

verifyBranch();
