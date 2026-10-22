/**
 * ==============================================================================
 * Project Nexus - Test Suite cho DEV 2 (Application Layer Authentication)
 * Kiểm tra toàn diện LoginUseCase, RegisterUseCase, BcryptPasswordHasher, JwtTokenService
 * ==============================================================================
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// Import từ compiled JavaScript trong dist/ để kiểm tra chính xác bundle runtime
const DIST_DIR = path.resolve(__dirname, '../backend/user-service/dist');

const { InMemoryUserRepository } = require(
  path.join(DIST_DIR, 'infrastructure/repositories/InMemoryUserRepository.js'),
);
const { BcryptPasswordHasher } = require(
  path.join(DIST_DIR, 'infrastructure/security/BcryptPasswordHasher.js'),
);
const { JwtTokenService } = require(
  path.join(DIST_DIR, 'infrastructure/security/JwtTokenService.js'),
);
const { LoginUseCase } = require(path.join(DIST_DIR, 'application/use-cases/LoginUseCase.js'));
const { RegisterUseCase } = require(
  path.join(DIST_DIR, 'application/use-cases/RegisterUseCase.js'),
);
const { User, UserRole, UserStatus } = require(path.join(DIST_DIR, 'domain/entities/User.js'));
const { InvalidCredentialsException } = require(
  path.join(DIST_DIR, 'domain/exceptions/InvalidCredentialsException.js'),
);
const { AccountSuspendedException } = require(
  path.join(DIST_DIR, 'domain/exceptions/AccountSuspendedException.js'),
);
const { UserAlreadyExistsException } = require(
  path.join(DIST_DIR, 'domain/exceptions/UserAlreadyExistsException.js'),
);

describe('🔒 [DEV 2: Application Layer] Authentication & Token Services', () => {
  let userRepository;
  let passwordHasher;
  let tokenService;
  let loginUseCase;
  let registerUseCase;

  beforeEach(async () => {
    userRepository = new InMemoryUserRepository();
    passwordHasher = new BcryptPasswordHasher(10);
    tokenService = new JwtTokenService(
      'test_access_secret_key_nexus_at_least_32_characters_long',
      'test_refresh_secret_key_nexus_at_least_32_characters_long',
      '15m',
      '7d',
    );
    loginUseCase = new LoginUseCase(userRepository, passwordHasher, tokenService);
    registerUseCase = new RegisterUseCase(userRepository, passwordHasher);
  });

  describe('1. BcryptPasswordHasher (Mã hóa & So khớp mật khẩu)', () => {
    it('phải băm mật khẩu thành công và so khớp chính xác', async () => {
      const rawPassword = 'Password@123';
      const hash = await passwordHasher.hash(rawPassword);

      assert.ok(hash && typeof hash === 'string', 'Mã băm phải là một chuỗi');
      assert.ok(hash.startsWith('$2'), 'Mã băm phải đúng định dạng bcrypt');

      const isMatch = await passwordHasher.compare(rawPassword, hash);
      assert.strictEqual(isMatch, true, 'Mật khẩu đúng phải so khớp thành công');

      const isWrongMatch = await passwordHasher.compare('WrongPassword', hash);
      assert.strictEqual(isWrongMatch, false, 'Mật khẩu sai phải trả về false');
    });

    it('phải trả về false khi truyền chuỗi rỗng', async () => {
      const isMatch = await passwordHasher.compare('', '');
      assert.strictEqual(isMatch, false);
    });
  });

  describe('2. JwtTokenService (Sinh & Xác thực Token)', () => {
    it('phải sinh cặp Access Token và Refresh Token hợp lệ', () => {
      const payload = {
        userId: 'usr_test_123',
        email: 'test@nexus.com',
        roles: ['BUYER'],
        privileges: ['AUTH.LOGIN', 'PRODUCT.VIEW'],
      };

      const tokens = tokenService.generateTokens(payload);
      assert.ok(tokens.accessToken, 'Access Token không được rỗng');
      assert.ok(tokens.refreshToken, 'Refresh Token không được rỗng');
      assert.strictEqual(tokens.expiresIn, 900, 'Thời gian hiệu lực phải là 900 giây (15m)');

      const decoded = tokenService.verifyAccessToken(tokens.accessToken);
      assert.strictEqual(decoded.userId, payload.userId);
      assert.strictEqual(decoded.email, payload.email);
      assert.deepStrictEqual(decoded.roles, payload.roles);
    });

    it('phải báo lỗi khi xác thực token giả mạo', () => {
      assert.throws(() => {
        tokenService.verifyAccessToken('invalid.token.string');
      }, /không hợp lệ/);
    });
  });

  describe('3. RegisterUseCase (Đăng ký tài khoản)', () => {
    it('phải đăng ký tài khoản mới thành công và lưu mật khẩu đã băm', async () => {
      const registerDto = {
        email: 'newuser@nexus.com',
        password: 'SecurePassword123',
        fullName: 'Le Van Test',
        role: UserRole.BUYER,
      };

      const result = await registerUseCase.execute(registerDto);
      assert.ok(result.id, 'Phải sinh ID cho user mới');
      assert.strictEqual(result.email, 'newuser@nexus.com');
      assert.strictEqual(result.status, 'ACTIVE');

      const savedUser = await userRepository.findByEmail('newuser@nexus.com');
      assert.ok(savedUser, 'User phải được lưu trong repository');
      assert.notStrictEqual(
        savedUser.passwordHash,
        'SecurePassword123',
        'Mật khẩu lưu trong DB phải được băm',
      );

      const isPasswordValid = await passwordHasher.compare(
        'SecurePassword123',
        savedUser.passwordHash,
      );
      assert.strictEqual(isPasswordValid, true, 'Mật khẩu băm phải so khớp được với mật khẩu gốc');
    });

    it('phải báo lỗi UserAlreadyExistsException khi email đã tồn tại', async () => {
      const registerDto = {
        email: 'duplicate@nexus.com',
        password: 'Password123',
        fullName: 'User Duplicate',
      };

      await registerUseCase.execute(registerDto);

      await assert.rejects(
        async () => {
          await registerUseCase.execute(registerDto);
        },
        UserAlreadyExistsException,
        'Phải ném lỗi UserAlreadyExistsException khi email bị trùng',
      );
    });

    it('phải từ chối mật khẩu quá ngắn (< 6 ký tự)', async () => {
      await assert.rejects(async () => {
        await registerUseCase.execute({
          email: 'short@nexus.com',
          password: '123',
          fullName: 'Short Pass',
        });
      }, /tối thiểu 6 ký tự/);
    });
  });

  describe('4. LoginUseCase (Đăng nhập & Cấp phát JWT)', () => {
    beforeEach(async () => {
      // Đăng ký trước 1 user hợp lệ để test login
      const hashedPass = await passwordHasher.hash('BuyerSecret123');
      const activeUser = new User({
        id: 'usr_valid_buyer_01',
        email: 'buyer.active@nexus.com',
        fullName: 'Hoang Van Buyer',
        passwordHash: hashedPass,
        role: UserRole.BUYER,
        status: UserStatus.ACTIVE,
        reputationScore: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await userRepository.save(activeUser);

      // Thêm 1 user bị khóa (SUSPENDED)
      const suspendedUser = new User({
        id: 'usr_suspended_02',
        email: 'buyer.suspended@nexus.com',
        fullName: 'Tran Van Suspended',
        passwordHash: hashedPass,
        role: UserRole.BUYER,
        status: UserStatus.SUSPENDED,
        reputationScore: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await userRepository.save(suspendedUser);
    });

    it('phải đăng nhập thành công khi nhập đúng email và mật khẩu', async () => {
      const response = await loginUseCase.execute({
        email: 'buyer.active@nexus.com',
        password: 'BuyerSecret123',
      });

      assert.ok(response.accessToken, 'Phải trả về access token');
      assert.ok(response.refreshToken, 'Phải trả về refresh token');
      assert.strictEqual(response.user.email, 'buyer.active@nexus.com');
      assert.strictEqual(response.user.role, 'BUYER');

      // Giải mã access token để đảm bảo claim chuẩn
      const decoded = tokenService.verifyAccessToken(response.accessToken);
      assert.strictEqual(decoded.userId, 'usr_valid_buyer_01');
      assert.strictEqual(decoded.email, 'buyer.active@nexus.com');
    });

    it('phải từ chối khi nhập sai mật khẩu', async () => {
      await assert.rejects(
        async () => {
          await loginUseCase.execute({
            email: 'buyer.active@nexus.com',
            password: 'WrongPassword999',
          });
        },
        InvalidCredentialsException,
        'Phải ném lỗi InvalidCredentialsException khi sai mật khẩu',
      );
    });

    it('phải từ chối khi email không tồn tại trong hệ thống', async () => {
      await assert.rejects(
        async () => {
          await loginUseCase.execute({
            email: 'nonexistent@nexus.com',
            password: 'AnyPassword',
          });
        },
        InvalidCredentialsException,
        'Phải ném lỗi InvalidCredentialsException khi email không tồn tại',
      );
    });

    it('phải từ chối khi tài khoản đang bị khóa (SUSPENDED)', async () => {
      await assert.rejects(
        async () => {
          await loginUseCase.execute({
            email: 'buyer.suspended@nexus.com',
            password: 'BuyerSecret123',
          });
        },
        AccountSuspendedException,
        'Phải ném lỗi AccountSuspendedException khi tài khoản bị khóa',
      );
    });
  });
});
