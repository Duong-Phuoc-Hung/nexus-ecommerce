import { PlatformPolicy } from '../../domain/entities/PlatformPolicy';

export function getSeedPolicies(): PlatformPolicy[] {
  return [
    new PlatformPolicy({
      id: 'pol_auction_forfeit_01',
      category: 'AUCTION',
      policyCode: 'AUCTION_PAYMENT_FORFEIT',
      version: 'v1.2.0',
      title: 'Quy định thanh toán phiên thắng đấu giá và xử lý tiền đặt cọc',
      defaultValue: {
        pay_window_hours: 24,
        forfeit_deposit_percentage: 100,
        penalty_points: 10,
      },
      content:
        'Theo Điều 4.2 - Quy chế Đấu giá Nexus v1.2, người thắng phiên đấu giá bắt buộc phải hoàn tất thanh toán đơn hàng trong thời hạn quy định. Trường hợp quá hạn không thanh toán, giao dịch sẽ bị tự động hủy bỏ, người mua bị tịch thu toàn bộ tiền cọc để bồi hoàn cho chủ tài sản/người bán và bị xử phạt trừ điểm uy tín.',
      citationSource: 'Điều 4.2 - Quy chế Đấu giá Nexus v1.2',
      isActive: true,
    }),
    new PlatformPolicy({
      id: 'pol_refund_window_02',
      category: 'REFUND',
      policyCode: 'REFUND_RETURN_WINDOW',
      version: 'v1.2.0',
      title: 'Quy định thời hạn và điều kiện trả hàng / hoàn tiền',
      defaultValue: {
        return_window_days: 7,
        require_unboxing_video: true,
        full_refund_eligible: true,
      },
      content:
        'Theo Điều 3.1 - Quy chế Trả hàng & Hoàn tiền Nexus v1.2, người mua có quyền gửi yêu cầu khiếu nại trả hàng và hoàn tiền trong thời hạn cho phép kể từ khi nhận hàng thành công đối với các sản phẩm bị vỡ nát, sai mô tả hoặc lỗi từ phía người bán. Hồ sơ khiếu nại bắt buộc đính kèm video hoặc ảnh chụp mở hộp đối soát.',
      citationSource: 'Điều 3.1 - Quy chế Trả hàng & Hoàn tiền Nexus v1.2',
      isActive: true,
    }),
    new PlatformPolicy({
      id: 'pol_shipping_redelivery_03',
      category: 'SHIPPING',
      policyCode: 'SHIPPING_REDELIVERY_LIMIT',
      version: 'v1.2.0',
      title: 'Quy định số lần phát lại và chuyển hoàn hàng hóa',
      defaultValue: {
        max_redelivery_attempts: 3,
        free_redelivery: true,
        rto_auto_trigger: true,
      },
      content:
        'Theo Điều 5.3 - Chính sách Giao nhận & Logistics Nexus v1.2, đối tác vận chuyển sẽ hỗ trợ liên hệ và phát lại đơn hàng giao thất bại với số lần giới hạn trước khi kích hoạt quy trình chuyển hoàn về kho người bán (RTO).',
      citationSource: 'Điều 5.3 - Chính sách Giao nhận & Logistics Nexus v1.2',
      isActive: true,
    }),
  ];
}
