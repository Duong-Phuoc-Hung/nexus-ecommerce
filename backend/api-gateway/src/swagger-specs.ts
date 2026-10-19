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
        description:
          'Đăng nhập bằng Email và Password, trả về thông tin User kèm JWT Token. Tài khoản mẫu (Mật khẩu: 123456): admin@gmail.com (Admin), seller@gmail.com (Seller), buyer@gmail.com (Buyer), staff@gmail.com (Support Staff).',
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
        responses: { 200: { description: 'Đăng nhập thành công' } },
      },
    },
    '/api/v1/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Đăng ký tài khoản mới',
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
        responses: { 201: { description: 'Đăng ký thành công' } },
      },
    },
    '/api/v1/auth/forgot-password': {
      post: {
        tags: ['Authentication'],
        summary: 'Yêu cầu đặt lại mật khẩu',
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
        responses: { 200: { description: 'Tạo mã reset thành công' } },
      },
    },
    '/api/v1/auth/reset-password': {
      post: {
        tags: ['Authentication'],
        summary: 'Đặt lại mật khẩu mới bằng reset token',
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
        responses: { 200: { description: 'Đổi mật khẩu thành công' } },
      },
    },
    '/api/v1/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Đăng xuất tài khoản',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Đăng xuất thành công' } },
      },
    },
    '/api/v1/auth/roles': {
      get: {
        tags: ['Authentication'],
        summary: 'Danh sách các quyền (Permissions) theo vai trò',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Thành công' } },
      },
    },
    '/api/v1/users/profile': {
      get: {
        tags: ['Users & Profile'],
        summary: 'Xem hồ sơ của chính mình (Từ JWT token)',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Thông tin cá nhân' } },
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
        responses: { 200: { description: 'Tìm thấy khách hàng' } },
      },
    },
    '/api/v1/users/{id}': {
      get: {
        tags: ['Users & Profile'],
        summary: 'Xem thông tin người dùng theo UUID hoặc Email',
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
        responses: { 200: { description: 'Thông tin người dùng' } },
      },
    },
    '/api/v1/users/{id}/role': {
      put: {
        tags: ['Users & Profile'],
        summary: 'Cập nhật vai trò (Role) cho tài khoản',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'UUID của người dùng cần đổi vai trò',
            schema: { type: 'string', example: 'a0000000-0000-0000-0000-000000000003' },
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
          200: { description: 'Cập nhật vai trò thành công' },
          400: { description: 'Vai trò không hợp lệ' },
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
        description: 'Truy xuất toàn bộ sản phẩm đang được bày bán.',
        responses: { 200: { description: 'Danh sách sản phẩm' } },
      },
    },
    '/api/v1/products/{id}': {
      get: {
        tags: ['Products'],
        summary: 'Xem chi tiết sản phẩm theo ID hoặc Slug',
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
        responses: { 200: { description: 'Chi tiết sản phẩm' } },
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
        responses: { 200: { description: 'Danh sách phiên đấu giá' } },
      },
    },
    '/api/v1/auctions/{id}': {
      get: {
        tags: ['Auctions'],
        summary: 'Xem chi tiết một phiên đấu giá',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Mã phòng đấu giá (Auction ID)',
            schema: { type: 'string', example: '1' },
          },
        ],
        responses: { 200: { description: 'Chi tiết phòng đấu giá' } },
      },
    },
    '/api/v1/auctions/{id}/bids': {
      post: {
        tags: ['Auctions'],
        summary: 'Trả giá / Đặt giá thầu (Place Bid)',
        description: 'Gửi lượt trả giá mới vào phiên đấu giá.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Mã phòng đấu giá (Auction ID)',
            schema: { type: 'string', example: '1' },
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
                  bidderId: { type: 'string', example: 'a0000000-0000-0000-0000-000000000003' },
                  bidAmount: { type: 'number', example: 15000000 },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Trả giá thành công' } },
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
        responses: { 201: { description: 'Tạo đơn hàng thành công' } },
      },
    },
    '/api/v1/orders/{id}': {
      get: {
        tags: ['Orders & Checkout'],
        summary: 'Tra cứu thông tin đơn hàng theo ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Mã đơn hàng (Order ID)',
            schema: { type: 'string', example: '1' },
          },
        ],
        responses: { 200: { description: 'Thông tin đơn hàng' } },
      },
    },
  },
};
