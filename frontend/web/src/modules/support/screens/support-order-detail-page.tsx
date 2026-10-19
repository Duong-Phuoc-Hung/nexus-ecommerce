'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { orders, money, slug, Heading, DemoBanner } from '../components/support-shared';
export function SupportOrderDetailPage({ orderId }: { orderId: string }) {
  const order = orders.find((item) => item.id === orderId) ?? orders[0];
  const [notice, setNotice] = useState('');
  return (
    <>
      <Heading
        label="SUPPORT STAFF / ORDER DETAIL"
        title="Hồ sơ đơn hàng"
        description="Thông tin giao dịch, người mua/người bán và diễn biến trạng thái."
        action={
          <Link className="support-secondary-button" href="/support/orders">
            ← Danh sách đơn
          </Link>
        }
      />
      <DemoBanner />
      <div className="support-detail-grid">
        <section className="support-panel">
          <div className="support-panel-heading">
            <div>
              <p className="support-eyebrow">ORDER ID</p>
              <h2>{order.id}</h2>
            </div>
            <span className={`support-status ${slug(order.status)}`}>{order.status}</span>
          </div>
          <div className="support-detail-content">
            <div className="support-info-grid">
              <div>
                <small>Người mua</small>
                <strong>{order.buyer}</strong>
                <span>{order.email}</span>
              </div>
              <div>
                <small>Người bán</small>
                <strong>{order.seller}</strong>
                <span>seller@nexus.demo</span>
              </div>
              <div>
                <small>Sản phẩm</small>
                <strong>{order.product}</strong>
                <span>Số lượng: 1</span>
              </div>
              <div>
                <small>Tổng thanh toán</small>
                <strong>{money(order.total)}</strong>
                <span>Thanh toán: COD (demo)</span>
              </div>
              <div>
                <small>Mã vận đơn</small>
                <strong>{order.tracking}</strong>
                <span>Hãng vận chuyển: {order.tracking.startsWith('GHN') ? 'GHN' : 'GHTK'}</span>
              </div>
              <div>
                <small>Ngày đặt</small>
                <strong>{order.date}</strong>
                <span>Kênh: Nexus Marketplace</span>
              </div>
            </div>
          </div>
        </section>
        <section className="support-panel">
          <div className="support-panel-heading">
            <div>
              <p className="support-eyebrow">ORDER LIFECYCLE</p>
              <h2>Lịch sử trạng thái</h2>
            </div>
          </div>
          <ol className="support-timeline">
            <li className="complete">
              <span />
              <div>
                <strong>Đơn hàng được tạo</strong>
                <small>{order.date} · 09:12</small>
              </div>
            </li>
            <li className="complete">
              <span />
              <div>
                <strong>Đã xác nhận thanh toán</strong>
                <small>{order.date} · 09:14</small>
              </div>
            </li>
            <li className={order.status === 'Chờ xử lý' ? 'current' : 'complete'}>
              <span />
              <div>
                <strong>
                  {order.status === 'Chờ xử lý' ? 'Chờ người bán xử lý' : 'Đã bàn giao vận chuyển'}
                </strong>
                <small>18/10/2026 · 14:30</small>
              </div>
            </li>
            <li>
              <span />
              <div>
                <strong>Giao hàng hoàn tất</strong>
                <small>Chưa cập nhật</small>
              </div>
            </li>
          </ol>
        </section>
      </div>
      <section className="support-panel support-actions-panel">
        <div>
          <p className="support-eyebrow">SUPPORT ACTIONS · PREVIEW</p>
          <h2>Thao tác xử lý</h2>
          <p>Các nút chỉ minh họa giao diện, hiện chưa gọi API hay thay đổi đơn hàng.</p>
        </div>
        <div className="support-action-buttons">
          <button
            type="button"
            onClick={() => setNotice('Demo: thao tác hủy đơn chưa gửi lên BE.')}
          >
            Hủy đơn
          </button>
          <button
            type="button"
            onClick={() => setNotice('Demo: thao tác hoàn tiền chưa gửi lên BE.')}
          >
            Xử lý hoàn tiền
          </button>
          <button
            type="button"
            onClick={() => setNotice('Demo: thao tác cập nhật vận chuyển chưa gửi lên BE.')}
          >
            Cập nhật vận chuyển
          </button>
        </div>
        {notice && (
          <p className="support-action-notice" role="status">
            {notice}
          </p>
        )}
      </section>
    </>
  );
}
