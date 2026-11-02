/**
 * Cấu hình thông tin thanh toán chuyển khoản và mã QR cho Buyer
 * Bạn có thể thay đổi đường dẫn ảnh, tên tài khoản hoặc số tài khoản tại đây.
 */
export const PAYMENT_QR_CONFIG = {
  // Đường dẫn ảnh QR trong thư mục public
  // Để thay ảnh QR khác: dán đè file vào 'frontend/web/public/images/vietqr-payment.jpg'
  // hoặc đổi tên file bên dưới.
  imageUrl: '/images/vietqr-payment.jpg',

  // Tên chủ tài khoản thụ hưởng
  accountName: 'PHAM VO HUNG NGHI',

  // Số tài khoản / Số điện thoại ví MoMo
  accountNumber: '*******125',

  // Tên ngân hàng / Ví điện tử
  bankName: 'MoMo / Napas 247 (VietQR)',

  // Cú pháp nội dung chuyển khoản mẫu
  transferNotePrefix: 'NEXUS',

  // Hướng dẫn thanh toán cho người mua
  instructions: [
    'Mở ứng dụng Ngân hàng hoặc ví MoMo để quét mã VietQR.',
    'Kiểm tra tên người nhận: PHAM VO HUNG NGHI.',
    'Nhập đúng số tiền và nội dung chuyển khoản theo mã đơn hàng.',
    'Hệ thống sẽ tự động xác nhận đơn ngay khi nhận được thanh toán.',
  ],
};
