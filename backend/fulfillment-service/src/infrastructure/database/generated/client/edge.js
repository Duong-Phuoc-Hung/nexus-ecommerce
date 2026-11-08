
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
} = require('./runtime/edge.js')


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





/**
 * Enums
 */
exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.WarehouseScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  address: 'address',
  city: 'city',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SkuInventoryScalarFieldEnum = {
  id: 'id',
  warehouseId: 'warehouseId',
  productId: 'productId',
  skuCode: 'skuCode',
  totalQuantity: 'totalQuantity',
  availableQuantity: 'availableQuantity',
  reservedQuantity: 'reservedQuantity',
  unavailableQuantity: 'unavailableQuantity',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InventoryLedgerScalarFieldEnum = {
  id: 'id',
  inventoryId: 'inventoryId',
  transactionType: 'transactionType',
  quantityDelta: 'quantityDelta',
  referenceId: 'referenceId',
  reason: 'reason',
  createdAt: 'createdAt'
};

exports.Prisma.ShipmentScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  warehouseId: 'warehouseId',
  carrierCode: 'carrierCode',
  trackingCode: 'trackingCode',
  shippingFee: 'shippingFee',
  status: 'status',
  receiverName: 'receiverName',
  receiverPhone: 'receiverPhone',
  shippingAddress: 'shippingAddress',
  shippedAt: 'shippedAt',
  deliveredAt: 'deliveredAt',
  city: 'city',
  currentLocation: 'currentLocation',
  estimatedDeliveryDate: 'estimatedDeliveryDate',
  actualDeliveryDate: 'actualDeliveryDate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CarrierScalarFieldEnum = {
  id: 'id',
  carrierCode: 'carrierCode',
  carrierName: 'carrierName',
  isActive: 'isActive',
  apiEndpoint: 'apiEndpoint',
  createdAt: 'createdAt'
};

exports.Prisma.SupportCaseScalarFieldEnum = {
  id: 'id',
  type: 'type',
  orderId: 'orderId',
  orderCode: 'orderCode',
  userId: 'userId',
  customer: 'customer',
  reason: 'reason',
  priority: 'priority',
  status: 'status',
  resolutionNote: 'resolutionNote',
  resolvedBy: 'resolvedBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};


exports.Prisma.ModelName = {
  Warehouse: 'Warehouse',
  SkuInventory: 'SkuInventory',
  InventoryLedger: 'InventoryLedger',
  Shipment: 'Shipment',
  Carrier: 'Carrier',
  SupportCase: 'SupportCase'
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
      "value": "D:\\CodeProject\\nexus-ecommerce\\nexus-ecommerce-main\\backend\\fulfillment-service\\src\\infrastructure\\database\\generated\\client",
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
    "sourceFilePath": "D:\\CodeProject\\nexus-ecommerce\\nexus-ecommerce-main\\backend\\fulfillment-service\\prisma\\schema.prisma",
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
  "inlineSchema": "// =============================================================================\n// Project Nexus - Fulfillment Service Prisma Schema (SRS 3.6)\n// Database: PostgreSQL (nexus_fulfillment_db - Port 5436)\n// =============================================================================\n\ngenerator client {\n  provider      = \"prisma-client-js\"\n  output        = \"../src/infrastructure/database/generated/client\"\n  binaryTargets = [\"native\", \"linux-musl-openssl-3.0.x\"]\n}\n\ndatasource db {\n  provider = \"postgresql\"\n  url      = env(\"DATABASE_URL\")\n}\n\n// -----------------------------------------------------------------------------\n// 1. BẢNG DANH MỤC KHO HÀNG (Quản lý các kho bãi vật lý của hệ thống)\n// -----------------------------------------------------------------------------\nmodel Warehouse {\n  // Khóa chính: Số tự tăng (1, 2, 3...)\n  id BigInt @id @default(autoincrement())\n\n  // Mã định danh kho bãi (SRS: Mặc định kho chính là WH_001)\n  code String @unique @db.VarChar(50)\n\n  // Tên kho hàng (VD: \"Kho Tổng TP.HCM\", \"Kho Phân Phối Hà Nội\")\n  name String @db.VarChar(100)\n\n  // Địa chỉ chi tiết nơi đặt kho\n  address String @db.VarChar(255)\n\n  // Tỉnh / Thành phố\n  city String @db.VarChar(100)\n\n  // Trạng thái: TRUE (Đang mở cửa nhận/xuất hàng), FALSE (Tạm đóng cửa)\n  isActive Boolean @default(true) @map(\"is_active\")\n\n  // Thời gian tạo và cập nhật thông tin kho\n  createdAt DateTime @default(now()) @map(\"created_at\") @db.Timestamptz()\n  updatedAt DateTime @default(now()) @updatedAt @map(\"updated_at\") @db.Timestamptz()\n\n  // Quan hệ nội bộ trong fulfillment-service\n  inventories SkuInventory[]\n  shipments   Shipment[]\n\n  @@map(\"fulfillment_warehouses\")\n}\n\n// -----------------------------------------------------------------------------\n// 2. BẢNG TỒN KHO THEO SKU (Quản lý 4 trạng thái tồn kho nghiêm ngặt)\n// -----------------------------------------------------------------------------\nmodel SkuInventory {\n  // Khóa chính: Số tự tăng (1, 2, 3...)\n  id BigInt @id @default(autoincrement())\n\n  // Hàng hóa nằm ở kho nào (Khóa ngoại nối với fulfillment_warehouses)\n  warehouseId BigInt @map(\"warehouse_id\")\n\n  // Tham chiếu sản phẩm gốc (Lấy 'id' từ catalog_products bên catalog-service)\n  productId BigInt @map(\"product_id\")\n\n  // Mã phân loại sản phẩm chi tiết (VD: \"IPHONE-15-BLUE-256\")\n  skuCode String @unique @map(\"sku_code\") @db.VarChar(100)\n\n  // Tổng số lượng hàng hóa thực tế đang nằm trên kệ trong kho\n  totalQuantity Int @default(0) @map(\"total_quantity\")\n\n  // Số lượng hàng sẵn sàng bán cho khách mua\n  availableQuantity Int @default(0) @map(\"available_quantity\")\n\n  // Số lượng đang bị giữ chỗ tạm thời trong 30 phút khi khách checkout (SRS: RESERVATION_TIMEOUT = 30m)\n  reservedQuantity Int @default(0) @map(\"reserved_quantity\")\n\n  // Số lượng hàng bị lỗi, hỏng hóc, chờ thanh lý (không được bán)\n  unavailableQuantity Int @default(0) @map(\"unavailable_quantity\")\n\n  // Thời gian tạo và cập nhật số lượng tồn kho\n  createdAt DateTime @default(now()) @map(\"created_at\") @db.Timestamptz()\n  updatedAt DateTime @default(now()) @updatedAt @map(\"updated_at\") @db.Timestamptz()\n\n  warehouse Warehouse         @relation(fields: [warehouseId], references: [id], onDelete: Cascade)\n  ledgers   InventoryLedger[]\n\n  @@index([warehouseId], map: \"idx_inventory_warehouse\")\n  @@index([productId], map: \"idx_inventory_product\")\n  @@map(\"fulfillment_sku_inventories\")\n}\n\n// -----------------------------------------------------------------------------\n// 3. BẢNG SỔ CÁI BIẾN ĐỘNG KHO (BẤT BIẾN - APPEND-ONLY theo SRS 3.6.1)\n// Tuyệt đối không cho phép UPDATE hay DELETE để đảm bảo minh bạch kiểm toán kho\n// -----------------------------------------------------------------------------\nmodel InventoryLedger {\n  // Khóa chính: Số tự tăng (1, 2, 3...)\n  id BigInt @id @default(autoincrement())\n\n  // Biến động trên bản ghi tồn kho nào\n  inventoryId BigInt @map(\"inventory_id\")\n\n  // Loại biến động: INBOUND, OUTBOUND, RESERVE, RELEASE_RESERVED, ADJUST, RETURN\n  transactionType String @map(\"transaction_type\") @db.VarChar(30)\n\n  // Số lượng thay đổi (Số âm: -5 là giảm; Số dương: +10 là tăng)\n  quantityDelta Int @map(\"quantity_delta\")\n\n  // Tham chiếu tới nghiệp vụ sinh ra biến động (VD: Mã đơn hàng ORD-123456 hoặc mã phiếu nhập kho)\n  referenceId String? @map(\"reference_id\") @db.VarChar(100)\n\n  // Diễn giải lý do biến động số lượng\n  reason String? @db.VarChar(255)\n\n  // Thời điểm ghi nhận biến động (Bất biến, không bao giờ thay đổi)\n  createdAt DateTime @default(now()) @map(\"created_at\") @db.Timestamptz()\n\n  inventory SkuInventory @relation(fields: [inventoryId], references: [id], onDelete: Cascade)\n\n  @@index([inventoryId], map: \"idx_ledger_inventory\")\n  @@index([transactionType], map: \"idx_ledger_type\")\n  @@index([referenceId], map: \"idx_ledger_reference\")\n  @@map(\"fulfillment_inventory_ledgers\")\n}\n\n// -----------------------------------------------------------------------------\n// 4. BẢNG ĐƠN VẬN CHUYỂN / GIAO HÀNG (Theo dõi lộ trình giao đơn tới tay khách)\n// -----------------------------------------------------------------------------\nmodel Shipment {\n  // Khóa chính: Mã vận đơn nội bộ hoặc UUID (SRS V3: VARCHAR(100))\n  id String @id @db.VarChar(100)\n\n  // Tham chiếu đơn hàng cần giao (SRS V3: VARCHAR(100))\n  orderId String @map(\"order_id\") @db.VarChar(100)\n\n  // Xuất hàng đi từ kho nào (Khóa ngoại nối với fulfillment_warehouses)\n  warehouseId BigInt? @default(1) @map(\"warehouse_id\")\n\n  // Hãng giao hàng được chọn (GHN hoặc GHTK)\n  carrierCode String @map(\"carrier_code\") @db.VarChar(50)\n\n  // Mã vận đơn do GHN/GHTK cấp để khách tra cứu hành trình (VD: \"GHN123456789VN\")\n  trackingCode String? @map(\"tracking_code\") @db.VarChar(100)\n\n  // Cước phí vận chuyển thực tế\n  shippingFee Decimal @default(0.00) @map(\"shipping_fee\") @db.Decimal(12, 2)\n\n  // Trạng thái: PENDING, PICKED_UP, IN_TRANSIT, DELIVERED, FAILED, RETURNED\n  status String @default(\"PENDING\") @db.VarChar(30)\n\n  // Họ tên người nhận hàng\n  receiverName String? @map(\"receiver_name\") @db.VarChar(100)\n\n  // Số điện thoại người nhận hàng\n  receiverPhone String? @map(\"receiver_phone\") @db.VarChar(20)\n\n  // Địa chỉ giao hàng đầy đủ\n  shippingAddress String @map(\"shipping_address\") @db.Text\n\n  // Thời điểm tài xế lấy hàng đi giao\n  shippedAt DateTime? @map(\"shipped_at\") @db.Timestamptz()\n\n  // Thời điểm khách ký nhận hàng thành công\n  deliveredAt DateTime? @map(\"delivered_at\") @db.Timestamptz()\n\n  // Tỉnh / Thành phố\n  city String? @db.VarChar(100)\n\n  // Vị trí hiện tại của bưu kiện\n  currentLocation String? @map(\"current_location\") @db.VarChar(255)\n\n  // Thời gian giao hàng dự kiến\n  estimatedDeliveryDate DateTime? @map(\"estimated_delivery_date\") @db.Timestamptz()\n\n  // Thời gian giao hàng thực tế\n  actualDeliveryDate DateTime? @map(\"actual_delivery_date\") @db.Timestamptz()\n\n  // Thời gian tạo và cập nhật đơn vận chuyển\n  createdAt DateTime @default(now()) @map(\"created_at\") @db.Timestamptz()\n  updatedAt DateTime @default(now()) @updatedAt @map(\"updated_at\") @db.Timestamptz()\n\n  warehouse Warehouse? @relation(fields: [warehouseId], references: [id], onDelete: Restrict)\n\n  @@index([orderId], map: \"idx_shipment_order\")\n  @@index([warehouseId], map: \"idx_shipment_warehouse\")\n  @@index([trackingCode], map: \"idx_shipment_tracking\")\n  @@index([status], map: \"idx_shipment_status\")\n  @@map(\"fulfillment_shipments\")\n}\n\n// -----------------------------------------------------------------------------\n// 5. BẢNG ĐỐI TÁC VẬN CHUYỂN (Tích hợp hệ thống GHN, GHTK)\n// -----------------------------------------------------------------------------\nmodel Carrier {\n  // Khóa chính: Số tự tăng (1, 2, 3...)\n  id BigInt @id @default(autoincrement())\n\n  // Mã đối tác (VD: \"GHN\", \"GHTK\")\n  carrierCode String @unique @map(\"carrier_code\") @db.VarChar(50)\n\n  // Tên đầy đủ hiển thị (VD: \"Giao Hàng Nhanh\", \"Giao Hàng Tiết Kiệm\")\n  carrierName String @map(\"carrier_name\") @db.VarChar(100)\n\n  // Trạng thái: TRUE (Đang sử dụng đối tác này), FALSE (Tạm dừng tích hợp)\n  isActive Boolean @default(true) @map(\"is_active\")\n\n  // Đường link kỹ thuật của Server GHN/GHTK để Backend tự động gửi dữ liệu tạo đơn\n  apiEndpoint String? @map(\"api_endpoint\") @db.VarChar(255)\n\n  // Thời gian tạo bản ghi\n  createdAt DateTime @default(now()) @map(\"created_at\") @db.Timestamptz()\n\n  @@map(\"fulfillment_carriers\")\n}\n\n// -----------------------------------------------------------------------------\n// 6. BẢNG HỒ SƠ KHIẾU NẠI & TRANH CHẤP TRỌNG TÀI (SRS 2.3, 2.6 - Support Cases)\n// -----------------------------------------------------------------------------\nmodel SupportCase {\n  // Khóa chính: Mã khiếu nại (VD: \"CAS_01HQZ999ABC\")\n  id String @id @db.VarChar(50)\n\n  // Loại khiếu nại (VD: \"Đơn trễ\", \"Hàng hỏng\", \"Tranh chấp thanh toán\")\n  type String @db.VarChar(100)\n\n  // Mã định danh đơn hàng liên quan\n  orderId String @map(\"order_id\") @db.VarChar(100)\n\n  // Mã hiển thị đơn hàng (VD: \"ORD-2026-001\")\n  orderCode String @map(\"order_code\") @db.VarChar(100)\n\n  // ID người dùng tạo khiếu nại\n  userId String @map(\"user_id\") @db.VarChar(50)\n\n  // Tên khách hàng / người khiếu nại\n  customer String @db.VarChar(100)\n\n  // Chi tiết lý do khiếu nại\n  reason String @db.Text\n\n  // Mức độ ưu tiên: \"Cao\" / \"HIGH\", \"Trung bình\" / \"MEDIUM\", \"Thấp\" / \"LOW\"\n  priority String @default(\"Trung bình\") @db.VarChar(30)\n\n  // Trạng thái hồ sơ: \"PENDING\", \"IN_PROGRESS\", \"RESOLVED\", \"REJECTED\"\n  status String @default(\"PENDING\") @db.VarChar(30)\n\n  // Ghi chú phán quyết / giải quyết khiếu nại\n  resolutionNote String? @map(\"resolution_note\") @db.Text\n\n  // ID nhân viên Support / Trọng tài viên xử lý vụ việc\n  resolvedBy String? @map(\"resolved_by\") @db.VarChar(50)\n\n  // Thời gian tạo và cập nhật khiếu nại\n  createdAt DateTime @default(now()) @map(\"created_at\") @db.Timestamptz()\n  updatedAt DateTime @default(now()) @updatedAt @map(\"updated_at\") @db.Timestamptz()\n\n  @@index([userId], map: \"idx_support_case_user\")\n  @@index([orderId], map: \"idx_support_case_order\")\n  @@index([status], map: \"idx_support_case_status\")\n  @@index([priority], map: \"idx_support_case_priority\")\n  @@map(\"fulfillment_support_cases\")\n}\n",
  "inlineSchemaHash": "7c4b52022e92a5b056fba6d1fc1e0b567657638aa5ad5cfcf9d22714b361ade3",
  "copyEngine": true
}
config.dirname = '/'

config.runtimeDataModel = JSON.parse("{\"models\":{\"Warehouse\":{\"dbName\":\"fulfillment_warehouses\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"BigInt\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"code\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"address\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"city\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isActive\",\"dbName\":\"is_active\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":true,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"dbName\":\"updated_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"inventories\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"SkuInventory\",\"relationName\":\"SkuInventoryToWarehouse\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"shipments\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Shipment\",\"relationName\":\"ShipmentToWarehouse\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"SkuInventory\":{\"dbName\":\"fulfillment_sku_inventories\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"BigInt\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"warehouseId\",\"dbName\":\"warehouse_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"BigInt\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"productId\",\"dbName\":\"product_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"BigInt\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"skuCode\",\"dbName\":\"sku_code\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"totalQuantity\",\"dbName\":\"total_quantity\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"availableQuantity\",\"dbName\":\"available_quantity\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"reservedQuantity\",\"dbName\":\"reserved_quantity\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"unavailableQuantity\",\"dbName\":\"unavailable_quantity\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"dbName\":\"updated_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"warehouse\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Warehouse\",\"relationName\":\"SkuInventoryToWarehouse\",\"relationFromFields\":[\"warehouseId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"ledgers\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"InventoryLedger\",\"relationName\":\"InventoryLedgerToSkuInventory\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"InventoryLedger\":{\"dbName\":\"fulfillment_inventory_ledgers\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"BigInt\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"inventoryId\",\"dbName\":\"inventory_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"BigInt\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"transactionType\",\"dbName\":\"transaction_type\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"quantityDelta\",\"dbName\":\"quantity_delta\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"referenceId\",\"dbName\":\"reference_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"reason\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"inventory\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"SkuInventory\",\"relationName\":\"InventoryLedgerToSkuInventory\",\"relationFromFields\":[\"inventoryId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"Shipment\":{\"dbName\":\"fulfillment_shipments\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"orderId\",\"dbName\":\"order_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"warehouseId\",\"dbName\":\"warehouse_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":true,\"type\":\"BigInt\",\"default\":\"1\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"carrierCode\",\"dbName\":\"carrier_code\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"trackingCode\",\"dbName\":\"tracking_code\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"shippingFee\",\"dbName\":\"shipping_fee\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Decimal\",\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"status\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":\"PENDING\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"receiverName\",\"dbName\":\"receiver_name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"receiverPhone\",\"dbName\":\"receiver_phone\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"shippingAddress\",\"dbName\":\"shipping_address\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"shippedAt\",\"dbName\":\"shipped_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"deliveredAt\",\"dbName\":\"delivered_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"city\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"currentLocation\",\"dbName\":\"current_location\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"estimatedDeliveryDate\",\"dbName\":\"estimated_delivery_date\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"actualDeliveryDate\",\"dbName\":\"actual_delivery_date\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"dbName\":\"updated_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"warehouse\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Warehouse\",\"relationName\":\"ShipmentToWarehouse\",\"relationFromFields\":[\"warehouseId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Restrict\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"Carrier\":{\"dbName\":\"fulfillment_carriers\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"BigInt\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"carrierCode\",\"dbName\":\"carrier_code\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"carrierName\",\"dbName\":\"carrier_name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isActive\",\"dbName\":\"is_active\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":true,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"apiEndpoint\",\"dbName\":\"api_endpoint\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"SupportCase\":{\"dbName\":\"fulfillment_support_cases\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"type\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"orderId\",\"dbName\":\"order_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"orderCode\",\"dbName\":\"order_code\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"userId\",\"dbName\":\"user_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"customer\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"reason\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"priority\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":\"Trung bình\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"status\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":\"PENDING\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"resolutionNote\",\"dbName\":\"resolution_note\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"resolvedBy\",\"dbName\":\"resolved_by\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"dbName\":\"updated_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":true}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false}},\"enums\":{},\"types\":{}}")
defineDmmfProperty(exports.Prisma, config.runtimeDataModel)
config.engineWasm = undefined

config.injectableEdgeEnv = () => ({
  parsed: {
    DATABASE_URL: typeof globalThis !== 'undefined' && globalThis['DATABASE_URL'] || typeof process !== 'undefined' && process.env && process.env.DATABASE_URL || undefined
  }
})

if (typeof globalThis !== 'undefined' && globalThis['DEBUG'] || typeof process !== 'undefined' && process.env && process.env.DEBUG || undefined) {
  Debug.enable(typeof globalThis !== 'undefined' && globalThis['DEBUG'] || typeof process !== 'undefined' && process.env && process.env.DEBUG || undefined)
}

const PrismaClient = getPrismaClient(config)
exports.PrismaClient = PrismaClient
Object.assign(exports, Prisma)

