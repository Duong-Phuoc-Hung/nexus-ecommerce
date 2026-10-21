export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Nexus User & Auth Service API',
    version: '1.0.0',
    description:
      'Hệ thống API quản lý Người dùng, Xác thực (Auth) & Phân quyền (RBAC) - Project Nexus.',
  },
  servers: [
    {
      url: 'http://localhost:4001',
      description: 'User Service trực tiếp (Cổng 4001)',
    },
    {
      url: 'http://localhost:4000',
      description: 'API Gateway (Cổng 4000)',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Nhập JWT token sau khi đăng nhập (không cần gõ tiền tố Bearer)',
      },
    },
  },
  paths: {
    '/api/v1/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Đăng nhập tài khoản',
        description: 'Đăng nhập bằng Email và Password, trả về thông tin User kèm JWT Token.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: {
                    type: 'string',
                    example: 'buyer@gmail.com',
                  },
                  password: {
                    type: 'string',
                    example: '123456',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Đăng nhập thành công',
          },
          401: {
            description: 'Sai email hoặc mật khẩu',
          },
          423: {
            description: 'Tài khoản bị tạm khóa do nhập sai quá 5 lần',
          },
        },
      },
    },
    '/api/v1/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Đăng ký tài khoản mới',
        description: 'Tạo tài khoản Buyer mới với ID định dạng UUID 36 ký tự chuẩn.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'fullName', 'password'],
                properties: {
                  email: {
                    type: 'string',
                    example: 'khachhangmoi@gmail.com',
                  },
                  fullName: {
                    type: 'string',
                    example: 'Nguyễn Văn A',
                  },
                  password: {
                    type: 'string',
                    example: 'Password@123',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Đăng ký thành công',
          },
          400: {
            description: 'Dữ liệu không hợp lệ',
          },
          409: {
            description: 'Email đã tồn tại',
          },
        },
      },
    },
    '/api/v1/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Đăng xuất tài khoản',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Đăng xuất thành công',
          },
          401: {
            description: 'Token không hợp lệ hoặc đã hết hạn',
          },
        },
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
                  email: {
                    type: 'string',
                    example: 'buyer@gmail.com',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Mã reset token được tạo (trong môi trường dev sẽ trả kèm resetToken)',
          },
        },
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
                  token: {
                    type: 'string',
                    example: 'paste-reset-token-here',
                  },
                  newPassword: {
                    type: 'string',
                    example: 'NewPassword@123',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Đổi mật khẩu thành công',
          },
          400: {
            description: 'Token không hợp lệ hoặc mật khẩu quá ngắn',
          },
        },
      },
    },
    '/api/v1/auth/roles': {
      get: {
        tags: ['Authentication'],
        summary: 'Danh sách các quyền (Permissions) theo vai trò',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Thành công',
          },
        },
      },
    },
    '/api/v1/users/profile': {
      get: {
        tags: ['Users & Profile'],
        summary: 'Xem hồ sơ của chính mình (Từ JWT token)',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Thông tin hồ sơ cá nhân kèm UUID',
          },
          401: {
            description: 'Chưa đăng nhập',
          },
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
            schema: {
              type: 'string',
              example: 'buyer@gmail.com',
            },
          },
        ],
        responses: {
          200: {
            description: 'Tìm thấy khách hàng thành công',
          },
          404: {
            description: 'Không tìm thấy người dùng với email này',
          },
        },
      },
    },
    '/api/v1/users/{id}': {
      get: {
        tags: ['Users & Profile'],
        summary: 'Xem thông tin người dùng hoặc người bán theo UUID hoặc Email',
        description:
          'Có thể truyền chuỗi UUID (VD: 01a15822-43b8-78c3-a246-16bff78bc6e8) hoặc địa chỉ Gmail vào đường dẫn.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'UUID hoặc Gmail của người dùng',
            schema: {
              type: 'string',
              example: 'buyer@gmail.com',
            },
          },
        ],
        responses: {
          200: {
            description: 'Thông tin người dùng',
          },
          404: {
            description: 'Không tìm thấy người dùng',
          },
        },
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
            schema: {
              type: 'string',
              example: '01a15822-43b8-78c3-a246-16bff78bc6e8',
            },
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
                    enum: ['BUYER', 'SELLER', 'ADMIN'],
                    example: 'SELLER',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Cập nhật vai trò thành công',
          },
          400: {
            description: 'Vai trò không hợp lệ',
          },
        },
      },
    },
  },
};
