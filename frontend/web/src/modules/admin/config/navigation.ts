import {
  LayoutDashboard,
  PackageSearch,
  FolderTree,
  Gavel,
  ReceiptText,
  Truck,
  Users,
  ShieldCheck,
  Star,
  ChartNoAxesCombined,
  Bell,
  ScrollText,
  History,
  Settings,
  Activity,
  UserRound,
} from 'lucide-react';
export const adminNavigation = [
  {
    group: 'Vận hành',
    items: [
      { href: '/admin', label: 'Tổng quan', icon: LayoutDashboard },
      { href: '/admin/products', label: 'Sản phẩm', icon: PackageSearch },
      { href: '/admin/categories', label: 'Danh mục', icon: FolderTree },
      { href: '/admin/auctions', label: 'Phiên đấu giá', icon: Gavel },
      { href: '/admin/orders', label: 'Đơn hàng', icon: ReceiptText },
      { href: '/admin/shipments', label: 'Vận chuyển', icon: Truck },
    ],
  },
  {
    group: 'Người dùng',
    items: [
      { href: '/admin/users', label: 'Tài khoản', icon: Users },
      { href: '/admin/roles', label: 'Vai trò & quyền', icon: ShieldCheck },
      { href: '/admin/reputation', label: 'Uy tín & vi phạm', icon: Star },
    ],
  },
  {
    group: 'Giám sát',
    items: [
      { href: '/admin/reports', label: 'Báo cáo', icon: ChartNoAxesCombined },
      { href: '/admin/notifications', label: 'Thông báo', icon: Bell },
      { href: '/admin/events', label: 'Nhật ký sự kiện', icon: ScrollText },
      { href: '/admin/audit', label: 'Lịch sử quản trị', icon: History },
    ],
  },
  {
    group: 'Hệ thống',
    items: [
      { href: '/admin/settings', label: 'Cấu hình', icon: Settings },
      { href: '/admin/health', label: 'Tình trạng dịch vụ', icon: Activity },
      { href: '/admin/profile', label: 'Hồ sơ của tôi', icon: UserRound },
    ],
  },
];
