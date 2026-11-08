
Object.defineProperty(exports, "__esModule", { value: true });

const {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientRustPanicError,
  PrismaClientInitializationError,
  PrismaClientValidationError,
  NotFoundError,
  getPrismaClient,
  sqltag,
  empty,
  join,
  raw,
  skip,
  Decimal,
  Debug,
  objectEnumValues,
  makeStrictEnum,
  Extensions,
  warnOnce,
  defineDmmfProperty,
  Public,
  getRuntime
} = require('./runtime/library.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = PrismaClientKnownRequestError;
Prisma.PrismaClientUnknownRequestError = PrismaClientUnknownRequestError
Prisma.PrismaClientRustPanicError = PrismaClientRustPanicError
Prisma.PrismaClientInitializationError = PrismaClientInitializationError
Prisma.PrismaClientValidationError = PrismaClientValidationError
Prisma.NotFoundError = NotFoundError
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = sqltag
Prisma.empty = empty
Prisma.join = join
Prisma.raw = raw
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = Extensions.getExtensionContext
Prisma.defineExtension = Extensions.defineExtension

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}




  const path = require('path')

/**
 * Enums
 */
exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.CartScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  sessionId: 'sessionId',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CartItemScalarFieldEnum = {
  id: 'id',
  cartId: 'cartId',
  productId: 'productId',
  quantity: 'quantity',
  unitPrice: 'unitPrice',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OrderScalarFieldEnum = {
  id: 'id',
  orderCode: 'orderCode',
  buyerId: 'buyerId',
  sellerId: 'sellerId',
  totalAmount: 'totalAmount',
  shippingFee: 'shippingFee',
  discountAmount: 'discountAmount',
  status: 'status',
  shippingAddress: 'shippingAddress',
  checkoutSessionExpiresAt: 'checkoutSessionExpiresAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OrderItemScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  productId: 'productId',
  productTitle: 'productTitle',
  unitPrice: 'unitPrice',
  quantity: 'quantity',
  subtotal: 'subtotal',
  createdAt: 'createdAt'
};

exports.Prisma.PaymentScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  paymentMethod: 'paymentMethod',
  transactionId: 'transactionId',
  idempotencyKey: 'idempotencyKey',
  amount: 'amount',
  currency: 'currency',
  status: 'status',
  rawResponse: 'rawResponse',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InvoiceScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  invoiceCode: 'invoiceCode',
  pdfUrl: 'pdfUrl',
  issuedAt: 'issuedAt',
  createdAt: 'createdAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};


exports.Prisma.ModelName = {
  Cart: 'Cart',
  CartItem: 'CartItem',
  Order: 'Order',
  OrderItem: 'OrderItem',
  Payment: 'Payment',
  Invoice: 'Invoice'
};
/**
 * Create the Client
 */
const config = {
  "generator": {
    "name": "client",
    "provider": {
      "fromEnvVar": null,
      "value": "prisma-client-js"
    },
    "output": {
      "value": "D:\\CodeProject\\nexus-ecommerce\\nexus-ecommerce-main\\backend\\commerce-service\\src\\infrastructure\\database\\generated\\client",
      "fromEnvVar": null
    },
    "config": {
      "engineType": "library"
    },
    "binaryTargets": [
      {
        "fromEnvVar": null,
        "value": "windows",
        "native": true
      },
      {
        "fromEnvVar": null,
        "value": "linux-musl-openssl-3.0.x"
      }
    ],
    "previewFeatures": [],
    "sourceFilePath": "D:\\CodeProject\\nexus-ecommerce\\nexus-ecommerce-main\\backend\\commerce-service\\prisma\\schema.prisma",
    "isCustomOutput": true
  },
  "relativeEnvPaths": {
    "rootEnvPath": null
  },
  "relativePath": "../../../../../prisma",
  "clientVersion": "5.22.0",
  "engineVersion": "605197351a3c8bdd595af2d2a9bc3025bca48ea2",
  "datasourceNames": [
    "db"
  ],
  "activeProvider": "postgresql",
  "postinstall": false,
  "inlineDatasources": {
    "db": {
      "url": {
        "fromEnvVar": "DATABASE_URL",
        "value": null
      }
    }
  },
  "inlineSchema": "// =============================================================================\n// Project Nexus - Commerce Service Prisma Schema (SRS 3.4)\n// Database: PostgreSQL (nexus_commerce_db - Port 5434)\n// =============================================================================\n\ngenerator client {\n  provider      = \"prisma-client-js\"\n  output        = \"../src/infrastructure/database/generated/client\"\n  binaryTargets = [\"native\", \"linux-musl-openssl-3.0.x\"]\n}\n\ndatasource db {\n  provider = \"postgresql\"\n  url      = env(\"DATABASE_URL\")\n}\n\n// -----------------------------------------------------------------------------\n// 1. BẢNG GIỎ HÀNG (Hạn lưu 7 ngày theo SRS 3.4.1)\n// -----------------------------------------------------------------------------\nmodel Cart {\n  // Khóa chính: Số tự tăng (1, 2, 3...)\n  id BigInt @id @default(autoincrement())\n\n  // Tham chiếu người dùng nếu đã đăng nhập (Lấy 'id' từ user_users bên user-service - UUID, NULL nếu là khách)\n  userId String? @map(\"user_id\") @db.VarChar(36)\n\n  // Mã định danh phiên duyệt web của khách vãng lai (Dùng để gộp giỏ hàng khi họ đăng nhập)\n  sessionId String? @map(\"session_id\") @db.VarChar(100)\n\n  // Thời điểm giỏ hàng tự động hết hạn (SRS: Mặc định sau 7 ngày không hoạt động)\n  expiresAt DateTime @map(\"expires_at\") @db.Timestamptz()\n\n  // Thời gian tạo và cập nhật giỏ hàng\n  createdAt DateTime @default(now()) @map(\"created_at\") @db.Timestamptz()\n  updatedAt DateTime @default(now()) @updatedAt @map(\"updated_at\") @db.Timestamptz()\n\n  items CartItem[]\n\n  @@index([userId], map: \"idx_cart_user\")\n  @@index([sessionId], map: \"idx_cart_session\")\n  @@map(\"commerce_carts\")\n}\n\n// -----------------------------------------------------------------------------\n// 2. BẢNG MÓN HÀNG TRONG GIỎ (Lưu danh sách món hàng khách chọn mua)\n// -----------------------------------------------------------------------------\nmodel CartItem {\n  // Khóa chính: Số tự tăng (1, 2, 3...)\n  id BigInt @id @default(autoincrement())\n\n  // Thuộc giỏ hàng nào (Khóa ngoại nối với commerce_carts)\n  cartId BigInt @map(\"cart_id\")\n\n  // Tham chiếu sản phẩm được chọn (Lấy 'id' từ catalog_products bên catalog-service)\n  productId BigInt @map(\"product_id\")\n\n  // Số lượng món hàng khách chọn mua (Tối thiểu 1)\n  quantity Int @default(1)\n\n  // Giá của sản phẩm tại thời điểm bấm thêm vào giỏ\n  unitPrice Decimal @map(\"unit_price\") @db.Decimal(12, 2)\n\n  // Thời gian thêm và cập nhật món hàng\n  createdAt DateTime @default(now()) @map(\"created_at\") @db.Timestamptz()\n  updatedAt DateTime @default(now()) @updatedAt @map(\"updated_at\") @db.Timestamptz()\n\n  cart Cart @relation(fields: [cartId], references: [id], onDelete: Cascade)\n\n  @@index([cartId], map: \"idx_cart_item_cart\")\n  @@index([productId], map: \"idx_cart_item_product\")\n  @@map(\"commerce_cart_items\")\n}\n\n// -----------------------------------------------------------------------------\n// 3. BẢNG ĐƠN ĐẶT HÀNG (Phiên thanh toán 15 phút theo SRS 3.4.1)\n// -----------------------------------------------------------------------------\nmodel Order {\n  // Khóa chính: Chuẩn hóa UUIDv7 RFC 9562 (VARCHAR 36)\n  id String @id @default(uuid()) @map(\"id\") @db.VarChar(36)\n\n  // Mã đơn hàng hiển thị cho khách xem (VD: \"ORD-20261008-001\")\n  orderCode String @unique @map(\"order_code\") @db.VarChar(50)\n\n  // Tham chiếu người mua (Lấy 'id' từ user_users bên user-service - UUID)\n  buyerId String @map(\"buyer_id\") @db.VarChar(36)\n\n  // Tham chiếu người bán (Lấy 'id' từ user_users bên user-service - UUID)\n  sellerId String @map(\"seller_id\") @db.VarChar(36)\n\n  // Tổng số tiền khách phải thanh toán (Tiền hàng + ship - giảm giá)\n  totalAmount Decimal @map(\"total_amount\") @db.Decimal(12, 2)\n\n  // Tiền phí vận chuyển đơn hàng\n  shippingFee Decimal @default(0.00) @map(\"shipping_fee\") @db.Decimal(12, 2)\n\n  // Tiền giảm giá / Voucher khuyến mãi\n  discountAmount Decimal @default(0.00) @map(\"discount_amount\") @db.Decimal(12, 2)\n\n  // Trạng thái đơn: PENDING_PAYMENT, PAID, PROCESSING, SHIPPED, DELIVERED, CANCELLED, REFUNDED\n  status String @default(\"PENDING_PAYMENT\") @db.VarChar(30)\n\n  // Địa chỉ nhận hàng đầy đủ (Lưu JSON: Họ tên, SĐT, Tỉnh/Thành, Địa chỉ chi tiết)\n  shippingAddress Json @map(\"shipping_address\")\n\n  // Hạn chót 15 phút để hoàn tất thanh toán (SRS: Quá 15 phút tự động hủy đơn)\n  checkoutSessionExpiresAt DateTime? @map(\"checkout_session_expires_at\") @db.Timestamptz()\n\n  // Thời gian tạo và cập nhật đơn hàng\n  createdAt DateTime @default(now()) @map(\"created_at\") @db.Timestamptz()\n  updatedAt DateTime @default(now()) @updatedAt @map(\"updated_at\") @db.Timestamptz()\n\n  items    OrderItem[]\n  payments Payment[]\n  invoices Invoice[]\n\n  @@index([buyerId], map: \"idx_order_buyer\")\n  @@index([sellerId], map: \"idx_order_seller\")\n  @@index([status], map: \"idx_order_status\")\n  @@index([orderCode], map: \"idx_order_code\")\n  @@map(\"commerce_orders\")\n}\n\n// -----------------------------------------------------------------------------\n// 4. BẢNG CHI TIẾT MÓN HÀNG TRONG ĐƠN (Chụp lại Snapshot giá và tên tại lúc mua)\n// -----------------------------------------------------------------------------\nmodel OrderItem {\n  // Khóa chính: Số tự tăng (1, 2, 3...)\n  id BigInt @id @default(autoincrement())\n\n  // Thuộc đơn hàng nào (Khóa ngoại nối với commerce_orders - UUIDv7 VARCHAR 36)\n  orderId String @map(\"order_id\") @db.VarChar(36)\n\n  // Tham chiếu sản phẩm (Lấy 'id' từ catalog_products bên catalog-service)\n  productId BigInt @map(\"product_id\")\n\n  // Tên sản phẩm tại thời điểm mua (Snapshot chống seller đổi tên sau đó)\n  productTitle String @map(\"product_title\") @db.VarChar(255)\n\n  // Đơn giá tại thời điểm chốt đơn (Snapshot chống seller tăng/giảm giá sau đó)\n  unitPrice Decimal @map(\"unit_price\") @db.Decimal(12, 2)\n\n  // Số lượng mua\n  quantity Int @default(1)\n\n  // Thành tiền của món hàng (= unitPrice * quantity)\n  subtotal Decimal @db.Decimal(12, 2)\n\n  // Thời gian tạo bản ghi\n  createdAt DateTime @default(now()) @map(\"created_at\") @db.Timestamptz()\n\n  order Order @relation(fields: [orderId], references: [id], onDelete: Cascade)\n\n  @@index([orderId], map: \"idx_order_item_order\")\n  @@index([productId], map: \"idx_order_item_product\")\n  @@map(\"commerce_order_items\")\n}\n\n// -----------------------------------------------------------------------------\n// 5. BẢNG GIAO DỊCH THANH TOÁN (Khóa chống trừ tiền lặp lại 60 phút - SRS 3.4.2)\n// -----------------------------------------------------------------------------\nmodel Payment {\n  // Khóa chính: Số tự tăng (1, 2, 3...)\n  id BigInt @id @default(autoincrement())\n\n  // Thuộc đơn hàng nào (Khóa ngoại nối với commerce_orders - UUIDv7 VARCHAR 36)\n  orderId String @map(\"order_id\") @db.VarChar(36)\n\n  // Phương thức thanh toán: STRIPE, COD, VNPAY, MOMO\n  paymentMethod String @default(\"STRIPE\") @map(\"payment_method\") @db.VarChar(30)\n\n  // Mã giao dịch thanh toán từ Stripe (VD: \"pi_3MtwBwLkdIwHu7ix28a3tqPa\")\n  transactionId String? @map(\"transaction_id\") @db.VarChar(100)\n\n  // Khóa Idempotency chống gọi Webhook trừ tiền 2 lần trong 60 phút\n  idempotencyKey String @unique @map(\"idempotency_key\") @db.VarChar(100)\n\n  // Số tiền thực thanh toán\n  amount Decimal @db.Decimal(12, 2)\n\n  // Đơn vị tiền tệ (VND, USD)\n  currency String @default(\"VND\") @db.VarChar(10)\n\n  // Trạng thái thanh toán: PENDING, SUCCEEDED, FAILED, REFUNDED\n  status String @default(\"PENDING\") @db.VarChar(20)\n\n  // Dữ liệu gốc JSON trả về từ cổng thanh toán Stripe để lưu vết kiểm toán\n  rawResponse Json? @map(\"raw_response\")\n\n  // Thời gian tạo và cập nhật giao dịch\n  createdAt DateTime @default(now()) @map(\"created_at\") @db.Timestamptz()\n  updatedAt DateTime @default(now()) @updatedAt @map(\"updated_at\") @db.Timestamptz()\n\n  order Order @relation(fields: [orderId], references: [id], onDelete: Restrict)\n\n  @@index([orderId], map: \"idx_payment_order\")\n  @@index([status], map: \"idx_payment_status\")\n  @@map(\"commerce_payments\")\n}\n\n// -----------------------------------------------------------------------------\n// 6. BẢNG HÓA ĐƠN / BIÊN LAI ĐIỆN TỬ (Xuất cho khách sau khi đơn hoàn tất)\n// -----------------------------------------------------------------------------\nmodel Invoice {\n  // Khóa chính: Số tự tăng (1, 2, 3...)\n  id BigInt @id @default(autoincrement())\n\n  // Thuộc đơn hàng nào (Khóa ngoại nối với commerce_orders - UUIDv7 VARCHAR 36)\n  orderId String @map(\"order_id\") @db.VarChar(36)\n\n  // Mã số hóa đơn điện tử (VD: \"INV-20261008-001\")\n  invoiceCode String @unique @map(\"invoice_code\") @db.VarChar(50)\n\n  // Đường dẫn tải file PDF hóa đơn trên Cloud Storage\n  pdfUrl String? @map(\"pdf_url\") @db.VarChar(500)\n\n  // Thời điểm xuất hóa đơn\n  issuedAt DateTime @default(now()) @map(\"issued_at\") @db.Timestamptz()\n\n  // Thời gian tạo bản ghi\n  createdAt DateTime @default(now()) @map(\"created_at\") @db.Timestamptz()\n\n  order Order @relation(fields: [orderId], references: [id], onDelete: Restrict)\n\n  @@index([orderId], map: \"idx_invoice_order\")\n  @@map(\"commerce_invoices\")\n}\n",
  "inlineSchemaHash": "1102a6398c6e56247e064b1e7ef732a675a405569e130b59cc16d90145f82dd9",
  "copyEngine": true
}

const fs = require('fs')

config.dirname = __dirname
if (!fs.existsSync(path.join(__dirname, 'schema.prisma'))) {
  const alternativePaths = [
    "src/infrastructure/database/generated/client",
    "infrastructure/database/generated/client",
  ]
  
  const alternativePath = alternativePaths.find((altPath) => {
    return fs.existsSync(path.join(process.cwd(), altPath, 'schema.prisma'))
  }) ?? alternativePaths[0]

  config.dirname = path.join(process.cwd(), alternativePath)
  config.isBundled = true
}

config.runtimeDataModel = JSON.parse("{\"models\":{\"Cart\":{\"dbName\":\"commerce_carts\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"BigInt\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"userId\",\"dbName\":\"user_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"sessionId\",\"dbName\":\"session_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"expiresAt\",\"dbName\":\"expires_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"dbName\":\"updated_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"items\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"CartItem\",\"relationName\":\"CartToCartItem\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"CartItem\":{\"dbName\":\"commerce_cart_items\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"BigInt\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"cartId\",\"dbName\":\"cart_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"BigInt\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"productId\",\"dbName\":\"product_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"BigInt\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"quantity\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":1,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"unitPrice\",\"dbName\":\"unit_price\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"dbName\":\"updated_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"cart\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Cart\",\"relationName\":\"CartToCartItem\",\"relationFromFields\":[\"cartId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"Order\":{\"dbName\":\"commerce_orders\",\"fields\":[{\"name\":\"id\",\"dbName\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"uuid(4)\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"orderCode\",\"dbName\":\"order_code\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"buyerId\",\"dbName\":\"buyer_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"sellerId\",\"dbName\":\"seller_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"totalAmount\",\"dbName\":\"total_amount\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"shippingFee\",\"dbName\":\"shipping_fee\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Decimal\",\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"discountAmount\",\"dbName\":\"discount_amount\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Decimal\",\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"status\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":\"PENDING_PAYMENT\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"shippingAddress\",\"dbName\":\"shipping_address\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Json\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"checkoutSessionExpiresAt\",\"dbName\":\"checkout_session_expires_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"dbName\":\"updated_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"items\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"OrderItem\",\"relationName\":\"OrderToOrderItem\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"payments\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Payment\",\"relationName\":\"OrderToPayment\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"invoices\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Invoice\",\"relationName\":\"InvoiceToOrder\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"OrderItem\":{\"dbName\":\"commerce_order_items\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"BigInt\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"orderId\",\"dbName\":\"order_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"productId\",\"dbName\":\"product_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"BigInt\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"productTitle\",\"dbName\":\"product_title\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"unitPrice\",\"dbName\":\"unit_price\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"quantity\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":1,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"subtotal\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"order\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Order\",\"relationName\":\"OrderToOrderItem\",\"relationFromFields\":[\"orderId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"Payment\":{\"dbName\":\"commerce_payments\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"BigInt\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"orderId\",\"dbName\":\"order_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"paymentMethod\",\"dbName\":\"payment_method\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":\"STRIPE\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"transactionId\",\"dbName\":\"transaction_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"idempotencyKey\",\"dbName\":\"idempotency_key\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"amount\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"currency\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":\"VND\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"status\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":\"PENDING\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"rawResponse\",\"dbName\":\"raw_response\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Json\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"dbName\":\"updated_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"order\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Order\",\"relationName\":\"OrderToPayment\",\"relationFromFields\":[\"orderId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Restrict\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"Invoice\":{\"dbName\":\"commerce_invoices\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"BigInt\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"orderId\",\"dbName\":\"order_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"invoiceCode\",\"dbName\":\"invoice_code\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"pdfUrl\",\"dbName\":\"pdf_url\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"issuedAt\",\"dbName\":\"issued_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"order\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Order\",\"relationName\":\"InvoiceToOrder\",\"relationFromFields\":[\"orderId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Restrict\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false}},\"enums\":{},\"types\":{}}")
defineDmmfProperty(exports.Prisma, config.runtimeDataModel)
config.engineWasm = undefined


const { warnEnvConflicts } = require('./runtime/library.js')

warnEnvConflicts({
    rootEnvPath: config.relativeEnvPaths.rootEnvPath && path.resolve(config.dirname, config.relativeEnvPaths.rootEnvPath),
    schemaEnvPath: config.relativeEnvPaths.schemaEnvPath && path.resolve(config.dirname, config.relativeEnvPaths.schemaEnvPath)
})

const PrismaClient = getPrismaClient(config)
exports.PrismaClient = PrismaClient
Object.assign(exports, Prisma)

// file annotations for bundling tools to include these files
path.join(__dirname, "query_engine-windows.dll.node");
path.join(process.cwd(), "src/infrastructure/database/generated/client/query_engine-windows.dll.node")

// file annotations for bundling tools to include these files
path.join(__dirname, "libquery_engine-linux-musl-openssl-3.0.x.so.node");
path.join(process.cwd(), "src/infrastructure/database/generated/client/libquery_engine-linux-musl-openssl-3.0.x.so.node")
// file annotations for bundling tools to include these files
path.join(__dirname, "schema.prisma");
path.join(process.cwd(), "src/infrastructure/database/generated/client/schema.prisma")
