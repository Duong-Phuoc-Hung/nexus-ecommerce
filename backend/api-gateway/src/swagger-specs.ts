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
    '/api/v1/products': {
      get: {
        tags: ['Products'],
        summary: 'Lấy danh sách tất cả sản phẩm',
        description: `${PUBLIC} Method: GET. Truy xuất toàn bộ sản phẩm đang được bày bán (không phân trang).`,
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
    title: 'Nexus - Commerce Service (Đơn hàng & Support)',
    version: '1.0.0',
    description:
      'Dịch vụ quản lý Giỏ hàng, Đặt hàng (Checkout), Hóa đơn & Xử lý khiếu nại (Support Staff).',
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
  },
};
