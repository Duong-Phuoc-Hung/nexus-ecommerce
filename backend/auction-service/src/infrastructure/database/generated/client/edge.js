
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

exports.Prisma.AuctionRoomScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  sellerId: 'sellerId',
  title: 'title',
  startPrice: 'startPrice',
  currentPrice: 'currentPrice',
  bidStep: 'bidStep',
  buyNowPrice: 'buyNowPrice',
  startTime: 'startTime',
  endTime: 'endTime',
  actualEndTime: 'actualEndTime',
  status: 'status',
  winnerId: 'winnerId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AuctionBidScalarFieldEnum = {
  id: 'id',
  auctionId: 'auctionId',
  bidderId: 'bidderId',
  bidAmount: 'bidAmount',
  bidTime: 'bidTime',
  isWinning: 'isWinning',
  createdAt: 'createdAt'
};

exports.Prisma.AuctionSettlementScalarFieldEnum = {
  id: 'id',
  auctionId: 'auctionId',
  winnerId: 'winnerId',
  winningBidAmount: 'winningBidAmount',
  paymentDeadline: 'paymentDeadline',
  orderId: 'orderId',
  status: 'status',
  settledAt: 'settledAt',
  createdAt: 'createdAt'
};

exports.Prisma.AuctionExtensionScalarFieldEnum = {
  id: 'id',
  auctionId: 'auctionId',
  extendedMinutes: 'extendedMinutes',
  previousEndTime: 'previousEndTime',
  newEndTime: 'newEndTime',
  reason: 'reason',
  createdAt: 'createdAt'
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
  AuctionRoom: 'AuctionRoom',
  AuctionBid: 'AuctionBid',
  AuctionSettlement: 'AuctionSettlement',
  AuctionExtension: 'AuctionExtension'
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
      "value": "C:\\Users\\thanh\\Desktop\\NexusFPT\\nexus-ecommerce\\backend\\auction-service\\src\\infrastructure\\database\\generated\\client",
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
    "sourceFilePath": "C:\\Users\\thanh\\Desktop\\NexusFPT\\nexus-ecommerce\\backend\\auction-service\\prisma\\schema.prisma",
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
  "inlineSchema": "// =============================================================================\n// Project Nexus - Auction Service Prisma Schema (SRS 3.5)\n// Database: PostgreSQL (nexus_auction_db - Port 5435)\n// =============================================================================\n\ngenerator client {\n  provider      = \"prisma-client-js\"\n  output        = \"../src/infrastructure/database/generated/client\"\n  binaryTargets = [\"native\", \"linux-musl-openssl-3.0.x\"]\n}\n\ndatasource db {\n  provider = \"postgresql\"\n  url      = env(\"DATABASE_URL\")\n}\n\n// -----------------------------------------------------------------------------\n// 1. BẢNG PHÒNG ĐẤU GIÁ (Quản lý toàn bộ vòng đời phiên đấu giá)\n// -----------------------------------------------------------------------------\nmodel AuctionRoom {\n  // Khóa chính: Số tự tăng (1, 2, 3...)\n  id BigInt @id @default(autoincrement())\n\n  // Tham chiếu sản phẩm đấu giá (Lấy 'id' từ catalog_products bên catalog-service)\n  productId BigInt @map(\"product_id\")\n\n  // Tham chiếu người bán / chủ phòng (Lấy 'id' từ user_users bên user-service - UUID)\n  sellerId String @map(\"seller_id\") @db.VarChar(36)\n\n  // Tiêu đề phòng đấu giá (VD: \"Đấu giá iPhone 15 Pro Max 256GB Like New\")\n  title String @db.VarChar(255)\n\n  // Giá khởi điểm do người bán đặt ra ban đầu\n  startPrice Decimal @map(\"start_price\") @db.Decimal(12, 2)\n\n  // Giá cao nhất hiện tại (Cập nhật liên tục mỗi khi có lượt đặt giá mới)\n  currentPrice Decimal @map(\"current_price\") @db.Decimal(12, 2)\n\n  // Bước giá tối thiểu (SRS: Mỗi lần trả giá phải tăng ít nhất bằng số tiền này)\n  bidStep Decimal @map(\"bid_step\") @db.Decimal(12, 2)\n\n  // Giá mua đứt ngay (Tùy chọn: nếu khách trả mức này thì trúng luôn, kết thúc phiên)\n  buyNowPrice Decimal? @map(\"buy_now_price\") @db.Decimal(12, 2)\n\n  // Thời điểm mở phiên đấu giá cho người dùng vào trả giá\n  startTime DateTime @map(\"start_time\") @db.Timestamptz()\n\n  // Thời điểm kết thúc phiên đấu giá dự kiến ban đầu\n  endTime DateTime @map(\"end_time\") @db.Timestamptz()\n\n  // Thời điểm kết thúc thực tế (Tự dời lùi lại nếu có kích hoạt Anti-sniping ở phút chót)\n  actualEndTime DateTime? @map(\"actual_end_time\") @db.Timestamptz()\n\n  // Trạng thái: SCHEDULED (Chờ mở), ACTIVE (Đang diễn ra), ENDED (Hết giờ), SETTLED (Đã chốt), CANCELLED (Đã hủy)\n  status String @default(\"SCHEDULED\") @db.VarChar(20)\n\n  // Tham chiếu người thắng cuộc khi phiên kết thúc (Lấy 'id' từ user_users bên user-service - UUID)\n  winnerId String? @map(\"winner_id\") @db.VarChar(36)\n\n  // Thời gian tạo và cập nhật phòng đấu giá\n  createdAt DateTime @default(now()) @map(\"created_at\") @db.Timestamptz()\n  updatedAt DateTime @default(now()) @updatedAt @map(\"updated_at\") @db.Timestamptz()\n\n  // Quan hệ nội bộ trong auction-service\n  bids       AuctionBid[]\n  settlement AuctionSettlement?\n  extensions AuctionExtension[]\n\n  @@index([productId], map: \"idx_auction_product\")\n  @@index([sellerId], map: \"idx_auction_seller\")\n  @@index([status], map: \"idx_auction_status\")\n  @@index([winnerId], map: \"idx_auction_winner\")\n  @@map(\"auction_rooms\")\n}\n\n// -----------------------------------------------------------------------------\n// 2. BẢNG LỊCH SỬ ĐẶT GIÁ (Lưu vết từng lượt trả giá, yêu cầu phản hồi <= 300ms)\n// -----------------------------------------------------------------------------\nmodel AuctionBid {\n  // Khóa chính: Số tự tăng (1, 2, 3...)\n  id BigInt @id @default(autoincrement())\n\n  // Thuộc phòng đấu giá nào (Khóa ngoại nối với bảng auction_rooms)\n  auctionId BigInt @map(\"auction_id\")\n\n  // Tham chiếu người bấm nút trả giá (Lấy 'id' từ user_users bên user-service - UUID)\n  bidderId String @map(\"bidder_id\") @db.VarChar(36)\n\n  // Số tiền người này đưa ra đấu giá\n  bidAmount Decimal @map(\"bid_amount\") @db.Decimal(12, 2)\n\n  // Thời điểm bấm giá chính xác đến mili-giây (Dùng phân xử ai bấm trước)\n  bidTime DateTime @default(now()) @map(\"bid_time\") @db.Timestamptz()\n\n  // Cờ đánh dấu: TRUE nếu mức giá này đang dẫn đầu, FALSE nếu bị người khác vượt qua\n  isWinning Boolean @default(false) @map(\"is_winning\")\n\n  // Thời gian tạo bản ghi\n  createdAt DateTime @default(now()) @map(\"created_at\") @db.Timestamptz()\n\n  auction AuctionRoom @relation(fields: [auctionId], references: [id], onDelete: Cascade)\n\n  @@index([auctionId], map: \"idx_bid_auction\")\n  @@index([bidderId], map: \"idx_bid_bidder\")\n  @@index([bidTime(sort: Desc)], map: \"idx_bid_time\")\n  @@map(\"auction_bids\")\n}\n\n// -----------------------------------------------------------------------------\n// 3. BẢNG CHỐT NGƯỜI THẮNG & HẠN NỘP TIỀN 24H (Quản lý thanh toán sau đấu giá)\n// -----------------------------------------------------------------------------\nmodel AuctionSettlement {\n  // Khóa chính: Số tự tăng (1, 2, 3...)\n  id BigInt @id @default(autoincrement())\n\n  // Thuộc phiên đấu giá nào (Nối 1-1 với auction_rooms)\n  auctionId BigInt @unique @map(\"auction_id\")\n\n  // Tham chiếu người chiến thắng (Lấy 'id' từ user_users bên user-service - UUID)\n  winnerId String @map(\"winner_id\") @db.VarChar(36)\n\n  // Số tiền trúng đấu giá cuối cùng phải thanh toán\n  winningBidAmount Decimal @map(\"winning_bid_amount\") @db.Decimal(12, 2)\n\n  // Hạn chót nộp tiền: Đúng 24h sau khi phiên kết thúc (SRS: Quá hạn phạt trừ 10 điểm uy tín)\n  paymentDeadline DateTime @map(\"payment_deadline\") @db.Timestamptz()\n\n  // Tham chiếu đơn hàng tạo bên commerce_orders của commerce-service khi người thắng bấm thanh toán\n  orderId BigInt? @map(\"order_id\")\n\n  // Trạng thái nộp tiền: PENDING_PAYMENT (Chờ trả), PAID (Đã trả), TIMEOUT_PENALIZED (Bùng kèo quá 24h)\n  status String @default(\"PENDING_PAYMENT\") @db.VarChar(20)\n\n  // Thời điểm hệ thống chốt người thắng\n  settledAt DateTime @default(now()) @map(\"settled_at\") @db.Timestamptz()\n\n  // Thời gian tạo bản ghi\n  createdAt DateTime @default(now()) @map(\"created_at\") @db.Timestamptz()\n\n  auction AuctionRoom @relation(fields: [auctionId], references: [id], onDelete: Restrict)\n\n  @@index([winnerId], map: \"idx_settlement_winner\")\n  @@index([status], map: \"idx_settlement_status\")\n  @@map(\"auction_settlements\")\n}\n\n// -----------------------------------------------------------------------------\n// 4. BẢNG NHẬT KÝ GIA HẠN ANTI-SNIPING (Chống vét giá giây cuối)\n// -----------------------------------------------------------------------------\nmodel AuctionExtension {\n  // Khóa chính: Số tự tăng (1, 2, 3...)\n  id BigInt @id @default(autoincrement())\n\n  // Thuộc phòng đấu giá nào (Nối với auction_rooms)\n  auctionId BigInt @map(\"auction_id\")\n\n  // Số phút được cộng thêm (SRS: Mặc định cộng thêm 5 phút nếu có bid ở 5 phút cuối)\n  extendedMinutes Int @default(5) @map(\"extended_minutes\")\n\n  // Giờ kết thúc cũ trước khi bị gia hạn\n  previousEndTime DateTime @map(\"previous_end_time\") @db.Timestamptz()\n\n  // Giờ kết thúc mới sau khi được cộng thêm 5 phút\n  newEndTime DateTime @map(\"new_end_time\") @db.Timestamptz()\n\n  // Lý do gia hạn (VD: \"Anti-sniping triggered by last-minute bid\")\n  reason String @default(\"Anti-sniping triggered by last-minute bid\") @db.VarChar(100)\n\n  // Thời điểm kích hoạt gia hạn\n  createdAt DateTime @default(now()) @map(\"created_at\") @db.Timestamptz()\n\n  auction AuctionRoom @relation(fields: [auctionId], references: [id], onDelete: Cascade)\n\n  @@index([auctionId], map: \"idx_extension_auction\")\n  @@map(\"auction_extensions\")\n}\n",
  "inlineSchemaHash": "ec2d6dce38f82bda9377638cdefb719b77f250331c1117c198ae47530de22062",
  "copyEngine": true
}
config.dirname = '/'

config.runtimeDataModel = JSON.parse("{\"models\":{\"AuctionRoom\":{\"dbName\":\"auction_rooms\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"BigInt\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"productId\",\"dbName\":\"product_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"BigInt\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"sellerId\",\"dbName\":\"seller_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"title\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"startPrice\",\"dbName\":\"start_price\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"currentPrice\",\"dbName\":\"current_price\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"bidStep\",\"dbName\":\"bid_step\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"buyNowPrice\",\"dbName\":\"buy_now_price\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"startTime\",\"dbName\":\"start_time\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"endTime\",\"dbName\":\"end_time\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"actualEndTime\",\"dbName\":\"actual_end_time\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"status\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":\"SCHEDULED\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"winnerId\",\"dbName\":\"winner_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"dbName\":\"updated_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"bids\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"AuctionBid\",\"relationName\":\"AuctionBidToAuctionRoom\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"settlement\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"AuctionSettlement\",\"relationName\":\"AuctionRoomToAuctionSettlement\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"extensions\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"AuctionExtension\",\"relationName\":\"AuctionExtensionToAuctionRoom\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"AuctionBid\":{\"dbName\":\"auction_bids\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"BigInt\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"auctionId\",\"dbName\":\"auction_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"BigInt\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"bidderId\",\"dbName\":\"bidder_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"bidAmount\",\"dbName\":\"bid_amount\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"bidTime\",\"dbName\":\"bid_time\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isWinning\",\"dbName\":\"is_winning\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"auction\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"AuctionRoom\",\"relationName\":\"AuctionBidToAuctionRoom\",\"relationFromFields\":[\"auctionId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"AuctionSettlement\":{\"dbName\":\"auction_settlements\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"BigInt\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"auctionId\",\"dbName\":\"auction_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"BigInt\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"winnerId\",\"dbName\":\"winner_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"winningBidAmount\",\"dbName\":\"winning_bid_amount\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"paymentDeadline\",\"dbName\":\"payment_deadline\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"orderId\",\"dbName\":\"order_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"BigInt\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"status\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":\"PENDING_PAYMENT\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"settledAt\",\"dbName\":\"settled_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"auction\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"AuctionRoom\",\"relationName\":\"AuctionRoomToAuctionSettlement\",\"relationFromFields\":[\"auctionId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Restrict\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"AuctionExtension\":{\"dbName\":\"auction_extensions\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"BigInt\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"auctionId\",\"dbName\":\"auction_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"BigInt\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"extendedMinutes\",\"dbName\":\"extended_minutes\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":5,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"previousEndTime\",\"dbName\":\"previous_end_time\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"newEndTime\",\"dbName\":\"new_end_time\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"reason\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":\"Anti-sniping triggered by last-minute bid\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"auction\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"AuctionRoom\",\"relationName\":\"AuctionExtensionToAuctionRoom\",\"relationFromFields\":[\"auctionId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false}},\"enums\":{},\"types\":{}}")
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

