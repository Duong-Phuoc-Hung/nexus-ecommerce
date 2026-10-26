'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ordersApi, type OrderDetail } from '@/modules/commerce/api/orders.api';
import { userMessage } from '@/lib/axios/http';
import { money, slug, Heading, DemoBanner } from '../components/support-shared';

export function SupportOrderDetailPage({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [acting, setActing] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setError('');
    ordersApi
      .getById(orderId, controller.signal)
      .then(setOrder)
      .catch((err) => !controller.signal.aborted && setError(userMessage(err)));
    return () => controller.abort();
  }, [orderId]);

  async function action(kind: 'cancel' | 'refund') {
    const defaultReason =
      kind === 'cancel'
        ? 'Xử lý từ màn hình Support Staff.'
        : 'Yêu cầu hoàn tiền được Support Staff xử lý.';
    const reason = window.prompt(
      `Nhập lý do ${kind === 'cancel' ? 'hủy đơn' : 'hoàn tiền'}:`,
      defaultReason,
    );
    if (reason === null || !reason.trim()) return;

    setActing(true);
    setNotice('');
    try {
      const updated =
        kind === 'cancel'
          ? await ordersApi.cancel(orderId, reason.trim())
          : await ordersApi.refund(orderId, reason.trim());
      setOrder(updated);
      setNotice(kind === 'cancel' ? 'Đơn hàng đã được hủy.' : 'Yêu cầu hoàn tiền đã được xử lý.');
    } catch (err) {
      setNotice(userMessage(err));
    } finally {
      setActing(false);
    }
  }

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
      <DemoBanner message="Chi tiết và thao tác đơn hàng sử dụng Commerce API." />
      {error ? (
        <div className="support-empty">{error}</div>
      ) : !order ? (
        <div className="support-empty">Đang tải đơn hàng…</div>
      ) : (
        <>
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
                    <span>{order.sellerId}</span>
                  </div>
                  <div>
                    <small>Sản phẩm chính</small>
                    <strong>
                      {order.items[0]?.productName ?? order.product ?? 'Đang cập nhật'}
                    </strong>
                    <span>Số lượng món: {order.items?.length ?? 1}</span>
                  </div>
                  <div>
                    <small>Tổng thanh toán</small>
                    <strong>{money(order.totalAmount)}</strong>
                    <span>Thanh toán: {order.paymentTransactionId ?? 'Đang cập nhật'}</span>
                  </div>
                  <div>
                    <small>Mã vận đơn</small>
                    <strong>{order.tracking}</strong>
                    <span>Kênh: Nexus Marketplace</span>
                  </div>
                  <div>
                    <small>Ngày đặt</small>
                    <strong>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</strong>
                    <span>Cập nhật: {new Date(order.updatedAt).toLocaleString('vi-VN')}</span>
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
                {(order.timeline || []).map((item, index) => (
                  <li
                    className={index === order.timeline.length - 1 ? 'current' : 'complete'}
                    key={`${item.status}-${item.timestamp}`}
                  >
                    <span />
                    <div>
                      <strong>{item.title}</strong>
                      <small>
                        {new Date(item.timestamp).toLocaleString('vi-VN')}
                        {item.note ? ` · ${item.note}` : ''}
                      </small>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>
          {order.items && order.items.length > 0 && (
            <section className="support-panel" style={{ padding: '17px 19px' }}>
              <h3 style={{ fontSize: '0.85rem', marginBottom: '12px', color: '#2c394d' }}>
                Danh sách sản phẩm trong đơn ({order.items.length})
              </h3>
              <div className="support-table-wrap">
                <table className="support-table">
                  <thead>
                    <tr>
                      <th>Mã SP</th>
                      <th>Tên sản phẩm</th>
                      <th>Số lượng</th>
                      <th>Đơn giá</th>
                      <th>Tổng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((it, idx) => (
                      <tr key={`${it.productId}-${idx}`}>
                        <td>
                          <strong>{it.productId}</strong>
                        </td>
                        <td>{it.productName || 'Sản phẩm Nexus'}</td>
                        <td>{it.quantity}</td>
                        <td>{money(it.unitPrice)}</td>
                        <td>{money(it.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          <section className="support-panel support-actions-panel">
            <div>
              <p className="support-eyebrow">SUPPORT ACTIONS · API</p>
              <h2>Thao tác xử lý</h2>
              <p>
                Thao tác gửi request tới Commerce API và tuân theo quyền của tài khoản hiện tại.
              </p>
            </div>
            <div className="support-action-buttons">
              <button type="button" disabled={acting} onClick={() => action('cancel')}>
                Hủy đơn
              </button>
              <button type="button" disabled={acting} onClick={() => action('refund')}>
                Xử lý hoàn tiền
              </button>
            </div>
            {notice && (
              <p className="support-action-notice" role="status">
                {notice}
              </p>
            )}
          </section>
        </>
      )}
    </>
  );
}
