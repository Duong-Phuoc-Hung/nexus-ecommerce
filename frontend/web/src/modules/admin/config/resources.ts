export type ResourceConfig = {
  title: string;
  subtitle: string;
  path?: string;
  paged?: boolean;
  columns: [string, string][];
  create?: string;
  actions?: string[];
  note?: string;
};
export const resources: Record<string, ResourceConfig> = {
  users: {
    title: 'Tài khoản người dùng',
    subtitle: 'Tra cứu hồ sơ và kiểm soát quyền truy cập của từng tài khoản.',
    path: '/users',
    paged: true,
    columns: [
      ['fullName', 'Họ và tên'],
      ['email', 'Email'],
      ['role', 'Vai trò'],
      ['status', 'Trạng thái'],
    ],
    create: 'Tạo tài khoản',
    actions: ['Đổi vai trò', 'Sửa hồ sơ', 'Xóa tài khoản', 'Đổi mật khẩu'],
  },
  roles: {
    title: 'Vai trò & phân quyền',
    subtitle: 'Đối chiếu quyền được cấp và trách nhiệm của từng vai trò.',
    path: '/auth/roles',
    columns: [
      ['role', 'Vai trò'],
      ['permissions', 'Quyền được cấp'],
    ],
    create: 'Tạo vai trò',
    actions: ['Sửa vai trò', 'Xóa vai trò'],
  },
  categories: {
    title: 'Danh mục sản phẩm',
    subtitle: 'Tổ chức danh mục cha–con để người mua tìm kiếm dễ dàng.',
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
    subtitle: 'Theo dõi giao dịch và xử lý các yêu cầu phát sinh.',
    path: '/orders',
    paged: true,
    columns: [
      ['id', 'Mã đơn'],
      ['buyer', 'Người mua'],
      ['seller', 'Gian hàng'],
      ['totalAmount', 'Tổng tiền'],
      ['status', 'Trạng thái'],
    ],
    actions: ['Hủy đơn', 'Hoàn tiền', 'Cập nhật trạng thái'],
    note: 'Đang hoàn thiện đồng bộ đơn mới với danh sách giao dịch.',
  },
  shipments: {
    title: 'Vận chuyển',
    subtitle: 'Tra cứu vận đơn và theo dõi hành trình giao nhận.',
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
    subtitle: 'Đối chiếu hồ sơ, điểm uy tín và chuẩn bị quyết định xử lý.',
    path: '/users',
    paged: true,
    columns: [
      ['fullName', 'Người dùng'],
      ['role', 'Vai trò'],
      ['reputationScore', 'Điểm uy tín'],
      ['status', 'Trạng thái'],
    ],
    actions: ['Điều chỉnh uy tín', 'Áp dụng hình phạt'],
    note: 'Lịch sử đánh giá và vi phạm đang được hoàn thiện.',
  },
  notifications: {
    title: 'Lịch sử thông báo',
    subtitle: 'Theo dõi nội dung, người nhận và kết quả gửi.',
    columns: [
      ['title', 'Nội dung'],
      ['recipient', 'Người nhận'],
      ['status', 'Kết quả'],
      ['createdAt', 'Thời gian'],
    ],
  },
  events: {
    title: 'Nhật ký sự kiện',
    subtitle: 'Tra cứu sự kiện nghiệp vụ theo mã và thời điểm xảy ra.',
    columns: [
      ['eventId', 'Mã sự kiện'],
      ['eventType', 'Loại sự kiện'],
      ['occurredAt', 'Thời gian'],
    ],
  },
  audit: {
    title: 'Lịch sử quản trị',
    subtitle: 'Đối chiếu người thực hiện, hành động và đối tượng thay đổi.',
    columns: [
      ['actor', 'Người thực hiện'],
      ['action', 'Hành động'],
      ['target', 'Đối tượng'],
      ['createdAt', 'Thời gian'],
    ],
  },
  reports: {
    title: 'Báo cáo vận hành',
    subtitle: 'Theo dõi đơn hàng, doanh thu và kết quả đấu giá đã đối soát.',
    columns: [
      ['period', 'Kỳ báo cáo'],
      ['orders', 'Số đơn'],
      ['revenue', 'Doanh thu'],
      ['auctions', 'Phiên hoàn tất'],
    ],
  },
};
