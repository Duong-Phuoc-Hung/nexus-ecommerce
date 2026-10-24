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
              role: 'BUYER',
              status: 'ACTIVE',
              reputationScore: 100,
            },
          }),
          401: unauthorized,
          403: forbidden,
        },
      },
    },
    '/api/v1/users': {
      get: {
        tags: ['Users & Profile'],
        summary: 'Tìm kiếm khách hàng bằng Email',
        description: 'Truy vấn thông tin người dùng thông qua địa chỉ Email.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'email',
            in: 'query',
            required: true,
            description: 'Địa chỉ Email của khách hàng cần tìm',
            schema: { type: 'string', example: 'buyer@gmail.com' },
          },
        ],
        responses: {
          200: jsonResponse('Tìm thấy khách hàng', {
            success: true,
            data: {
              id: 'a0000000-0000-0000-0000-000000000003',
              email: 'buyer@gmail.com',
              role: 'BUYER',
            },
          }),
          401: unauthorized,
          403: forbidden,
          404: errorResponse('Không tìm thấy', 'User with identifier "x@gmail.com" was not found.'),
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
    '/api/v1/products/mine': {
      get: {
        tags: ['Products'],
        summary: 'Xem kho hàng (Seller)',
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
        summary: 'Danh sách tất cả sản phẩm (khách hàng)',
        description: `${PUBLIC} Method: GET. Truy xuất toàn bộ sản phẩm đang được bày bán công khai ngoài trang chủ (không cần đăng nhập).`,
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
        summary: 'Tạo sản phẩm mới (Seller)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'description', 'categoryId', 'price'],
                properties: {
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
        summary: 'Cập nhật sản phẩm (Seller)',
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
        summary: 'Xóa sản phẩm (Seller)',
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
    '/api/v1/categories': {
      get: {
        tags: ['Categories'],
        summary: 'Lấy danh sách cây danh mục ngành hàng',
        description: `${PUBLIC} Method: GET. Lấy danh sách ngành hàng (hỗ trợ tham số query ?tree=true để dựng cây phân cấp cha-con tối đa 3 cấp theo SRS 3.3).`,
        parameters: [
          {
            name: 'tree',
            in: 'query',
            required: false,
            schema: { type: 'boolean', default: false },
            description:
              'Nếu true, trả về cấu trúc cây danh mục đa cấp (có mảng children). Mặc định false (danh sách phẳng).',
          },
        ],
        responses: {
          200: jsonResponse('Danh sách danh mục', {
            success: true,
            data: [
              {
                id: '1',
                name: 'Thiết bị điện tử',
                slug: 'thiet-bi-dien-tu',
                level: 1,
                isActive: true,
                displayOrder: 1,
                children: [
                  {
                    id: '10',
                    name: 'Điện thoại & Tablet',
                    slug: 'dien-thoai-tablet',
                    level: 2,
                    isActive: true,
                    displayOrder: 1,
                    children: [],
                  },
                ],
              },
            ],
          }),
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
    title: 'Nexus - Commerce Service (Đơn hàng)',
    version: '1.0.0',
    description: 'Dịch vụ quản lý Giỏ hàng, Đặt hàng (Checkout) & Hóa đơn.',
  },
  servers: [{ url: '/', description: 'API Gateway (Same Origin)' }],
  components: commonComponents,
  paths: {
    '/api/v1/orders/checkout': {
      post: {
        tags: ['Orders & Checkout'],
        summary: 'Tạo đơn hàng & Thanh toán (Checkout)',
        description: `Header: Content-Type: application/json. LƯU Ý: hiện tại Commerce Service chưa kiểm tra token và chưa validate body (chế độ Skeleton).`,
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
          201: jsonResponse('Tạo đơn hàng thành công (Skeleton)', {
            success: true,
            message: 'Checkout intent created (Skeleton mode)',
            data: {
              orderId: 'ord_1792593649250',
              items: [{ productId: '1', quantity: 2 }],
              shippingAddress: 'Khu Công Nghệ Cao, TP.HCM',
              clientSecret: 'pi_skeleton_secret_test_123',
            },
          }),
        },
      },
    },
    '/api/v1/orders/{id}': {
      get: {
        tags: ['Orders & Checkout'],
        summary: 'Tra cứu thông tin đơn hàng theo ID',
        description: `${PUBLIC} (hiện chưa yêu cầu token) Method: GET.`,
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Mã đơn hàng (Order ID)',
            schema: { type: 'string', example: '1' },
          },
        ],
        responses: {
          200: jsonResponse('Thông tin đơn hàng', {
            success: true,
            data: {
              id: 'ord_01hqz555abc',
              buyerId: 'usr_01hqz789abc',
              sellerId: 'usr_01hqz333sel',
              totalAmount: 399.99,
              status: 'PAID',
              itemsCount: 1,
            },
          }),
          404: errorResponse('Không tìm thấy đơn hàng', 'Order with ID "1" was not found.'),
        },
      },
    },
  },
};
