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

export const userSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Nexus - User & Authentication Service',
    version: '1.0.0',
    description:
      'Dịch vụ quản lý Người dùng, Đăng nhập (Auth) & Phân quyền (RBAC). Hỗ trợ UUID và tìm kiếm theo Email.',
  },
  servers: [{ url: 'http://localhost:4000', description: 'API Gateway (Cổng 4000)' }],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Nhập JWT token sau khi đăng nhập',
      },
    },
  },
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
  servers: [{ url: 'http://localhost:4000', description: 'API Gateway (Cổng 4000)' }],
  paths: {
    '/api/v1/categories': {
      get: {
        tags: ['Categories'],
        summary: 'Lấy danh mục sản phẩm (Hỗ trợ cấu trúc Cây phân cấp đa tầng)',
        description:
          'Truy xuất danh mục cho thanh menu, bộ lọc danh mục và form đăng bán. Truyền tree=true để nhận dạng cây 3 cấp.',
        parameters: [
          {
            name: 'tree',
            in: 'query',
            required: false,
            description:
              'Nếu là true, trả về dạng cây lồng nhau (children). Nếu false, trả về danh sách phẳng.',
            schema: { type: 'boolean', default: false },
          },
        ],
        responses: { 200: { description: 'Danh sách hoặc Cây danh mục phân cấp' } },
      },
    },
    '/api/v1/categories/{id}': {
      get: {
        tags: ['Categories'],
        summary: 'Xem chi tiết danh mục theo ID hoặc Slug',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description:
              'ID danh mục (1, 2, 10...) hoặc Slug (thiet-bi-dien-tu, dien-thoai-tablet)',
            schema: { type: 'string', example: '1' },
          },
        ],
        responses: {
          200: { description: 'Chi tiết danh mục' },
          404: { description: 'Không tìm thấy' },
        },
      },
    },
    '/api/v1/products': {
      get: {
        tags: ['Products'],
        '/api/v1/products': {
          get: {
            tags: ['Products'],
            summary: 'Lấy danh sách tất cả sản phẩm (Có phân trang, lọc, sắp xếp)',
            description: `${PUBLIC} Method: GET. Truy xuất toàn bộ sản phẩm đang được bày bán có hỗ trợ phân trang và lọc theo danh mục, giá, tình trạng.`,
            parameters: [
              {
                name: 'page',
                in: 'query',
                schema: { type: 'integer', default: 1 },
                description: 'Số trang hiện tại (mặc định: 1)',
              },
              {
                name: 'limit',
                in: 'query',
                schema: { type: 'integer', default: 12 },
                description: 'Số lượng sản phẩm mỗi trang (mặc định: 12)',
              },
              {
                name: 'categoryId',
                in: 'query',
                schema: { type: 'string' },
                description: 'Lọc theo danh mục (ID hoặc Slug)',
              },
              {
                name: 'minPrice',
                in: 'query',
                schema: { type: 'number' },
                description: 'Mức giá tối thiểu',
              },
              {
                name: 'maxPrice',
                in: 'query',
                schema: { type: 'number' },
                description: 'Mức giá tối đa',
              },
              {
                name: 'condition',
                in: 'query',
                schema: { type: 'string', enum: ['NEW', 'LIKE_NEW', 'USED', 'REFURBISHED'] },
                description: 'Tình trạng hàng hóa',
              },
              {
                name: 'sort',
                in: 'query',
                schema: {
                  type: 'string',
                  enum: ['featured', 'price-asc', 'price-desc', 'newest', 'oldest'],
                },
                description: 'Tiêu chí sắp xếp',
              },
            ],
            responses: {
              200: jsonResponse('Danh sách sản phẩm có phân trang', {
                success: true,
                data: [
                  {
                    id: '1',
                    sellerId: '01a15822-3fd0-7b39-ad01-f11da72d5b80',
                    sellerName: 'Trần Thị Seller',
                    categoryId: '100',
                    categoryName: 'Điện thoại & Tablet',
                    title: 'iPhone 15 Pro Max 256GB Titan Tự Nhiên',
                    description: 'iPhone 15 Pro Max chính hãng VN/A, bảo hành 12 tháng',
                    price: 29990000,
                    currency: 'VND',
                    stockQuantity: 10,
                    status: 'ACTIVE',
                    images: ['https://example.com/iphone15.jpg'],
                    primaryImage: 'https://example.com/iphone15.jpg',
                    condition: 'NEW',
                    slug: 'iphone-15-pro-max-256gb-titan-tu-nhien',
                    allowAuction: false,
                    attributes: { Color: 'Natural Titanium', Storage: '256GB' },
                  },
                ],
              }),
            },
          },
          post: {
            tags: ['Products'],
            summary: 'Tạo sản phẩm mới (Dành cho Người bán - SELLER hoặc ADMIN)',
            description:
              'Đăng sản phẩm lên sàn giao dịch. Yêu cầu Bearer Token của tài khoản có vai trò SELLER hoặc ADMIN.',
            security: [{ BearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['title', 'description', 'categoryId', 'price', 'stockQuantity'],
                    properties: {
                      title: {
                        type: 'string',
                        example: 'Bàn phím cơ không dây Custom Nexus MK-01',
                      },
                      description: {
                        type: 'string',
                        example:
                          'Bàn phím cơ layout 75%, kết nối 3 chế độ Bluetooth 5.0 / 2.4GHz / Type-C',
                      },
                      categoryId: { type: 'string', example: '1' },
                      price: { type: 'number', example: 1850000 },
                      stockQuantity: { type: 'integer', example: 25 },
                      condition: {
                        type: 'string',
                        enum: ['NEW', 'LIKE_NEW', 'USED', 'REFURBISHED'],
                        example: 'NEW',
                      },
                      images: {
                        type: 'array',
                        items: { type: 'string' },
                        example: ['https://example.com/p1.jpg'],
                      },
                      allowAuction: { type: 'boolean', example: false },
                      attributes: {
                        type: 'object',
                        example: { Switch: 'Gateron Yellow Pro', Keycap: 'PBT Double-shot' },
                      },
                    },
                  },
                },
              },
            },
            responses: {
              201: { description: 'Tạo sản phẩm thành công' },
              400: { description: 'Dữ liệu không hợp lệ' },
              401: { description: 'Chưa đăng nhập' },
              403: { description: 'Không có quyền Seller/Admin' },
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
                    sellerId: '01a15822-3fd0-7b39-ad01-f11da72d5b80',
                    sellerName: 'Trần Thị Seller',
                    categoryId: '100',
                    title: 'iPhone 15 Pro Max 256GB Titan Tự Nhiên',
                    price: 29990000,
                    currency: 'VND',
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
      patch: {
        tags: ['Products'],
        summary: 'Sửa sản phẩm (Kiểm tra quyền sở hữu và xử lý xung đột đồng thời)',
        description:
          'Cập nhật thông tin sản phẩm. Chỉ người bán sở hữu sản phẩm hoặc ADMIN mới được sửa. Hỗ trợ Optimistic Concurrency Control qua expectedUpdatedAt để chống xung đột.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Mã sản phẩm cần sửa',
            schema: { type: 'string', example: '1' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string', example: 'Tên sản phẩm cập nhật' },
                  description: { type: 'string' },
                  price: { type: 'number', example: 1750000 },
                  stockQuantity: { type: 'integer', example: 30 },
                  status: { type: 'string', enum: ['ACTIVE', 'DRAFT', 'ARCHIVED', 'OUT_OF_STOCK'] },
                  expectedUpdatedAt: {
                    type: 'string',
                    example: '2026-10-21T08:00:00.000Z',
                    description:
                      'Thời điểm cập nhật cũ để phát hiện xung đột đồng thời (HTTP 409 Conflict)',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Cập nhật thành công' },
          400: { description: 'Dữ liệu không hợp lệ' },
          401: { description: 'Chưa đăng nhập' },
          403: { description: 'Không có quyền sở hữu sản phẩm này' },
          404: { description: 'Không tìm thấy sản phẩm' },
          409: { description: 'Xung đột đồng thời (Dữ liệu đã bị bên khác sửa trước)' },
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
  servers: [{ url: 'http://localhost:4000', description: 'API Gateway (Cổng 4000)' }],
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
  servers: [{ url: 'http://localhost:4000', description: 'API Gateway (Cổng 4000)' }],
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
