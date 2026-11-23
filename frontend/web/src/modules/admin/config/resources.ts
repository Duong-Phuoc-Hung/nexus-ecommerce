export type ResourceConfig = {
  title: string;
  subtitle: string;
  path?: string;
  paged?: boolean;
  columns: [string, string][];
  create?: string;
  actions?: string[];
};

export const resources: Record<string, ResourceConfig> = {
  users: {
    title: 'Quản lý tài khoản',
    subtitle: 'Tra cứu hồ sơ, phân vai trò và quản lý trạng thái người dùng.',
    path: '/users',
    paged: true,
    columns: [
      ['fullName', 'Họ và tên'],
      ['email', 'Email'],
      ['phone', 'Điện thoại'],
      ['role', 'Vai trò'],
      ['status', 'Trạng thái'],
    ],
    create: 'Tạo tài khoản',
    actions: ['Đổi vai trò', 'Sửa hồ sơ', 'Đổi mật khẩu', 'Xóa tài khoản'],
  },
  categories: {
    title: 'Danh mục sản phẩm',
    subtitle: 'Tổ chức cấu trúc danh mục cha–con trên toàn sàn.',
    path: '/categories?tree=true',
    columns: [
      ['name', 'Tên danh mục'],
      ['parentId', 'Danh mục cha'],
      ['level', 'Cấp'],
    ],
    create: 'Tạo danh mục',
    actions: ['Sửa danh mục', 'Xóa danh mục'],
  },
  orders: {
    title: 'Quản lý đơn hàng',
    subtitle: 'Theo dõi giao dịch, trạng thái vận chuyển và xử lý hoàn tiền.',
    path: '/orders',
    paged: true,
    columns: [
      ['id', 'Mã đơn'],
      ['buyer', 'Người mua'],
      ['seller', 'Gian hàng'],
      ['totalAmount', 'Tổng tiền'],
      ['status', 'Trạng thái'],
    ],
    actions: ['Cập nhật trạng thái', 'Hoàn tiền', 'Hủy đơn'],
  },
  shipments: {
    title: 'Vận chuyển',
    subtitle: 'Khởi tạo vận đơn và theo dõi hành trình giao nhận.',
    path: '/fulfillments/shipments',
    paged: true,
    columns: [
      ['trackingCode', 'Mã vận đơn'],
      ['orderId', 'Đơn hàng'],
      ['carrier', 'Đơn vị vận chuyển'],
      ['recipientName', 'Người nhận'],
      ['status', 'Trạng thái'],
    ],
    create: 'Tạo vận đơn',
    actions: [],
  },
  reputation: {
    title: 'Uy tín & vi phạm',
    subtitle: 'Theo dõi điểm uy tín và áp dụng chế tài tài khoản.',
    path: '/users',
    paged: true,
    columns: [
      ['fullName', 'Người dùng'],
      ['role', 'Vai trò'],
      ['reputationScore', 'Điểm uy tín'],
      ['status', 'Trạng thái'],
    ],
    actions: ['Điều chỉnh uy tín', 'Áp dụng hình phạt'],
  },
  notifications: {
    title: 'Lịch sử thông báo',
    subtitle: 'Theo dõi nội dung, người nhận và kết quả gửi thông báo.',
    path: '/notifications',
    columns: [
      ['title', 'Nội dung'],
      ['recipient', 'Người nhận'],
      ['status', 'Kết quả'],
      ['createdAt', 'Thời gian'],
    ],
  },
  events: {
    title: 'Nhật ký sự kiện',
    subtitle: 'Tra cứu sự kiện nghiệp vụ theo mã và thời điểm phát sinh.',
    path: '/notifications/event-logs',
    columns: [
      ['eventId', 'Mã sự kiện'],
      ['eventType', 'Loại sự kiện'],
      ['occurredAt', 'Thời gian'],
    ],
  },
  audit: {
    title: 'Lịch sử quản trị',
    subtitle: 'Đối chiếu người thực hiện, hành động và đối tượng thay đổi.',
    path: '/audit-logs',
    columns: [
      ['actor', 'Người thực hiện'],
      ['action', 'Hành động'],
      ['target', 'Đối tượng'],
      ['createdAt', 'Thời gian'],
    ],
  },
  reports: {
    title: 'Báo cáo vận hành',
    subtitle: 'Tổng hợp số đơn hàng, doanh thu và phiên đấu giá đã đối soát.',
    columns: [
      ['period', 'Kỳ báo cáo'],
      ['orders', 'Số đơn'],
      ['revenue', 'Doanh thu'],
      ['auctions', 'Phiên hoàn tất'],
    ],
  },
};
