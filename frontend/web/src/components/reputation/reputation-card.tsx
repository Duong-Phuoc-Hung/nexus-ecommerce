import type { FC } from 'react';
import { ReputationBadge } from './reputation-badge';

export interface ReputationMetricItem {
  label: string;
  value: string | number;
  description: string;
  status?: 'success' | 'info' | 'warning';
}

export interface ReputationCardProps {
  score: number;
  totalOrders?: number;
  completionRate?: string;
  disputeRate?: string;
  sellerName?: string;
}

export const ReputationCard: FC<ReputationCardProps> = ({
  score,
  totalOrders = 158,
  completionRate = '99.4%',
  disputeRate = '0.0%',
  sellerName = 'Nexus Seller',
}) => {
  const metrics: ReputationMetricItem[] = [
    {
      label: 'Tỷ lệ hoàn tất đơn hàng',
      value: completionRate,
      description: 'Dựa trên 158 đơn hàng trong 90 ngày qua',
      status: 'success',
    },
    {
      label: 'Tỷ lệ khiếu nại tranh chấp',
      value: disputeRate,
      description: '0 vụ khiếu nại phát sinh từ người mua',
      status: 'success',
    },
    {
      label: 'Thời gian xử lý & bàn giao kho',
      value: '< 4 giờ',
      description: 'Đáp ứng tiêu chuẩn giao vận siêu tốc của sàn',
      status: 'info',
    },
    {
      label: 'Vi phạm quy chế bán hàng',
      value: '0',
      description: 'Tuân thủ 100% chính sách chống hàng giả',
      status: 'success',
    },
  ];

  return (
    <div className="reputation-card-container">
      <div className="reputation-card-header">
        <div>
          <span className="seller-eyebrow">CHỈ SỐ UY TÍN & BẢO ĐẢM</span>
          <h3>Hồ sơ tín nhiệm của {sellerName}</h3>
          <p className="seller-muted">
            Hệ thống tính điểm uy tín dựa trên dữ liệu giao dịch thực tế, tốc độ đóng gói và phản
            hồi khách hàng.
          </p>
        </div>
        <div className="reputation-card-badge-wrap">
          <ReputationBadge score={score} size="lg" />
        </div>
      </div>

      <div className="reputation-card-metrics-grid">
        {metrics.map((m) => (
          <div key={m.label} className={`reputation-metric-box status-${m.status || 'info'}`}>
            <span className="metric-label">{m.label}</span>
            <strong className="metric-value">{m.value}</strong>
            <small className="metric-desc">{m.description}</small>
          </div>
        ))}
      </div>

      <div className="reputation-perks-section">
        <h4>Quyền lợi đặc quyền của hạng uy tín cao:</h4>
        <ul className="reputation-perks-list">
          <li>
            <span>✓</span> Được tạo phiên đấu giá trực tiếp (Live Auction) không giới hạn giá trị
            sàn
          </li>
          <li>
            <span>✓</span> Miễn ký quỹ bảo lãnh thanh toán trung gian khi rút tiền nhanh 24/7
          </li>
          <li>
            <span>✓</span> Gắn nhãn <strong>Người Bán Uy Tín (Verified Trust Seller)</strong> trên
            trang sản phẩm
          </li>
          <li>
            <span>✓</span> Ưu tiên xuất hiện đầu tiên trên bộ lọc tìm kiếm sản phẩm và trang chủ
          </li>
        </ul>
      </div>
    </div>
  );
};
