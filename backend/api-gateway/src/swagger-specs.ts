// Header chuẩn: request có body gửi `Content-Type: application/json`;
// route private gửi thêm `Authorization: Bearer <JWT>` (nhập ở nút Authorize).
const jsonResponse = (description: string, example: unknown) => ({
  description,
  content: { 'application/json': { example } },
});
const errorResponse = (description: string, error: string) =>
  jsonResponse(description, { success: false, error });
const unauthorized = errorResponse(
  'Thiếu hoặc sai token (401 Unauthorized)',
  'Authentication required.',
);
const forbidden = errorResponse(
  'Không đủ quyền (403 Forbidden)',
  'Forbidden: missing permission "ROLE.VIEW".',
);
const PUBLIC = 'Route PUBLIC: không cần token.';
const PRIVATE = 'Route PRIVATE: bắt buộc header `Authorization: Bearer <JWT>`.';

const commonComponents = {
  securitySchemes: {
    BearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Nhập JWT token sau khi đăng nhập (không cần gõ Bearer)',
    },
  },
};

export const userSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Nexus - User & Authentication Service',
    version: '1.0.0',
    description:
      'Dịch vụ quản lý Người dùng, Đăng nhập (Auth) & Phân quyền (RBAC). Hỗ trợ UUID và tìm kiếm theo Email.',
  },
  servers: [{ url: '/', description: 'API Gateway (Same Origin)' }],
  components: commonComponents,
  paths: {
    '/api/v1/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Đăng nhập tài khoản',
        description: `${PUBLIC} Method: POST. Header: Content-Type: application/json. Đăng nhập bằng Email và Password, trả về thông tin User kèm JWT Token (hạn 8 giờ). Sai mật khẩu 5 lần sẽ bị khóa tài khoản (423). Tài khoản mẫu (Mật khẩu: 123456): admin@gmail.com (Admin), seller@gmail.com (Seller), buyer@gmail.com (Buyer), staff@gmail.com (Support Staff).`,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'buyer@gmail.com' },
                  password: { type: 'string', example: '123456' },
                },
              },
            },
          },
        },
        responses: {
          200: jsonResponse('Đăng nhập thành công', {
            success: true,
            data: {
              token: '<JWT>',
              user: {
                id: 'a0000000-0000-0000-0000-000000000003',
                email: 'buyer@gmail.com',
                fullName: 'Nguyễn Văn Buyer',
                role: 'BUYER',
                status: 'ACTIVE',
                reputationScore: 100,
                permissions: ['AUTH.LOGIN', 'PROFILE.VIEW'],
              },
            },
          }),
          401: errorResponse('Sai email hoặc mật khẩu', 'Invalid email or password.'),
          423: errorResponse(
            'Tài khoản bị khóa do nhập sai nhiều lần',
            'Account is locked. Please try again later.',
          ),
        },
      },
    },
    '/api/v1/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Đăng ký tài khoản mới',
        description: `${PUBLIC} Method: POST. Header: Content-Type: application/json. Tài khoản mới mặc định có vai trò BUYER. email bắt buộc đúng định dạng, fullName tối đa 100 ký tự, password tối thiểu 6 ký tự.`,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'fullName', 'password'],
                properties: {
                  email: { type: 'string', example: 'khachhangmoi@gmail.com' },
                  fullName: { type: 'string', example: 'Nguyễn Văn A' },
                  password: { type: 'string', example: 'Password@123' },
                },
              },
            },
          },
        },
        responses: {
          201: jsonResponse('Đăng ký thành công', {
            success: true,
            data: {
              id: '5b0f6a0e-0c2e-4a5e-9d55-1d0c1f4f7a10',
              email: 'khachhangmoi@gmail.com',
              fullName: 'Nguyễn Văn A',
              role: 'BUYER',
              status: 'ACTIVE',
              reputationScore: 100,
            },
          }),
          400: errorResponse('Dữ liệu không hợp lệ', 'A valid email is required.'),
          409: errorResponse('Email đã tồn tại', 'An account with this email already exists.'),
        },
      },
    },
    '/api/v1/auth/forgot-password': {
      post: {
        tags: ['Authentication'],
        summary: 'Yêu cầu đặt lại mật khẩu',
        description: `${PUBLIC} Method: POST. Header: Content-Type: application/json. Luôn trả 200 dù email có tồn tại hay không. Ngoài môi trường production, response kèm resetToken (hạn 15 phút, dùng 1 lần) để demo.`,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: { type: 'string', example: 'buyer@gmail.com' },
                },
              },
            },
          },
        },
        responses: {
          200: jsonResponse('Yêu cầu đã được ghi nhận', {
            success: true,
            message: 'If the account exists, password reset instructions will be sent.',
            resetToken: '<chỉ có khi không ở production>',
          }),
        },
      },
    },
    '/api/v1/auth/reset-password': {
      post: {
        tags: ['Authentication'],
        summary: 'Đặt lại mật khẩu mới bằng reset token',
        description: `${PUBLIC} Method: POST. Header: Content-Type: application/json. Dùng resetToken từ forgot-password (dùng 1 lần, hạn 15 phút). newPassword tối thiểu 6 ký tự.`,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'newPassword'],
                properties: {
                  token: { type: 'string', example: 'paste-reset-token-here' },
                  newPassword: { type: 'string', example: 'NewPassword@123' },
                },
              },
            },
          },
        },
        responses: {
          200: jsonResponse('Đổi mật khẩu thành công', {
            success: true,
            message: 'Password has been reset.',
          }),
          400: errorResponse(
            'Token sai/hết hạn/đã dùng hoặc mật khẩu mới không hợp lệ',
            'Password reset token is invalid or expired.',
          ),
        },
      },
    },
    '/api/v1/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Đăng xuất tài khoản',
        description: `${PRIVATE} Method: POST. Token bị thu hồi, dùng lại sẽ nhận 401.`,
        security: [{ BearerAuth: [] }],
        responses: {
          200: jsonResponse('Đăng xuất thành công', {
            success: true,
            data: { success: true, message: 'Logged out successfully.' },
          }),
          401: unauthorized,
        },
      },
    },
    '/api/v1/auth/roles': {
      get: {
        tags: ['Authentication'],
        summary: 'Danh sách các quyền (Permissions) theo vai trò',
        description: `${PRIVATE} Cần quyền ROLE.VIEW (ADMIN).`,
        security: [{ BearerAuth: [] }],
        responses: {
          200: jsonResponse('Thành công', {
            success: true,
            data: [{ role: 'BUYER', permissions: ['AUTH.LOGIN', 'PROFILE.VIEW'] }],
          }),
          401: unauthorized,
          403: forbidden,
        },
      },
    },
    '/api/v1/users/profile': {
      get: {
        tags: ['Users & Profile'],
        summary: 'Xem hồ sơ của chính mình (Từ JWT token)',
        description: `${PRIVATE} Cần quyền PROFILE.VIEW.`,
        security: [{ BearerAuth: [] }],
        responses: {
          200: jsonResponse('Thông tin cá nhân', {
            success: true,
            data: {
              id: 'a0000000-0000-0000-0000-000000000003',
              email: 'buyer@gmail.com',
              fullName: 'Nguyễn Văn Buyer',
              phone: '0901234567',
              role: 'BUYER',
              status: 'ACTIVE',
              reputationScore: 100,
            },
          }),
          401: unauthorized,
          403: forbidden,
        },
      },
      patch: {
        tags: ['Users & Profile'],
        summary: 'Cập nhật họ tên và số điện thoại của chính mình (P0 #2)',
        description: `${PRIVATE} Cần quyền PROFILE.UPDATE. Cho phép cập nhật fullName và phone thật. Số điện thoại được đối chiếu chống trùng lặp.`,
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  fullName: { type: 'string', example: 'Nguyễn Văn Buyer Mới' },
                  phone: { type: 'string', example: '0912345678' },
                },
              },
            },
          },
        },
        responses: {
          200: jsonResponse('Cập nhật thành công', {
            success: true,
            data: {
              id: 'a0000000-0000-0000-0000-000000000003',
              email: 'buyer@gmail.com',
              fullName: 'Nguyễn Văn Buyer Mới',
              phone: '0912345678',
              role: 'BUYER',
              status: 'ACTIVE',
              reputationScore: 100,
            },
          }),
          400: errorResponse(
            'Dữ liệu không hợp lệ',
            'Số điện thoại không đúng định dạng Việt Nam.',
          ),
          401: unauthorized,
          409: errorResponse(
            'Số điện thoại trùng lặp',
            'Số điện thoại này đã được đăng ký bởi tài khoản khác.',
          ),
        },
      },
    },
    '/api/v1/users/me/addresses': {
      get: {
        tags: ['Buyer Address Book'],
        summary: 'Lấy sổ địa chỉ nhận hàng của Buyer (P0 #3)',
        description: `${PRIVATE} Lấy danh sách địa chỉ đã lưu của chính Buyer (tối đa 5 địa chỉ). Luôn có tối đa 1 địa chỉ mặc định được ưu tiên lên đầu.`,
        security: [{ BearerAuth: [] }],
        responses: {
          200: jsonResponse('Danh sách địa chỉ', {
            success: true,
            data: [
              {
                id: 'addr_123',
                userId: 'usr_01',
                label: 'Nhà riêng',
                recipientName: 'Nguyễn Văn Buyer',
                phone: '0901234567',
                provinceCode: '79',
                provinceName: 'Thành phố Hồ Chí Minh',
                wardCode: '26734',
                wardName: 'Phường Bến Nghé',
                street: '123 Lê Lợi',
                note: 'Giao giờ hành chính',
                isDefault: true,
                createdAt: '2026-10-28T07:00:00.000Z',
              },
            ],
          }),
          401: unauthorized,
        },
      },
      post: {
        tags: ['Buyer Address Book'],
        summary: 'Tạo địa chỉ nhận hàng mới (P0 #4)',
        description: `${PRIVATE} Thêm địa chỉ mới theo chuẩn 2 cấp (Tỉnh/Thành -> Phường/Xã). Giới hạn tối đa 5 địa chỉ active. Địa chỉ đầu tiên tự động đặt làm mặc định.`,
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: [
                  'recipientName',
                  'phone',
                  'provinceCode',
                  'provinceName',
                  'wardCode',
                  'wardName',
                  'street',
                ],
                properties: {
                  label: { type: 'string', example: 'Nhà riêng' },
                  recipientName: { type: 'string', example: 'Nguyễn Văn Buyer' },
                  phone: { type: 'string', example: '0901234567' },
                  provinceCode: { type: 'string', example: '79' },
                  provinceName: { type: 'string', example: 'Thành phố Hồ Chí Minh' },
                  wardCode: { type: 'string', example: '26734' },
                  wardName: { type: 'string', example: 'Phường Bến Nghé' },
                  street: { type: 'string', example: '123 Lê Lợi' },
                  note: { type: 'string', example: 'Giao giờ hành chính' },
                  isDefault: { type: 'boolean', example: false },
                },
              },
            },
          },
        },
        responses: {
          201: jsonResponse('Tạo địa chỉ thành công', {
            success: true,
            data: { id: 'addr_new', isDefault: true },
          }),
          400: errorResponse(
            'Dữ liệu không hợp lệ',
            'Thiếu thông tin hoặc số điện thoại không hợp lệ.',
          ),
          401: unauthorized,
          422: errorResponse(
            'Vượt quá giới hạn',
            'ADDRESS_LIMIT_REACHED: Mỗi khách hàng chỉ được lưu tối đa 5 địa chỉ đang hoạt động.',
          ),
        },
      },
    },
    '/api/v1/users/me/addresses/{addressId}': {
      patch: {
        tags: ['Buyer Address Book'],
        summary: 'Cập nhật địa chỉ nhận hàng (P0 #5)',
        description: `${PRIVATE} Sửa địa chỉ thuộc sở hữu của Buyer. Không làm thay đổi snapshot trong các đơn hàng cũ đã đặt.`,
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'addressId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  label: { type: 'string' },
                  recipientName: { type: 'string' },
                  phone: { type: 'string' },
                  street: { type: 'string' },
                  note: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: jsonResponse('Cập nhật thành công', { success: true }),
          401: unauthorized,
          403: forbidden,
          404: errorResponse('Không tìm thấy', 'Địa chỉ không tồn tại.'),
        },
      },
      delete: {
        tags: ['Buyer Address Book'],
        summary: 'Xóa địa chỉ nhận hàng (P0 #6)',
        description: `${PRIVATE} Xóa địa chỉ. Nếu xóa đúng địa chỉ mặc định, tự động chuyển mặc định cho địa chỉ còn lại tạo sớm nhất.`,
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'addressId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('Xóa thành công', {
            success: true,
            message: 'Địa chỉ đã được xóa thành công.',
          }),
          401: unauthorized,
          403: forbidden,
          404: errorResponse('Không tìm thấy', 'Địa chỉ không tồn tại.'),
        },
      },
    },
    '/api/v1/users/me/addresses/{addressId}/default': {
      put: {
        tags: ['Buyer Address Book'],
        summary: 'Đặt địa chỉ làm mặc định (P0 #7)',
        description: `${PRIVATE} Chuyển địa chỉ chỉ định thành mặc định duy nhất trong 1 giao dịch cơ sở dữ liệu.`,
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'addressId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('Đặt mặc định thành công', { success: true }),
          401: unauthorized,
          403: forbidden,
          404: errorResponse('Không tìm thấy', 'Địa chỉ không tồn tại.'),
        },
      },
    },
    '/api/v1/users': {
      get: {
        tags: ['Users & Profile'],
        summary: 'Tra cứu & tìm kiếm danh sách người dùng (Support Staff & Admin)',
        description: `${PRIVATE} Cần quyền USER.VIEW (Role: SUPPORT_STAFF hoặc ADMIN). Hỗ trợ tìm kiếm từ khóa q, lọc theo email, vai trò (role), trạng thái (status), sắp xếp và phân trang.`,
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: false,
            description: 'Từ khóa tìm kiếm theo tên, email, id, hoặc vai trò',
            schema: { type: 'string', example: 'Minh Anh' },
          },
          {
            name: 'email',
            in: 'query',
            required: false,
            description: 'Địa chỉ Email cần lọc chính xác',
            schema: { type: 'string', example: 'buyer@gmail.com' },
          },
          {
            name: 'role',
            in: 'query',
            required: false,
            description: 'Vai trò người dùng (BUYER, SELLER, SUPPORT_STAFF, ADMIN)',
            schema: { type: 'string', example: 'BUYER' },
          },
          {
            name: 'status',
            in: 'query',
            required: false,
            description: 'Trạng thái tài khoản (ACTIVE, SUSPENDED, PENDING_VERIFICATION)',
            schema: { type: 'string', example: 'ACTIVE' },
          },
          {
            name: 'page',
            in: 'query',
            required: false,
            description: 'Số trang (bắt đầu từ 1)',
            schema: { type: 'integer', default: 1, example: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            description: 'Số lượng bản ghi trên một trang (tối đa 100)',
            schema: { type: 'integer', default: 10, example: 10 },
          },
          {
            name: 'sortBy',
            in: 'query',
            required: false,
            description: 'Trường sắp xếp (createdAt, fullName, email, reputationScore)',
            schema: {
              type: 'string',
              enum: ['createdAt', 'fullName', 'email', 'reputationScore'],
              default: 'createdAt',
            },
          },
          {
            name: 'sortOrder',
            in: 'query',
            required: false,
            description: 'Thứ tự sắp xếp (asc hoặc desc)',
            schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          },
        ],
        responses: {
          200: jsonResponse('Danh sách người dùng và phân trang thành công', {
            success: true,
            data: [
              {
                id: 'usr_01hqz789abc',
                fullName: 'Nguyen Van Buyer',
                name: 'Nguyen Van Buyer',
                email: 'buyer.test@nexus-ecommerce.com',
                role: 'BUYER',
                status: 'ACTIVE',
                reputationScore: 98,
                reputation: 98,
                ordersCount: 0,
                orders: 0,
                createdAt: '2026-10-20T12:00:00.000Z',
                updatedAt: '2026-10-20T12:00:00.000Z',
              },
            ],
            pagination: {
              total: 1,
              page: 1,
              limit: 10,
              totalPages: 1,
            },
          }),
          401: unauthorized,
          403: forbidden,
        },
      },
    },
    '/api/v1/users/{id}': {
      get: {
        tags: ['Users & Profile'],
        summary: 'Xem thông tin người dùng theo UUID hoặc Email',
        description: `${PRIVATE} Cần quyền USER.VIEW.`,
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'UUID hoặc Email của người dùng',
            schema: { type: 'string', example: 'buyer@gmail.com' },
          },
        ],
        responses: {
          200: jsonResponse('Thông tin người dùng', {
            success: true,
            data: {
              id: 'a0000000-0000-0000-0000-000000000003',
              email: 'buyer@gmail.com',
              role: 'BUYER',
            },
          }),
          401: unauthorized,
          403: forbidden,
          404: errorResponse('Không tìm thấy', 'User with identifier "x" was not found.'),
        },
      },
    },
    '/api/v1/users/{id}/role': {
      put: {
        tags: ['Users & Profile'],
        summary: 'Cập nhật vai trò (Role) cho tài khoản',
        description: `${PRIVATE} Cần quyền ROLE.UPDATE (ADMIN). Header: Content-Type: application/json. Sau khi đổi role, token cũ của user đó bị thu hồi.`,
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'UUID của người dùng cần đổi vai trò',
            schema: { type: 'string', example: '01a15822-43b8-78c3-a246-16bff78bc6e8' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['role'],
                properties: {
                  role: {
                    type: 'string',
                    enum: ['BUYER', 'SELLER', 'ADMIN', 'SUPPORT_STAFF'],
                    example: 'SUPPORT_STAFF',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: jsonResponse('Cập nhật vai trò thành công', {
            success: true,
            data: { id: 'a0000000-0000-0000-0000-000000000003', role: 'SELLER' },
          }),
          400: errorResponse('Vai trò không hợp lệ', 'Role must be BUYER, SELLER, or ADMIN.'),
          401: unauthorized,
          403: forbidden,
          404: errorResponse('Không tìm thấy user', 'User not found.'),
        },
      },
    },
    '/api/v1/users/{id}/status': {
      patch: {
        tags: ['Users & Profile'],
        summary: 'Khóa hoặc mở khóa tài khoản người dùng',
        description: `${PRIVATE} Cần quyền USER.UPDATE (SUPPORT_STAFF, ADMIN). Khóa tài khoản khi có dấu hiệu gian lận hoặc vi phạm quy định sàn (SRS 2.3, 2.7, 3.1.2). Khi bị SUSPENDED, toàn bộ phiên đăng nhập của người dùng sẽ bị thu hồi ngay lập tức.`,
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID của người dùng cần khóa / mở khóa',
            schema: { type: 'string', example: 'usr_01hqz789abc' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status', 'reason'],
                properties: {
                  status: {
                    type: 'string',
                    enum: ['ACTIVE', 'SUSPENDED'],
                    example: 'SUSPENDED',
                  },
                  reason: {
                    type: 'string',
                    example: 'Tài khoản có dấu hiệu thông đồng buff giá đấu giá ảo.',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: jsonResponse('Cập nhật trạng thái thành công', {
            success: true,
            message: "Đã cập nhật trạng thái người dùng thành 'SUSPENDED'.",
            data: {
              id: 'usr_01hqz789abc',
              email: 'buyer.test@nexus-ecommerce.com',
              fullName: 'Nguyen Van Buyer',
              status: 'SUSPENDED',
              reason: 'Tài khoản có dấu hiệu thông đồng buff giá đấu giá ảo.',
              updatedAt: '2026-11-01T02:00:00.000Z',
            },
          }),
          400: errorResponse(
            'Dữ liệu không hợp lệ',
            'Trạng thái không hợp lệ hoặc thiếu lý do (reason).',
          ),
          401: unauthorized,
          403: forbidden,
          404: errorResponse(
            'Không tìm thấy người dùng',
            'Không tìm thấy người dùng với mã ID đã chỉ định.',
          ),
        },
      },
    },
  },
};

export const catalogSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Nexus - Catalog Service (Sản phẩm)',
    version: '1.0.0',
    description: 'Dịch vụ quản lý Danh mục & Sản phẩm bán trên sàn Nexus.',
  },
  servers: [{ url: '/', description: 'API Gateway (Same Origin)' }],
  components: commonComponents,
  paths: {
    '/api/v1/categories': {
      get: {
        tags: ['Categories'],
        summary: 'Lấy danh sách danh mục',
        description: `${PUBLIC} Method: GET. Mặc định trả cây danh mục đang hoạt động tối đa 3 cấp; dùng tree=false để lấy danh sách phẳng.`,
        parameters: [
          {
            name: 'tree',
            in: 'query',
            required: false,
            description: 'Trả cây phân cấp khi true (mặc định), danh sách phẳng khi false.',
            schema: { type: 'boolean', default: true },
          },
        ],
        responses: {
          200: jsonResponse('Danh sách danh mục đang hoạt động', {
            success: true,
            data: [
              {
                id: '1',
                name: 'Thiết bị điện tử',
                slug: 'thiet-bi-dien-tu',
                parentId: null,
                level: 1,
                children: [
                  {
                    id: '10',
                    name: 'Điện thoại & Tablet',
                    slug: 'dien-thoai-tablet',
                    parentId: '1',
                    level: 2,
                    children: [
                      {
                        id: '100',
                        name: 'iPhone',
                        slug: 'dien-thoai-iphone',
                        parentId: '10',
                        level: 3,
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ],
          }),
          400: errorResponse(
            'Tham số không hợp lệ',
            'Query parameter "tree" must be true or false.',
          ),
          500: errorResponse('Không thể tải danh mục', 'Unable to load categories.'),
        },
      },
    },

    '/api/v1/products/mine': {
      get: {
        tags: ['Products'],
        summary: 'Xem kho hàng (Seller / Admin)',
        description: `${PRIVATE} Method: GET. Bắt buộc đăng nhập tài khoản Seller. Trả về toàn bộ danh sách sản phẩm thuộc về chính người bán đó (bao gồm cả ACTIVE, DRAFT, ARCHIVED để quản lý kho).`,
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['ACTIVE', 'DRAFT', 'ARCHIVED', 'OUT_OF_STOCK'] },
            description: 'Lọc kho hàng theo trạng thái (tùy chọn)',
          },
        ],
        responses: {
          200: jsonResponse('Kho hàng của Seller', {
            success: true,
            total: 15,
            data: [
              {
                id: '15',
                sellerId: '01a15822-3fd0-7b39-ad01-f11da72d5b80',
                sellerName: 'Trần Thị Seller',
                title: 'Mô hình LEGO Icons NASA Apollo 11 Lunar Lander 10266',
                price: 3450000,
                stockQuantity: 10,
                status: 'ACTIVE',
                createdAt: '2026-10-24T18:00:00.000Z',
                updatedAt: '2026-10-24T18:00:00.000Z',
              },
            ],
          }),
          401: errorResponse(
            'Chưa xác thực',
            'Vui lòng đăng nhập tài khoản Seller để thực hiện thao tác này.',
          ),
          403: errorResponse(
            'Không có quyền',
            'Chỉ tài khoản vai trò SELLER hoặc ADMIN mới có quyền truy cập.',
          ),
        },
      },
    },
    '/api/v1/products': {
      get: {
        tags: ['Products'],
        summary: 'Danh sách sản phẩm (Khách hàng & Quản trị)',
        description: `${PUBLIC} Method: GET. Lấy danh sách sản phẩm có hỗ trợ phân trang và bộ lọc nâng cao. Khách hàng xem danh sách công khai (mặc định scope=buyer). Quản trị viên (ADMIN) có thể truyền query \`scope=admin\` (kèm header Authorization: Bearer <JWT>) để xem toàn bộ sản phẩm gồm cả DRAFT, ARCHIVED, OUT_OF_STOCK.`,
        parameters: [
          {
            name: 'scope',
            in: 'query',
            required: false,
            description:
              'Phạm vi truy vấn: "buyer" (công khai) hoặc "admin" (dành riêng cho Admin)',
            schema: { type: 'string', enum: ['buyer', 'admin'], default: 'buyer' },
          },
          {
            name: 'page',
            in: 'query',
            required: false,
            description: 'Số trang (bắt đầu từ 1, mặc định 1)',
            schema: { type: 'integer', default: 1, example: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            description: 'Số lượng sản phẩm trên mỗi trang (1-100, mặc định 20)',
            schema: { type: 'integer', default: 20, example: 20 },
          },
          {
            name: 'sort',
            in: 'query',
            required: false,
            description: 'Tiêu chí sắp xếp',
            schema: {
              type: 'string',
              enum: ['newest', 'oldest', 'price_asc', 'price_desc'],
              default: 'newest',
            },
          },
          {
            name: 'categoryId',
            in: 'query',
            required: false,
            description: 'Lọc theo ID danh mục',
            schema: { type: 'string', example: '100' },
          },
          {
            name: 'condition',
            in: 'query',
            required: false,
            description: 'Tình trạng sản phẩm',
            schema: { type: 'string', enum: ['NEW', 'LIKE_NEW', 'USED', 'REFURBISHED'] },
          },
          {
            name: 'status',
            in: 'query',
            required: false,
            description: 'Trạng thái sản phẩm (chỉ hỗ trợ khi scope=admin)',
            schema: { type: 'string', enum: ['ACTIVE', 'DRAFT', 'ARCHIVED', 'OUT_OF_STOCK'] },
          },
          {
            name: 'saleType',
            in: 'query',
            required: false,
            description: 'Hình thức bán hàng',
            schema: { type: 'string', enum: ['DIRECT_SALE', 'AUCTION'] },
          },
          {
            name: 'minPrice',
            in: 'query',
            required: false,
            description: 'Giá tối thiểu (VND)',
            schema: { type: 'number', example: 1000000 },
          },
          {
            name: 'maxPrice',
            in: 'query',
            required: false,
            description: 'Giá tối đa (VND)',
            schema: { type: 'number', example: 50000000 },
          },
          {
            name: 'q',
            in: 'query',
            required: false,
            description: 'Từ khóa tìm kiếm tiêu đề/mô tả sản phẩm',
            schema: { type: 'string', example: 'iphone' },
          },
        ],
        responses: {
          200: jsonResponse('Danh sách sản phẩm', {
            success: true,
            data: [
              {
                id: '1',
                sellerId: 'a0000000-0000-0000-0000-000000000002',
                categoryId: '100',
                title: 'iPhone 15 Pro Max 256GB Titan Tự Nhiên',
                description: '...',
                price: 29990000,
                stockQuantity: 10,
                status: 'ACTIVE',
                images: ['https://...'],
                primaryImage: 'https://...',
                condition: 'NEW',
                slug: 'iphone-15-pro-max-256gb-titan-tu-nhien',
                allowAuction: false,
                attributes: {},
              },
            ],
          }),
        },
      },
      post: {
        tags: ['Products'],
        summary: 'Tạo sản phẩm mới (Seller / Admin)',
        description: `${PRIVATE} Tạo sản phẩm mới. Seller tạo cho chính mình; Admin có thể truyền thêm \`sellerId\` để tạo thay mặt cho Seller khác.`,
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'description', 'categoryId', 'price'],
                properties: {
                  sellerId: {
                    type: 'string',
                    description: 'Tùy chọn: Dành riêng cho ADMIN để tạo sản phẩm thay mặt Seller',
                    example: 'a0000000-0000-0000-0000-000000000002',
                  },
                  title: { type: 'string', example: 'iPhone 15 Pro Max 512GB Blue Titanium' },
                  description: {
                    type: 'string',
                    example: 'Điện thoại chính hãng VN/A nguyên seal bảo hành 12 tháng',
                  },
                  categoryId: { type: 'string', example: '100' },
                  price: { type: 'number', example: 34990000 },
                  stockQuantity: { type: 'integer', example: 15 },
                  condition: {
                    type: 'string',
                    enum: ['NEW', 'LIKE_NEW', 'USED', 'REFURBISHED'],
                    default: 'NEW',
                  },
                  allowAuction: { type: 'boolean', default: false },
                  images: {
                    type: 'array',
                    items: { type: 'string' },
                    example: ['https://images.unsplash.com/photo-1695048133142-1a20484d2569'],
                  },
                  attributes: {
                    type: 'object',
                    description: 'Các thuộc tính kỹ thuật chi tiết của sản phẩm (dạng key-value)',
                    example: {
                      'Màu sắc': 'Blue Titanium',
                      'Dung lượng': '512GB',
                      RAM: '8GB',
                      'Bảo hành': '12 tháng VN/A',
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          201: jsonResponse('Tạo sản phẩm thành công', {
            success: true,
            message: 'Tạo sản phẩm mới thành công!',
            data: {
              id: '16',
              slug: 'iphone-15-pro-max-512gb-blue-titanium-123456',
              title: 'iPhone 15 Pro Max 512GB Blue Titanium',
            },
          }),
          400: errorResponse('Dữ liệu không hợp lệ', 'Giá sản phẩm phải lớn hơn 0 VND.'),
          401: errorResponse(
            'Chưa xác thực',
            'Vui lòng đăng nhập tài khoản Seller để thực hiện thao tác này.',
          ),
          403: errorResponse(
            'Không có quyền',
            'Tài khoản với vai trò BUYER không có quyền đăng bán sản phẩm.',
          ),
        },
      },
    },
    '/api/v1/products/search': {
      get: {
        tags: ['Products'],
        summary: 'Tìm kiếm sản phẩm',
        description: `${PUBLIC} Method: GET. Query "q" là bắt buộc; các tham số khác tùy chọn. Tham số sai kiểu/âm trả 400.`,
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: true,
            description: 'Từ khóa tìm kiếm',
            schema: { type: 'string', example: 'iphone' },
          },
          {
            name: 'categoryId',
            in: 'query',
            required: false,
            description: 'Lọc theo danh mục',
            schema: { type: 'string', example: '100' },
          },
          {
            name: 'minPrice',
            in: 'query',
            required: false,
            description: 'Giá tối thiểu (số >= 0)',
            schema: { type: 'number', example: 1000000 },
          },
          {
            name: 'maxPrice',
            in: 'query',
            required: false,
            description: 'Giá tối đa (số >= 0, không nhỏ hơn minPrice)',
            schema: { type: 'number', example: 50000000 },
          },
          {
            name: 'page',
            in: 'query',
            required: false,
            description: 'Trang (số nguyên >= 1, mặc định 1)',
            schema: { type: 'integer', example: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            description: 'Số dòng mỗi trang (1-100, mặc định 20)',
            schema: { type: 'integer', example: 20 },
          },
        ],
        responses: {
          200: jsonResponse('Kết quả tìm kiếm', {
            success: true,
            data: [
              {
                id: '1',
                sellerId: 'a0000000-0000-0000-0000-000000000002',
                categoryId: '100',
                title: 'iPhone 15 Pro Max 256GB Titan Tự Nhiên',
                price: 29990000,
                stockQuantity: 10,
                status: 'ACTIVE',
              },
            ],
            meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
          }),
          400: errorResponse('Tham số không hợp lệ', 'Query parameter "q" is required.'),
        },
      },
    },
    '/api/v1/products/{id}': {
      get: {
        tags: ['Products'],
        summary: 'Xem chi tiết sản phẩm theo ID hoặc Slug',
        description: `${PUBLIC} Method: GET.`,
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description:
              'Mã sản phẩm (ID như 1, 2, 3... hoặc Slug như iphone-15-pro-max-256gb-titan-tu-nhien)',
            schema: { type: 'string', example: '1' },
          },
        ],
        responses: {
          200: jsonResponse('Chi tiết sản phẩm', {
            success: true,
            data: {
              id: '1',
              sellerId: 'a0000000-0000-0000-0000-000000000002',
              categoryId: '100',
              title: 'iPhone 15 Pro Max 256GB Titan Tự Nhiên',
              price: 29990000,
              stockQuantity: 10,
              status: 'ACTIVE',
              images: ['https://...'],
            },
          }),
          404: errorResponse('Không tìm thấy sản phẩm', 'Product with ID "999999" was not found.'),
        },
      },
      put: {
        tags: ['Products'],
        summary: 'Cập nhật sản phẩm (Seller / Admin)',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Mã ID của sản phẩm cần cập nhật (ví dụ: 17)',
            schema: { type: 'string', example: '17' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: {
                    type: 'string',
                    example: 'iPhone 15 Pro Max 512GB Blue Titanium (Đã giảm giá)',
                  },
                  description: {
                    type: 'string',
                    example: 'Bản chính hãng VN/A nguyên seal bảo hành 12 tháng tại Apple Store',
                  },
                  categoryId: { type: 'string', example: '100' },
                  price: { type: 'number', example: 32990000 },
                  stockQuantity: { type: 'integer', example: 20 },
                  condition: {
                    type: 'string',
                    enum: ['NEW', 'LIKE_NEW', 'USED', 'REFURBISHED'],
                    default: 'NEW',
                  },
                  status: {
                    type: 'string',
                    enum: ['ACTIVE', 'DRAFT', 'ARCHIVED', 'OUT_OF_STOCK'],
                    default: 'ACTIVE',
                  },
                  allowAuction: { type: 'boolean', default: false },
                  images: {
                    type: 'array',
                    items: { type: 'string' },
                    example: ['https://images.unsplash.com/photo-1695048133142-1a20484d2569'],
                  },
                  attributes: {
                    type: 'object',
                    example: {
                      'Màu sắc': 'Blue Titanium',
                      'Dung lượng': '512GB',
                      RAM: '8GB',
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: jsonResponse('Cập nhật thành công', {
            success: true,
            message: 'Cập nhật sản phẩm thành công!',
            data: {
              id: '17',
              title: 'iPhone 15 Pro Max 512GB Blue Titanium (Đã giảm giá)',
              price: 32990000,
              stockQuantity: 20,
              status: 'ACTIVE',
              updatedAt: '2026-10-25T01:20:00.000Z',
            },
          }),
          400: errorResponse('Dữ liệu không hợp lệ', 'Giá sản phẩm phải lớn hơn 0 VND.'),
          401: errorResponse('Chưa xác thực', 'Vui lòng đăng nhập để thực hiện thao tác này.'),
          403: errorResponse('Từ chối truy cập', 'Bạn không có quyền chỉnh sửa sản phẩm này.'),
          404: errorResponse('Không tìm thấy', 'Product with ID "999" was not found.'),
        },
      },
      delete: {
        tags: ['Products'],
        summary: 'Xóa sản phẩm (Seller / Admin)',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Mã ID của sản phẩm cần xóa',
            schema: { type: 'string', example: '15' },
          },
        ],
        responses: {
          200: jsonResponse('Xóa thành công', {
            success: true,
            message: "Đã xóa thành công sản phẩm với mã ID '15'.",
          }),
          401: errorResponse('Chưa xác thực', 'Vui lòng đăng nhập để thực hiện thao tác này.'),
          403: errorResponse('Từ chối truy cập', 'Bạn không có quyền xóa sản phẩm của người khác.'),
          404: errorResponse('Không tìm thấy', 'Product with ID "999" was not found.'),
        },
      },
    },
    '/api/v1/products/{id}/recover': {
      post: {
        tags: ['Products'],
        summary: 'Khôi phục sản phẩm đã xóa mềm (Seller / Admin)',
        description: `${PRIVATE} Khôi phục sản phẩm đã bị xóa hoặc lưu trữ về trạng thái ACTIVE. Yêu cầu quyền SELLER (chính chủ sản phẩm) hoặc ADMIN.`,
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Mã ID của sản phẩm cần khôi phục',
            schema: { type: 'string', example: '15' },
          },
        ],
        responses: {
          200: jsonResponse('Khôi phục sản phẩm thành công', {
            success: true,
            message: "Đã khôi phục thành công sản phẩm với mã ID '15'.",
          }),
          401: unauthorized,
          403: forbidden,
          404: errorResponse('Không tìm thấy sản phẩm', 'Product with ID "15" was not found.'),
        },
      },
    },
  },
};

export const auctionSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Nexus - Auction Service (Đấu giá)',
    version: '1.0.0',
    description: 'Dịch vụ quản lý các Phiên đấu giá và Đặt giá thầu (Bidding).',
  },
  servers: [{ url: '/', description: 'API Gateway (Same Origin)' }],
  components: commonComponents,
  paths: {
    '/api/v1/auctions': {
      get: {
        tags: ['Auctions'],
        summary: 'Lấy danh sách các phiên đấu giá đang diễn ra',
        description: `${PUBLIC} Method: GET.`,
        responses: {
          200: jsonResponse('Danh sách phiên đấu giá', {
            success: true,
            data: [
              {
                id: 'auc_01hqz777live',
                productId: 'prod_01hqz999xyz',
                currentHighestBid: 250,
                highestBidderId: 'usr_01hqz789abc',
                status: 'ACTIVE',
                endTime: '2026-10-21T15:34:06.147Z',
              },
            ],
          }),
        },
      },
    },
    '/api/v1/auctions/{id}': {
      get: {
        tags: ['Auctions'],
        summary: 'Xem chi tiết một phiên đấu giá',
        description: `${PUBLIC} Method: GET.`,
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Mã phòng đấu giá (Auction ID)',
            schema: { type: 'string', example: 'auc_01hqz777live' },
          },
        ],
        responses: {
          200: jsonResponse('Chi tiết phòng đấu giá', {
            success: true,
            data: { id: 'auc_01hqz777live', status: 'ACTIVE', currentHighestBid: 250 },
          }),
          404: errorResponse('Không tìm thấy', 'Auction with ID "999" was not found.'),
        },
      },
    },
    '/api/v1/auctions/{id}/bids': {
      post: {
        tags: ['Auctions'],
        summary: 'Trả giá / Đặt giá thầu (Place Bid)',
        description: `Route PRIVATE (theo thiết kế): cần header \`Authorization: Bearer <JWT>\` và Content-Type: application/json. LƯU Ý: hiện tại Auction Service chưa kiểm tra token và chưa validate body (chế độ Skeleton), nên request không token hoặc body sai vẫn trả 200. Gửi lượt trả giá mới vào phiên đấu giá.`,
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Mã phòng đấu giá (Auction ID)',
            schema: { type: 'string', example: 'auc_01hqz777live' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['bidderId', 'bidAmount'],
                properties: {
                  bidderId: { type: 'string', example: '01a15822-43b8-78c3-a246-16bff78bc6e8' },
                  bidAmount: { type: 'number', example: 15000000 },
                },
              },
            },
          },
        },
        responses: {
          200: jsonResponse('Trả giá thành công (Skeleton)', {
            success: true,
            message: 'Bid accepted by bidding engine (Skeleton mode)',
            data: {
              auctionId: 'auc_01hqz777live',
              bidderId: 'a0000000-0000-0000-0000-000000000003',
              acceptedAmount: 15000000,
              status: 'ACCEPTED',
            },
          }),
          401: unauthorized,
        },
      },
    },
  },
};

export const commerceSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Nexus - Commerce Service (Đơn hàng & Support)',
    version: '1.0.0',
    description:
      'Dịch vụ quản lý Giỏ hàng, Đặt hàng (Checkout), Hóa đơn & Xử lý khiếu nại (Support Staff).',
  },
  servers: [{ url: '/', description: 'API Gateway (Same Origin)' }],
  components: commonComponents,
  paths: {
    '/api/v1/orders': {
      get: {
        tags: ['Support Staff / Tra cứu đơn hàng'],
        summary: 'Tra cứu danh sách đơn hàng (Search, Filter & Pagination)',
        description: `${PRIVATE} Yêu cầu quyền ORDER.LIST (SUPPORT_STAFF hoặc ADMIN). Hỗ trợ tìm kiếm theo từ khóa mã đơn, email, người mua, người bán.`,
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'query',
            in: 'query',
            required: false,
            description: 'Từ khóa tìm kiếm (mã đơn, tên/email khách hàng, gian hàng)',
            schema: { type: 'string', example: 'NX-ORD-8021' },
          },
          {
            name: 'status',
            in: 'query',
            required: false,
            description:
              'Lọc trạng thái (PENDING, PAID, PROCESSING, SHIPPED, DELIVERED, CANCELLED, REFUNDED)',
            schema: { type: 'string', example: 'PENDING' },
          },
          {
            name: 'page',
            in: 'query',
            required: false,
            description: 'Số trang (mặc định: 1)',
            schema: { type: 'integer', example: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            description: 'Số bản ghi trên trang (mặc định: 10)',
            schema: { type: 'integer', example: 10 },
          },
        ],
        responses: {
          200: jsonResponse('Danh sách đơn hàng', {
            success: true,
            data: [
              {
                id: 'NX-ORD-8021',
                buyer: 'Minh Anh',
                email: 'minhanh@example.com',
                seller: 'Nexus Audio',
                product: 'Tai nghe không dây Nexus Air',
                total: 1290000,
                status: 'Chờ xử lý',
                statusCode: 'PENDING',
                date: '18/10/2026',
                tracking: 'GHN8829103VN',
              },
            ],
            pagination: { total: 4, page: 1, limit: 10, totalPages: 1 },
          }),
          401: unauthorized,
          403: forbidden,
        },
      },
    },
    '/api/v1/orders/checkout': {
      post: {
        tags: ['Orders & Checkout'],
        summary: 'Tạo đơn hàng & Thanh toán (Checkout)',
        description: `Header: Content-Type: application/json. LƯU Ý: hiện tại Commerce Service hỗ trợ đặt hàng.`,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        productId: { type: 'string', example: '1' },
                        quantity: { type: 'number', example: 2 },
                      },
                    },
                  },
                  shippingAddress: { type: 'string', example: 'Khu Công Nghệ Cao, TP.HCM' },
                },
              },
            },
          },
        },
        responses: {
          201: jsonResponse('Tạo đơn hàng thành công', {
            success: true,
            message: 'Checkout intent created',
            data: {
              orderId: 'NX-ORD-8021',
              items: [{ productId: '1', quantity: 2 }],
              shippingAddress: 'Khu Công Nghệ Cao, TP.HCM',
              clientSecret: 'pi_test_secret_123',
            },
          }),
        },
      },
    },
    '/api/v1/orders/{id}': {
      get: {
        tags: ['Support Staff / Tra cứu đơn hàng'],
        summary: 'Chi tiết hồ sơ đơn hàng & diễn biến lịch sử (Timeline)',
        description: `${PRIVATE} Yêu cầu token hợp lệ (SUPPORT_STAFF, ADMIN, hoặc chủ sở hữu đơn hàng).`,
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Mã đơn hàng (Order ID)',
            schema: { type: 'string', example: 'NX-ORD-8021' },
          },
        ],
        responses: {
          200: jsonResponse('Thông tin hồ sơ chi tiết đơn hàng', {
            success: true,
            data: {
              id: 'NX-ORD-8021',
              buyer: 'Minh Anh',
              email: 'minhanh@example.com',
              seller: 'Nexus Audio',
              product: 'Tai nghe không dây Nexus Air',
              total: 1290000,
              status: 'Chờ xử lý',
              statusCode: 'PENDING',
              date: '18/10/2026',
              tracking: 'GHN8829103VN',
              items: [
                {
                  productId: 'prod_audio_01',
                  name: 'Tai nghe không dây Nexus Air',
                  quantity: 1,
                  price: 1290000,
                  total: 1290000,
                },
              ],
              timeline: [
                { title: 'Đơn hàng được tạo', status: 'done', timestamp: '18/10/2026 · 09:12' },
                {
                  title: 'Đã xác nhận thanh toán',
                  status: 'done',
                  timestamp: '18/10/2026 · 09:14',
                },
                {
                  title: 'Chờ người bán xử lý',
                  status: 'current',
                  timestamp: '18/10/2026 · 14:30',
                },
                { title: 'Giao hàng hoàn tất', status: 'pending' },
              ],
            },
          }),
          401: unauthorized,
          403: forbidden,
          404: errorResponse(
            'Không tìm thấy đơn hàng',
            'Order with ID "NX-ORD-8021" was not found.',
          ),
        },
      },
    },
    '/api/v1/orders/{id}/cancel': {
      post: {
        tags: ['Support Staff / Thao tác xử lý'],
        summary: 'Hủy đơn hàng trong trường hợp khiếu nại hoặc tranh chấp',
        description: `${PRIVATE} Yêu cầu quyền ORDER.CANCEL (SUPPORT_STAFF hoặc ADMIN).`,
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Mã đơn hàng cần hủy',
            schema: { type: 'string', example: 'NX-ORD-8021' },
          },
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  reason: { type: 'string', example: 'Khách hàng yêu cầu hủy qua hotline' },
                },
              },
            },
          },
        },
        responses: {
          200: jsonResponse('Hủy đơn hàng thành công', {
            success: true,
            message: 'Đơn hàng NX-ORD-8021 đã được hủy thành công bởi nhân viên hỗ trợ.',
            data: { id: 'NX-ORD-8021', status: 'CANCELLED' },
          }),
          401: unauthorized,
          403: forbidden,
          404: errorResponse(
            'Không tìm thấy đơn hàng',
            'Order with ID "NX-ORD-8021" was not found.',
          ),
        },
      },
    },
    '/api/v1/orders/{id}/refund': {
      post: {
        tags: ['Support Staff / Thao tác xử lý'],
        summary: 'Hoàn tiền cho khách hàng khi tranh chấp được duyệt',
        description: `${PRIVATE} Yêu cầu quyền ORDER.REFUND (SUPPORT_STAFF hoặc ADMIN).`,
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Mã đơn hàng cần hoàn tiền',
            schema: { type: 'string', example: 'NX-ORD-8021' },
          },
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  reason: { type: 'string', example: 'Sản phẩm lỗi không đúng mô tả - CS-4021' },
                },
              },
            },
          },
        },
        responses: {
          200: jsonResponse('Hoàn tiền thành công', {
            success: true,
            message: 'Đã hoàn tiền thành công cho đơn hàng NX-ORD-8021.',
            data: { id: 'NX-ORD-8021', status: 'REFUNDED' },
          }),
          401: unauthorized,
          403: forbidden,
          404: errorResponse(
            'Không tìm thấy đơn hàng',
            'Order with ID "NX-ORD-8021" was not found.',
          ),
        },
      },
    },
    '/api/v1/orders/{id}/refund/cancel': {
      post: {
        tags: ['Support Staff / Thao tác xử lý'],
        summary: 'Từ chối / Hủy yêu cầu hoàn tiền cho đơn hàng',
        description: `${PRIVATE} Yêu cầu quyền ORDER.REFUND (SUPPORT_STAFF hoặc ADMIN). Chuyển trạng thái khiếu nại về REFUND_REJECTED / REFUND_CANCELLED, khôi phục đơn hàng về trạng thái trước đó và ghi nhận lý do vào audit timeline (SRS 2.3, 3.1.2).`,
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Mã đơn hàng cần từ chối hoàn tiền',
            schema: { type: 'string', example: 'NX-ORD-8021' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['reason'],
                properties: {
                  reason: {
                    type: 'string',
                    example: 'Sản phẩm đã qua sử dụng quá 30 ngày, từ chối hoàn tiền.',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: jsonResponse('Từ chối hoàn tiền thành công', {
            success: true,
            message: 'Đã từ chối yêu cầu hoàn tiền thành công.',
            data: { id: 'NX-ORD-8021', status: 'DELIVERED' },
          }),
          400: errorResponse(
            'Thiếu thông tin',
            'Lý do từ chối hoàn tiền (reason) không được để trống.',
          ),
          401: unauthorized,
          403: forbidden,
          404: errorResponse(
            'Không tìm thấy đơn hàng',
            'Order with ID "NX-ORD-8021" was not found.',
          ),
        },
      },
    },
  },
};

export const fulfillmentSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Nexus - Fulfillment & Shipping Service (Vận chuyển & Support)',
    version: '1.0.0',
    description:
      'Dịch vụ Quản lý vận chuyển, Tra cứu mã vận đơn các hãng (GHN, GHTK, Viettel Post) & Bảng tin ca trực Support Staff.',
  },
  servers: [{ url: 'http://localhost:4000', description: 'API Gateway (Cổng 4000)' }],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Nhập JWT token của SUPPORT_STAFF hoặc ADMIN',
      },
    },
  },
  paths: {
    '/api/v1/fulfillments/shipments': {
      get: {
        tags: ['Support Staff / Tra cứu vận đơn'],
        summary: 'Tra cứu danh sách vận đơn (Search & Filter theo Hãng, Mã, Người nhận)',
        description: `${PRIVATE} Yêu cầu quyền SHIPPING.VIEW_SHIPMENT (SUPPORT_STAFF hoặc ADMIN).`,
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'query',
            in: 'query',
            required: false,
            description: 'Từ khóa tìm kiếm (mã vận đơn, mã đơn, người nhận, hãng)',
            schema: { type: 'string', example: 'GHN8829103VN' },
          },
          {
            name: 'carrier',
            in: 'query',
            required: false,
            description: 'Lọc hãng vận chuyển (GHN, GHTK, VNPOST, VIETTEL_POST)',
            schema: { type: 'string', example: 'GHN' },
          },
          {
            name: 'status',
            in: 'query',
            required: false,
            description: 'Lọc trạng thái vận đơn',
            schema: { type: 'string', example: 'IN_TRANSIT' },
          },
        ],
        responses: {
          200: jsonResponse('Danh sách vận đơn', {
            success: true,
            data: [
              {
                code: 'GHN8829103VN',
                order: 'NX-ORD-8021',
                carrier: 'GHN',
                recipient: 'Minh Anh',
                status: 'Đang lấy hàng',
                statusCode: 'PICKED',
                updated: '18/10/2026 · 14:30',
                city: 'TP. Hồ Chí Minh',
              },
            ],
            pagination: { total: 3, page: 1, limit: 10, totalPages: 1 },
          }),
          401: unauthorized,
          403: forbidden,
        },
      },
    },
    '/api/v1/fulfillments/shipments/{id}': {
      get: {
        tags: ['Support Staff / Tra cứu vận đơn'],
        summary: 'Chi tiết vận đơn theo ID hoặc Mã vận đơn (Tracking Code)',
        description: `${PRIVATE} Hỗ trợ tra cứu nhanh bằng cả id hệ thống hoặc mã vận đơn (VD: GHN8829103VN).`,
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Mã vận đơn hoặc Shipment ID',
            schema: { type: 'string', example: 'GHN8829103VN' },
          },
        ],
        responses: {
          200: jsonResponse('Chi tiết hành trình vận chuyển', {
            success: true,
            data: {
              code: 'GHN8829103VN',
              order: 'NX-ORD-8021',
              carrier: 'GHN',
              recipient: 'Minh Anh',
              city: 'TP. Hồ Chí Minh',
              status: 'Đang lấy hàng',
              statusCode: 'PICKED',
              updated: '18/10/2026 · 14:30',
              currentLocation: 'TP. Hồ Chí Minh · Trung tâm phân loại Tân Bình',
              timeline: [
                { title: 'Đã tạo vận đơn', status: 'done', timestamp: '18/10/2026 · 09:12' },
                { title: 'Đã lấy hàng', status: 'done', timestamp: '18/10/2026 · 14:30' },
                { title: 'Đang giao', status: 'current', timestamp: '18/10/2026 · 14:30' },
                { title: 'Đã giao', status: 'pending' },
              ],
            },
          }),
          401: unauthorized,
          403: forbidden,
          404: errorResponse('Không tìm thấy vận đơn', 'Shipment "GHN8829103VN" was not found.'),
        },
      },
    },
    '/api/v1/fulfillments/shipments/{id}/status': {
      patch: {
        tags: ['Support Staff / Thao tác xử lý'],
        summary: 'Cập nhật trạng thái và vị trí hành trình vận đơn',
        description: `${PRIVATE} Yêu cầu quyền SHIPPING.UPDATE_STATUS (SUPPORT_STAFF, ADMIN, hoặc CARRIER_AGENT).`,
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Mã vận đơn hoặc Shipment ID',
            schema: { type: 'string', example: 'GHN8829103VN' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', example: 'OUT_FOR_DELIVERY' },
                  location: { type: 'string', example: 'Bưu cục Quận 1 · Đang phát cho khách' },
                  note: { type: 'string', example: 'Bưu tá liên hệ trước khi phát hàng' },
                },
              },
            },
          },
        },
        responses: {
          200: jsonResponse('Cập nhật trạng thái thành công', {
            success: true,
            message: 'Cập nhật trạng thái vận đơn thành công.',
            data: {
              code: 'GHN8829103VN',
              status: 'Đang phát hàng',
              statusCode: 'OUT_FOR_DELIVERY',
              currentLocation: 'Bưu cục Quận 1 · Đang phát cho khách',
            },
          }),
          401: unauthorized,
          403: forbidden,
          404: errorResponse('Không tìm thấy vận đơn', 'Shipment "GHN8829103VN" was not found.'),
        },
      },
    },
    '/api/v1/fulfillments/shipments/{id}/override': {
      patch: {
        tags: ['Support Staff / Thao tác xử lý'],
        summary: 'Can thiệp thủ công (Manual Override) thông tin hãng, mã vận đơn, địa chỉ giao',
        description: `${PRIVATE} Yêu cầu quyền SHIPPING.MANUAL_OVERRIDE (SUPPORT_STAFF hoặc ADMIN).`,
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Mã vận đơn hoặc Shipment ID',
            schema: { type: 'string', example: 'GHN8829103VN' },
          },
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  carrier: { type: 'string', example: 'GHN' },
                  trackingCode: { type: 'string', example: 'GHN8829103VN' },
                  shippingAddress: {
                    type: 'string',
                    example: '12 Nguyễn Huệ, Phường Bến Nghé, Quận 1',
                  },
                  city: { type: 'string', example: 'TP. Hồ Chí Minh' },
                  status: { type: 'string', example: 'IN_TRANSIT' },
                  reason: {
                    type: 'string',
                    example: 'Điều chỉnh theo yêu cầu khiếu nại của khách hàng',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: jsonResponse('Điều chỉnh thành công', {
            success: true,
            message: 'Điều chỉnh thông tin vận đơn thủ công thành công.',
            data: {
              code: 'GHN8829103VN',
              city: 'TP. Hồ Chí Minh',
              status: 'Đang giao',
            },
          }),
          401: unauthorized,
          403: forbidden,
          404: errorResponse('Không tìm thấy vận đơn', 'Shipment "GHN8829103VN" was not found.'),
        },
      },
    },
    '/api/v1/support/dashboard/summary': {
      get: {
        tags: ['Support Staff / Dashboard Tổng quan'],
        summary: 'Thống kê tổng quan ca trực Support Staff (Dashboard Summary)',
        description: `${PRIVATE} Trả về số liệu ca trực: Đang chờ xử lý, Đang xử lý, Đã giải quyết hôm nay, Vận đơn cần theo dõi và Work Queue các ca trực gần nhất.`,
        security: [{ BearerAuth: [] }],
        responses: {
          200: jsonResponse('Số liệu tổng quan ca trực', {
            success: true,
            data: {
              pendingCases: 8,
              processingCases: 5,
              resolvedToday: 17,
              flaggedShipments: 4,
              metrics: {
                highPriorityCount: 3,
                nearOverdueCount: 2,
                averageHandlingTimeMinutes: 24,
                updatedTodayCount: 2,
              },
              recentCases: [
                {
                  id: 'CS-4021',
                  type: 'Yêu cầu hoàn tiền',
                  order: 'NX-ORD-8021',
                  customer: 'Minh Anh',
                  reason: 'Sản phẩm chưa đúng mô tả',
                  priority: 'Cao',
                  age: '12 phút',
                },
              ],
            },
          }),
          401: unauthorized,
          403: forbidden,
        },
      },
    },
    '/api/v1/fulfillments/inventory': {
      get: {
        tags: ['Inventory / Quản lý tồn kho'],
        summary: 'Tra cứu tồn kho chuẩn SKU',
        description: `${PRIVATE} Dành cho SELLER và SUPPORT_STAFF (SRS 2.6, 3.6.1). Trả về dữ liệu chuẩn: { sku, productName, warehouseId, warehouseName, onHand, reserved, available } với available = onHand - reserved.`,
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'sku',
            in: 'query',
            required: false,
            description: 'Lọc theo mã SKU hoặc tên sản phẩm',
            schema: { type: 'string', example: 'NX-IPHONE-15-BLUE' },
          },
          {
            name: 'warehouseId',
            in: 'query',
            required: false,
            description: 'Lọc theo kho (Mặc định: WH_001)',
            schema: { type: 'string', example: 'WH_001' },
          },
          {
            name: 'page',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 10 },
          },
        ],
        responses: {
          200: jsonResponse('Danh sách tồn kho theo SKU', {
            success: true,
            data: [
              {
                sku: 'NX-IPHONE-15-BLUE',
                productName: 'iPhone 15 128GB Xanh Lam',
                warehouseId: 'WH_001',
                warehouseName: 'Kho Tổng TP.HCM',
                onHand: 150,
                reserved: 25,
                available: 125,
                unavailableQuantity: 2,
                updatedAt: '2026-11-01T02:00:00.000Z',
              },
            ],
            pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
          }),
          401: unauthorized,
          403: forbidden,
        },
      },
    },
    '/api/v1/fulfillments/inventory/adjust': {
      post: {
        tags: ['Inventory / Quản lý tồn kho'],
        summary: 'Điều chỉnh số lượng tồn kho (STOCK_IN, STOCK_OUT, DAMAGE)',
        description: `${PRIVATE} Dành cho SELLER và ADMIN (SRS 3.6.1). Phục vụ kiểm kê thực tế tại kho, cập nhật số lượng onHand, lưu sổ cái bất biến (Inventory Ledger) và chống bán âm (ALLOW_OVERSELL: false).`,
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['sku', 'adjustmentType', 'quantity', 'reason'],
                properties: {
                  sku: { type: 'string', example: 'NX-IPHONE-15-BLUE' },
                  warehouseId: { type: 'string', example: 'WH_001' },
                  adjustmentType: {
                    type: 'string',
                    enum: ['STOCK_IN', 'STOCK_OUT', 'DAMAGE'],
                    example: 'STOCK_IN',
                  },
                  quantity: { type: 'integer', example: 20 },
                  reason: {
                    type: 'string',
                    example: 'Kiểm kê nhập bổ sung lô hàng mới vào kho',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: jsonResponse('Điều chỉnh tồn kho thành công', {
            success: true,
            message: "Đã điều chỉnh tồn kho thành công theo hình thức 'STOCK_IN'.",
            data: {
              sku: 'NX-IPHONE-15-BLUE',
              productName: 'iPhone 15 128GB Xanh Lam',
              warehouseId: 'WH_001',
              warehouseName: 'Kho Tổng TP.HCM',
              onHand: 170,
              reserved: 25,
              available: 145,
            },
            ledgerId: 'led_1793472000000_abcd',
          }),
          400: errorResponse(
            'Dữ liệu không hợp lệ hoặc vượt hạn mức tồn kho',
            'Không thể xuất kho vượt quá số lượng khả dụng (ALLOW_OVERSELL: false).',
          ),
          401: unauthorized,
          403: forbidden,
        },
      },
    },
    '/api/v1/support/cases': {
      get: {
        tags: ['Support Staff / Quản lý khiếu nại'],
        summary: 'Tra cứu danh sách Ticket / Khiếu nại thực tế',
        description: `${PRIVATE} Dành cho SUPPORT_STAFF và ADMIN (SRS 2.3, 3.1.2). Thay thế toàn bộ dữ liệu mock tạm thời ở giao diện Support Dashboard.`,
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'userId',
            in: 'query',
            required: false,
            description: 'Lọc theo mã người dùng',
            schema: { type: 'string', example: 'usr_01hqz789abc' },
          },
          {
            name: 'status',
            in: 'query',
            required: false,
            description:
              'Lọc theo trạng thái (PENDING, IN_PROGRESS, RESOLVED, REJECTED, ESCALATED)',
            schema: { type: 'string', example: 'PENDING' },
          },
          {
            name: 'priority',
            in: 'query',
            required: false,
            description: 'Lọc theo độ ưu tiên (Cao, Trung bình, Thấp)',
            schema: { type: 'string', example: 'Cao' },
          },
          {
            name: 'page',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 10 },
          },
        ],
        responses: {
          200: jsonResponse('Danh sách hồ sơ khiếu nại', {
            success: true,
            data: [
              {
                id: 'CS-4021',
                type: 'Yêu cầu hoàn tiền',
                order: 'NX-ORD-8021',
                orderId: 'ord_01hqz555abc',
                customer: 'Minh Anh',
                reason: 'Sản phẩm chưa đúng mô tả',
                priority: 'Cao',
                age: '12 phút',
                status: 'PENDING',
              },
            ],
            pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
          }),
          401: unauthorized,
          403: forbidden,
        },
      },
    },
    '/api/v1/support/cases/{id}/resolve': {
      post: {
        tags: ['Support Staff / Quản lý khiếu nại'],
        summary: 'Cập nhật kết quả giải quyết khiếu nại (Resolve Case)',
        description: `${PRIVATE} Dành cho SUPPORT_STAFF và ADMIN (SRS 2.3, 3.1.2). Duyệt (APPROVED), từ chối (REJECTED) hoặc chuyển cấp (ESCALATED) tranh chấp giữa Buyer và Seller.`,
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Mã hồ sơ khiếu nại',
            schema: { type: 'string', example: 'CS-4021' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['resolution', 'note'],
                properties: {
                  resolution: {
                    type: 'string',
                    enum: ['APPROVED', 'REJECTED', 'ESCALATED'],
                    example: 'APPROVED',
                  },
                  note: {
                    type: 'string',
                    example: 'Đã xác thực sản phẩm không đúng mô tả, đồng ý xử lý khiếu nại.',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: jsonResponse('Cập nhật kết quả khiếu nại thành công', {
            success: true,
            message: "Đã cập nhật trạng thái khiếu nại thành 'RESOLVED'.",
            data: {
              id: 'CS-4021',
              status: 'RESOLVED',
              resolutionNote: 'Đã xác thực sản phẩm không đúng mô tả, đồng ý xử lý khiếu nại.',
            },
          }),
          400: errorResponse(
            'Dữ liệu không hợp lệ',
            'Kết quả xử lý không hợp lệ hoặc thiếu ghi chú note.',
          ),
          401: unauthorized,
          403: forbidden,
          404: errorResponse('Không tìm thấy khiếu nại', 'Hồ sơ khiếu nại không tồn tại.'),
        },
      },
    },
  },
};
