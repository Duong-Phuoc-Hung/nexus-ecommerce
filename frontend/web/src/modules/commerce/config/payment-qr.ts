/**
 * Cấu hình thông tin thanh toán chuyển khoản và mã QR cho Buyer
 * Bạn có thể thay đổi đường dẫn ảnh, tên tài khoản hoặc số tài khoản tại đây.
 */
export const PAYMENT_QR_CONFIG = {
  // Cổng thanh toán PayOS
  gatewayName: 'PayOS VietQR 24/7',
  accountName: 'PHAM VO HUNG NGHI',
  bankName: 'Cổng thanh toán PayOS (Napas VietQR 24/7)',
  transferNotePrefix: 'NEXUS',
  instructions: [
    'Hệ thống sẽ kết nối an toàn với Cổng thanh toán PayOS.',
    'Quét mã VietQR động được tạo riêng cho đơn hàng của bạn.',
    'Cổng PayOS sẽ đối soát tự động và hiển thị thành công ngay tức thì.',
  ],
};

const PAID_ORDERS_KEY = 'nexus_paid_orders';

/** Ghi nhận đơn hàng đã thanh toán thành công trên trình duyệt của Buyer */
export function markOrderAsPaid(orderId: string): void {
  if (typeof window === 'undefined' || !orderId) return;
  try {
    const raw = localStorage.getItem(PAID_ORDERS_KEY) || '[]';
    const list = JSON.parse(raw);
    if (!list.includes(orderId)) {
      list.push(orderId);
      localStorage.setItem(PAID_ORDERS_KEY, JSON.stringify(list));
    }
  } catch {}
}

/** Kiểm tra xem đơn hàng đã được người mua thanh toán thành công chưa */
export function isOrderMarkedPaid(orderId: string): boolean {
  if (typeof window === 'undefined' || !orderId) return false;
  try {
    const raw = localStorage.getItem(PAID_ORDERS_KEY) || '[]';
    const list = JSON.parse(raw);
    return Array.isArray(list) && list.includes(orderId);
  } catch {
    return false;
  }
}

/** Xóa đơn hàng khỏi danh sách đã thanh toán khi đơn bị hủy */
export function removeOrderFromPaid(orderId: string): void {
  if (typeof window === 'undefined' || !orderId) return;
  try {
    const raw = localStorage.getItem(PAID_ORDERS_KEY) || '[]';
    const list = JSON.parse(raw);
    const updated = list.filter((id: string) => id !== orderId);
    localStorage.setItem(PAID_ORDERS_KEY, JSON.stringify(updated));
  } catch {}
}
