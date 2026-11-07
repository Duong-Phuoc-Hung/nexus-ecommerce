/**
 * Tiện ích chuyển đổi mã trạng thái đơn hàng (tiếng Anh) sang tiếng Việt thân thiện với người dùng
 */
export function formatOrderStatus(status?: string): string {
  if (!status) return 'CHỜ THANH TOÁN';
  const clean = status.trim();
  const upper = clean.toUpperCase();

  switch (upper) {
    case 'PENDING':
    case 'PENDING_PAYMENT':
    case 'CREATED':
    case 'CHỜ_THANH_TOÁN':
    case 'CHỜ THANH TOÁN':
    case 'CHỜ_XỬ_LÝ':
    case 'CHỜ XỬ LÝ':
      return 'CHỜ THANH TOÁN';
    case 'PROCESSING':
    case 'ĐANG_XỬ_LÝ':
    case 'ĐANG XỬ LÝ':
      return 'ĐANG XỬ LÝ';
    case 'PLACED':
    case 'ĐÃ_TIẾP_NHẬN':
    case 'ĐÃ TIẾP NHẬN':
    case 'ĐÃ_ĐẶT_HÀNG':
    case 'ĐÃ ĐẶT HÀNG':
      return 'ĐÃ TIẾP NHẬN';
    case 'PAID':
    case 'ĐÃ_THANH_TOÁN':
    case 'ĐÃ THANH TOÁN':
      return 'ĐÃ THANH TOÁN';
    case 'SHIPPED':
    case 'ĐANG_GIAO_HÀNG':
    case 'ĐANG GIAO HÀNG':
    case 'ĐANG_GIAO':
    case 'ĐANG GIAO':
      return 'ĐANG GIAO HÀNG';
    case 'DELIVERED':
    case 'ĐÃ_GIAO_HÀNG':
    case 'ĐÃ GIAO HÀNG':
    case 'ĐÃ_GIAO':
    case 'ĐÃ GIAO':
    case 'COMPLETED':
      return 'ĐÃ GIAO HÀNG';
    case 'CANCELLED':
    case 'CANCELED':
    case 'ĐÃ_HỦY':
    case 'ĐÃ HỦY':
      return 'ĐÃ HỦY';
    case 'REFUNDED':
    case 'ĐÃ_HOÀN_TIỀN':
    case 'ĐÃ HOÀN TIỀN':
      return 'ĐÃ HOÀN TIỀN';
    case 'REFUND_CANCELLED':
    case 'TỪ_CHỐI_HOÀN_TIỀN':
    case 'TỪ CHỐI HOÀN TIỀN':
      return 'TỪ CHỐI HOÀN TIỀN';
    case 'EXPIRED':
    case 'HẾT_HẠN':
    case 'HẾT HẠN':
      return 'ĐÃ HẾT HẠN';
    default:
      if (upper.startsWith('TRẠNG THÁI CHUYỂN SANG:')) {
        const sub = clean.substring('TRẠNG THÁI CHUYỂN SANG:'.length).trim();
        return `Trạng thái chuyển sang: ${formatOrderStatus(sub)}`;
      }
      return clean;
  }
}

/**
 * Trả về class màu sắc Tailwind phù hợp cho từng trạng thái đơn hàng
 */
export function getOrderStatusBadgeClass(
  status?: string,
  isCancelled?: boolean,
  isPaid?: boolean,
): string {
  if (isCancelled) {
    return 'border border-red-200 bg-red-50 text-red-600';
  }
  if (isPaid) {
    return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  const upper = (status || '').toUpperCase().trim();
  switch (upper) {
    case 'PAID':
    case 'ĐÃ THANH TOÁN':
      return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'CANCELLED':
    case 'CANCELED':
    case 'ĐÃ HỦY':
    case 'EXPIRED':
    case 'ĐÃ HẾT HẠN':
      return 'border border-red-200 bg-red-50 text-red-600';
    case 'PROCESSING':
    case 'ĐANG XỬ LÝ':
      return 'border border-blue-200 bg-blue-50 text-blue-700';
    case 'SHIPPED':
    case 'ĐANG GIAO HÀNG':
      return 'border border-indigo-200 bg-indigo-50 text-indigo-700';
    case 'DELIVERED':
    case 'ĐÃ GIAO HÀNG':
      return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'PENDING':
    case 'PENDING_PAYMENT':
    case 'CREATED':
    case 'CHỜ THANH TOÁN':
    default:
      return 'border border-amber-200 bg-amber-50 text-amber-800';
  }
}
