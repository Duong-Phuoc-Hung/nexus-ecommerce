/**
 * ==============================================================================
 * Project Nexus - Architecture Boundary & ArchUnit Test Suite
 * ==============================================================================
 *
 * MỤC TIÊU KIẾN TRÚC:
 * 1. Tự động kiểm tra ranh giới Modular Monolith để ngăn chặn việc phá vỡ
 *    ownership giữa các Bounded Context trong thư mục `backend/`.
 * 2. CẤM TUYỆT ĐỐI việc một Bounded Context import trực tiếp Entity, Repository,
 *    Use-Case hoặc cấu trúc nội bộ của một Bounded Context khác.
 * 3. Cho phép giao tiếp liên context độc quyền thông qua:
 *    - Hợp đồng dùng chung: `@nexus/contracts`, `@nexus/events`, `@nexus/utils`, `@nexus/shared`
 *    - Giao tiếp mạng: HTTP REST / API Gateway / Internal Service URLs
 *    - Bắn và nhận sự kiện bất đồng bộ: RabbitMQ Domain Events
 * 4. Tự động mở rộng (Dynamic Extensibility): Bất kỳ package / service mới nào
 *    được tạo trong `backend/` đều được tự động áp dụng toàn bộ rule mà không
 *    cần cấu hình lại test.
 * 5. Tuân thủ mô hình 4 tầng Domain-Driven Design (Clean / Onion Architecture):
 *    - Domain Layer là thuần túy (Pure Domain), không phụ thuộc vào Application,
 *      Infrastructure, hay Interfaces.
 * ==============================================================================
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// ==============================================================================
// 1. ENGINE PHÂN TÍCH VÀ KIỂM TRA RANH GIỚI KIẾN TRÚC (ARCHUNIT ENGINE)
// ==============================================================================

class ArchitectureValidator {
  /**
   * @param {string} rootDir Thư mục gốc của repository
   */
  constructor(rootDir = path.resolve(__dirname, '..')) {
    this.rootDir = rootDir;
    this.backendDir = path.join(this.rootDir, 'backend');
    this.sharedDir = path.join(this.rootDir, 'shared');
  }

  /**
   * Quét động toàn bộ các Bounded Contexts trong backend/
   * @returns {string[]} Danh sách tên các service (ví dụ: ['api-gateway', 'user-service', ...])
   */
  discoverBoundedContexts() {
    if (!fs.existsSync(this.backendDir)) {
      return [];
    }

    return fs
      .readdirSync(this.backendDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
      .filter((entry) => {
        // Một service hợp lệ phải có package.json hoặc thư mục src/
        const servicePath = path.join(this.backendDir, entry.name);
        return (
          fs.existsSync(path.join(servicePath, 'package.json')) ||
          fs.existsSync(path.join(servicePath, 'src'))
        );
      })
      .map((entry) => entry.name)
      .sort();
  }

  /**
   * Lấy toàn bộ các file TypeScript source code (.ts) của một Bounded Context
   * Bỏ qua file .d.ts, .test.ts, và các thư mục build / cache.
   * @param {string} serviceName
   * @returns {string[]} Danh sách đường dẫn file tuyệt đối
   */
  getServiceSourceFiles(serviceName) {
    const srcDir = path.join(this.backendDir, serviceName, 'src');
    if (!fs.existsSync(srcDir)) {
      return [];
    }

    const files = [];
    const scan = (currentDir) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          if (
            entry.name !== 'node_modules' &&
            entry.name !== 'dist' &&
            entry.name !== '.turbo' &&
            !entry.name.startsWith('.')
          ) {
            scan(fullPath);
          }
        } else if (
          entry.isFile() &&
          entry.name.endsWith('.ts') &&
          !entry.name.endsWith('.d.ts') &&
          !entry.name.endsWith('.test.ts') &&
          !entry.name.endsWith('.spec.ts')
        ) {
          files.push(fullPath);
        }
      }
    };

    scan(srcDir);
    return files;
  }

  /**
   * Loại bỏ comments (dòng đơn // và khối /* ... *\/) để tránh false positives
   * @param {string} sourceCode
   * @returns {string}
   */
  stripComments(sourceCode) {
    return sourceCode
      .replace(/\/\*[\s\S]*?\*\//g, (match) => ' '.repeat(match.length))
      .replace(/\/\/.*/g, (match) => ' '.repeat(match.length));
  }

  /**
   * Trích xuất toàn bộ các import/export/require statements từ source code
   * @param {string} sourceCode
   * @returns {Array<{ importPath: string, line: number, raw: string }>}
   */
  extractImports(sourceCode) {
    const cleanCode = this.stripComments(sourceCode);
    const lines = cleanCode.split('\n');
    const imports = [];

    // Regex bắt:
    // 1. import ... from 'path'
    // 2. import 'path'
    // 3. export ... from 'path'
    // 4. require('path')
    // 5. import('path')
    const importPatterns = [
      /(?:import|export)\s+(?:[\w*\s{},]*\s+from\s+)?['"]([^'"]+)['"]/g,
      /(?:require|import)\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    ];

    lines.forEach((lineText, index) => {
      for (const regex of importPatterns) {
        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(lineText)) !== null) {
          imports.push({
            importPath: match[1],
            line: index + 1,
            raw: match[0],
          });
        }
      }
    });

    return imports;
  }

  /**
   * Phân tích và kiểm tra tính hợp lệ của một file source code
   * @param {string} filePath Đường dẫn tuyệt đối của file đang xét
   * @param {string} currentService Tên của Bounded Context sở hữu file đó
   * @param {string[]} allServices Danh sách tất cả Bounded Contexts
   * @param {string} [customContent] Nội dung tùy biến (dùng cho mutation/negative test)
   * @returns {Array<{ file: string, line: number, rule: string, reason: string, importPath: string }>}
   */
  validateFile(filePath, currentService, allServices, customContent) {
    const content = customContent !== undefined ? customContent : fs.readFileSync(filePath, 'utf8');
    const imports = this.extractImports(content);
    const violations = [];
    const fileDir = path.dirname(filePath);

    // Xác định tầng DDD của file hiện tại (nếu thuộc kiến trúc 4 tầng)
    const normalizedPath = filePath.replace(/\\/g, '/');
    const isDomain = normalizedPath.includes('/domain/');
    const isDomainEntity = normalizedPath.includes('/domain/entities/');
    const isApplication = normalizedPath.includes('/application/');
    const isInterface = normalizedPath.includes('/interfaces/');

    for (const item of imports) {
      const imp = item.importPath;

      // ========================================================================
      // QUY TẮC 1: CẤM IMPORT CHÉO LIÊN BOUNDED CONTEXT (CROSS-CONTEXT ISOLATION)
      // ========================================================================
      // Kiểm tra nếu import dùng đường dẫn tương đối (relative) trỏ ra ngoài context hiện tại
      if (imp.startsWith('.')) {
        try {
          const resolvedPath = path.resolve(fileDir, imp).replace(/\\/g, '/');
          const backendNormalized = this.backendDir.replace(/\\/g, '/');

          // Nếu import trỏ vào thư mục backend/
          if (resolvedPath.startsWith(backendNormalized)) {
            // Cắt chuỗi để lấy context mục tiêu: backend/<targetService>/...
            const relativeToBackend = resolvedPath.substring(backendNormalized.length + 1);
            const targetService = relativeToBackend.split('/')[0];

            if (
              targetService &&
              targetService !== currentService &&
              allServices.includes(targetService)
            ) {
              violations.push({
                file: filePath,
                line: item.line,
                importPath: imp,
                rule: 'RULE_1_FORBID_CROSS_CONTEXT_INTERNAL_IMPORT',
                reason: `Bounded Context '${currentService}' KHÔNG ĐƯỢC PHÉP import nội bộ từ '${targetService}'. Ranh giới nghiệp vụ bị phá vỡ!`,
              });
              continue;
            }
          }
        } catch {
          // Bỏ qua lỗi resolve
        }
      }

      // Kiểm tra nếu import trực tiếp bằng alias hoặc package path trỏ tới service khác
      for (const otherService of allServices) {
        if (otherService !== currentService) {
          if (
            imp.startsWith(`@nexus/${otherService}`) ||
            imp.startsWith(`backend/${otherService}`) ||
            imp.includes(`/${otherService}/src/`)
          ) {
            violations.push({
              file: filePath,
              line: item.line,
              importPath: imp,
              rule: 'RULE_1_FORBID_CROSS_CONTEXT_INTERNAL_IMPORT',
              reason: `Phát hiện import trái phép sang Bounded Context '${otherService}'. Chỉ cho phép giao tiếp qua @nexus/shared, @nexus/contracts, @nexus/events hoặc HTTP API!`,
            });
          }
        }
      }

      // ========================================================================
      // QUY TẮC 2: QUY TẮC PHỤ THUỘC TẦNG DDD NỘI BỘ (CLEAN / ONION ARCHITECTURE)
      // ========================================================================
      if (imp.startsWith('.')) {
        const resolvedPath = path.resolve(fileDir, imp).replace(/\\/g, '/');

        // 2.1. Domain Layer phải thuần túy: Không được import Application, Infrastructure hay Interfaces
        if (isDomain) {
          if (resolvedPath.includes('/src/application/')) {
            violations.push({
              file: filePath,
              line: item.line,
              importPath: imp,
              rule: 'RULE_2_DOMAIN_LAYER_PURITY',
              reason: `Tầng Domain không được phép phụ thuộc vào tầng Application ('${imp}'). Vi phạm nguyên tắc Dependency Inversion!`,
            });
          }
          if (resolvedPath.includes('/src/infrastructure/')) {
            violations.push({
              file: filePath,
              line: item.line,
              importPath: imp,
              rule: 'RULE_2_DOMAIN_LAYER_PURITY',
              reason: `Tầng Domain không được phép phụ thuộc vào tầng Infrastructure ('${imp}'). Domain phải độc lập với database và framework!`,
            });
          }
          if (resolvedPath.includes('/src/interfaces/')) {
            violations.push({
              file: filePath,
              line: item.line,
              importPath: imp,
              rule: 'RULE_2_DOMAIN_LAYER_PURITY',
              reason: `Tầng Domain không được phép phụ thuộc vào tầng Interfaces / Presentation ('${imp}').`,
            });
          }
        }

        // 2.2. Domain Entities không được import ORM database framework (Prisma / Mongoose)
        if (isDomainEntity && (imp.includes('prisma') || imp.includes('database'))) {
          violations.push({
            file: filePath,
            line: item.line,
            importPath: imp,
            rule: 'RULE_2_DOMAIN_ENTITY_ISOLATION',
            reason: `Domain Entity không được phụ thuộc trực tiếp vào database driver/ORM ('${imp}').`,
          });
        }

        // 2.3. Application Layer không được phụ thuộc vào Infrastructure hay Interfaces
        if (isApplication) {
          if (resolvedPath.includes('/src/interfaces/')) {
            violations.push({
              file: filePath,
              line: item.line,
              importPath: imp,
              rule: 'RULE_2_APPLICATION_LAYER_INDEPENDENCE',
              reason: `Tầng Application không được phép phụ thuộc vào tầng Interfaces / HTTP controllers ('${imp}').`,
            });
          }
        }
      }
    }

    return violations;
  }

  /**
   * Quét và kiểm tra toàn bộ codebase
   * @returns {{ totalFiles: number, violations: Array<any> }}
   */
  validateAll() {
    const services = this.discoverBoundedContexts();
    const allViolations = [];
    let totalFiles = 0;

    for (const service of services) {
      const files = this.getServiceSourceFiles(service);
      totalFiles += files.length;

      for (const file of files) {
        const fileViolations = this.validateFile(file, service, services);
        if (fileViolations.length > 0) {
          allViolations.push(...fileViolations);
        }
      }
    }

    return {
      totalFiles,
      services,
      violations: allViolations,
    };
  }
}

// Export ArchitectureValidator để có thể tái sử dụng làm standalone tool
module.exports = { ArchitectureValidator };

// ==============================================================================
// 2. BỘ TEST KIẾN TRÚC TỰ ĐỘNG (ARCHUNIT TESTS)
// ==============================================================================

describe('🏗️ [ArchUnit] Kiểm Tra Ranh Giới Kiến Trúc Modular Monolith & Bounded Contexts', () => {
  const validator = new ArchitectureValidator();

  // ----------------------------------------------------------------------------
  // SUITE 1: TỰ ĐỘNG KHÁM PHÁ PACKAGE VÀ ĐẶT RULE CHO BẬC CONTEXT MỚI
  // ----------------------------------------------------------------------------
  describe('1. Dynamic Bounded Context Discovery & Rule Setup', () => {
    it('phải tự động phát hiện tất cả 7 Core Services trong backend/', () => {
      const contexts = validator.discoverBoundedContexts();

      // Kiểm tra danh sách core services hiện tại
      const expectedCoreServices = [
        'api-gateway',
        'auction-service',
        'catalog-service',
        'commerce-service',
        'fulfillment-service',
        'notification-service',
        'user-service',
      ];

      for (const expected of expectedCoreServices) {
        assert.ok(
          contexts.includes(expected),
          `Hệ thống phải tự động nhận diện bounded context: ${expected}`,
        );
      }
      assert.ok(contexts.length >= 7, 'Phải phát hiện ít nhất 7 core services');
    });

    it('tự động áp dụng luật ranh giới khi có package / bounded context mới được tạo', () => {
      const existingServices = validator.discoverBoundedContexts();
      const mockNewServices = [...existingServices, 'payment-service'];

      // Giả lập package mới 'payment-service' cố ý import nội bộ user-service
      const mockFilePath = path.join(validator.backendDir, 'payment-service', 'src', 'app.ts');
      const maliciousCode = `
        import { User } from '../../user-service/src/domain/entities/User';
        export class PaymentApp {}
      `;

      const violations = validator.validateFile(
        mockFilePath,
        'payment-service',
        mockNewServices,
        maliciousCode,
      );

      assert.strictEqual(
        violations.length,
        1,
        'Package mới phải tự động bị chặn nếu import chéo context khác',
      );
      assert.strictEqual(violations[0].rule, 'RULE_1_FORBID_CROSS_CONTEXT_INTERNAL_IMPORT');
      assert.match(violations[0].reason, /payment-service.*user-service/);
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 2: XÁC MINH CẤU TRÚC HIỆN TẠI TUÂN THỦ 100% (PASS RULE)
  // ----------------------------------------------------------------------------
  describe('2. Current Codebase Architecture Compliance', () => {
    const result = validator.validateAll();

    it(`toàn bộ ${result.totalFiles} files TypeScript hiện tại phải TUÂN THỦ 100% ranh giới kiến trúc (0 vi phạm)`, () => {
      if (result.violations.length > 0) {
        console.error('\n❌ DANH SÁCH CÁC VI PHẠM RANH GIỚI KIẾN TRÚC PHÁT HIỆN:');
        result.violations.forEach((v, idx) => {
          console.error(
            `  ${idx + 1}. [${v.rule}] File: ${v.file}:${v.line}\n     Import: "${v.importPath}"\n     Lý do: ${v.reason}\n`,
          );
        });
      }

      assert.strictEqual(
        result.violations.length,
        0,
        `Mã nguồn hiện tại có ${result.violations.length} lỗi vi phạm ranh giới kiến trúc!`,
      );
    });

    it('cho phép giao tiếp qua public contracts (@nexus/contracts, @nexus/events, @nexus/shared, @nexus/utils)', () => {
      const testFile = path.join(
        validator.backendDir,
        'user-service',
        'src',
        'interfaces',
        'http',
        'controllers',
        'UserController.ts',
      );

      // Giả lập import các thư viện dùng chung được phép
      const validCode = `
        import { Request, Response } from 'express';
        import { UserRole } from '@nexus/contracts';
        import { UserRegisteredEvent } from '@nexus/events';
        import { formatSuccessResponse } from '@nexus/utils';
        import { setupBigIntSerialization } from '@nexus/shared';
        import { GetUserProfileUseCase } from '../../../application/use-cases/GetUserProfileUseCase';
      `;

      const violations = validator.validateFile(
        testFile,
        'user-service',
        validator.discoverBoundedContexts(),
        validCode,
      );

      assert.strictEqual(
        violations.length,
        0,
        'Các import thuộc @nexus/contracts, events, shared, utils phải được phép hợp lệ',
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 3: NEGATIVE MUTATION TESTING - CHỨNG MINH TEST BÁO FAIL KHI IMPORT CHÉO
  // ----------------------------------------------------------------------------
  describe('3. Negative Mutation Testing (Chứng minh rào chắn bắt lỗi chính xác)', () => {
    const allServices = validator.discoverBoundedContexts();

    it('phải BÁO LỖI (FAIL) ngay lập tức khi service A import Entity của service B', () => {
      const sourceFile = path.join(
        validator.backendDir,
        'user-service',
        'src',
        'application',
        'use-cases',
        'TestCrossImportUseCase.ts',
      );

      // Cố ý import trái phép Entity của Commerce Service từ User Service
      const crossImportEntityCode = `
        import { Order } from '../../../../commerce-service/src/domain/entities/Order';

        export class TestCrossImportUseCase {
          execute(order: Order) { return order.id; }
        }
      `;

      const violations = validator.validateFile(
        sourceFile,
        'user-service',
        allServices,
        crossImportEntityCode,
      );

      assert.ok(violations.length >= 1, 'Bắt buộc phải phát hiện lỗi import chéo Entity');
      assert.strictEqual(violations[0].rule, 'RULE_1_FORBID_CROSS_CONTEXT_INTERNAL_IMPORT');
      assert.strictEqual(violations[0].line, 2);
      assert.match(violations[0].reason, /commerce-service/);
    });

    it('phải BÁO LỖI (FAIL) khi service A import Repository của service B', () => {
      const sourceFile = path.join(
        validator.backendDir,
        'catalog-service',
        'src',
        'infrastructure',
        'repositories',
        'CatalogServiceRepo.ts',
      );

      // Cố ý import trái phép Repository của User Service
      const crossImportRepoCode = `
        import { IUserRepository } from '../../../../user-service/src/domain/repositories/IUserRepository';

        export class CatalogServiceRepo {
          constructor(private userRepo: IUserRepository) {}
        }
      `;

      const violations = validator.validateFile(
        sourceFile,
        'catalog-service',
        allServices,
        crossImportRepoCode,
      );

      assert.ok(violations.length >= 1, 'Bắt buộc phải phát hiện lỗi import chéo Repository');
      assert.strictEqual(violations[0].rule, 'RULE_1_FORBID_CROSS_CONTEXT_INTERNAL_IMPORT');
      assert.match(violations[0].reason, /user-service/);
    });

    it('phải BÁO LỖI (FAIL) khi service A import trực tiếp Prisma/Database của service B', () => {
      const sourceFile = path.join(
        validator.backendDir,
        'auction-service',
        'src',
        'infrastructure',
        'bidding',
        'BidHandler.ts',
      );

      const crossDbCode = `
        import { PrismaClient } from '../../../../fulfillment-service/src/infrastructure/database/PrismaClient';
      `;

      const violations = validator.validateFile(
        sourceFile,
        'auction-service',
        allServices,
        crossDbCode,
      );

      assert.ok(violations.length >= 1, 'Bắt buộc phải chặn truy cập DB của service khác');
      assert.strictEqual(violations[0].rule, 'RULE_1_FORBID_CROSS_CONTEXT_INTERNAL_IMPORT');
      assert.match(violations[0].reason, /fulfillment-service/);
    });

    it('phải BÁO LỖI (FAIL) khi tầng Domain nội bộ bị ô nhiễm bởi Infrastructure (DDD Purity)', () => {
      const domainEntityFile = path.join(
        validator.backendDir,
        'user-service',
        'src',
        'domain',
        'entities',
        'User.ts',
      );

      // Cố ý đưa dependency hạ tầng vào Entity nghiệp vụ cốt lõi
      const dirtyDomainCode = `
        import { PrismaClient } from '../../infrastructure/database/PrismaClient';

        export class User {
          saveDirectlyToDb() { const p = new PrismaClient(); }
        }
      `;

      const violations = validator.validateFile(
        domainEntityFile,
        'user-service',
        allServices,
        dirtyDomainCode,
      );

      assert.ok(
        violations.some((v) => v.rule === 'RULE_2_DOMAIN_LAYER_PURITY'),
        'Domain layer phải thuần túy, không được import Infrastructure',
      );
    });
  });
});
