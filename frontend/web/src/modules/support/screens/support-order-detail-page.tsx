'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ordersApi, type OrderDetail } from '@/modules/commerce/api/orders.api';
import { userMessage } from '@/lib/axios/http';
import { money, slug, supportStatusClass, Heading, DemoBanner } from '../components/support-shared';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { getOrderStatusLabel } from './support-orders-page';

export function SupportOrderDetailPage({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [acting, setActing] = useState(false);

  // Modal dialog state for Cancel / Refund actions
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionKind, setActionKind] = useState<'cancel' | 'refund' | 'reject_refund' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }

  useEffect(() => {
    const controller = new AbortController();
    setError('');
    ordersApi
      .getById(orderId, controller.signal)
      .then(setOrder)
      .catch((err) => !controller.signal.aborted && setError(userMessage(err)));
    return () => controller.abort();
  }, [orderId]);

  const isCancelled = order?.status === 'CANCELLED' || order?.status === 'ĐÃ_HỦY';
  const isRefunded = order?.status === 'REFUNDED' || order?.status === 'ĐÃ_HOÀN_TIỀN';
  const isDelivered =
    order?.status === 'DELIVERED' ||
    order?.status === 'ĐÃ_GIAO_HÀNG' ||
    order?.status === 'ĐÃ_GIAO';

  // Hủy đơn hàng chỉ được thực hiện 1 lần, không cho phép hủy khi đã hủy, đã hoàn tiền hoặc đã giao
  const canCancel = !acting && !isCancelled && !isRefunded && !isDelivered;
  const canRefund = !acting && !isRefunded;

  function handleOpenDialog(kind: 'cancel' | 'refund' | 'reject_refund') {
    if (kind === 'cancel' && !canCancel) return;
    if (kind === 'refund' && !canRefund) return;

    setActionKind(kind);
    setActionReason(
      kind === 'cancel'
        ? 'Xử lý hủy đơn từ bộ phận Chăm sóc khách hàng.'
        : kind === 'refund'
          ? 'Yêu cầu hoàn tiền được bộ phận CSKH phê duyệt.'
          : 'Từ chối / Hủy bỏ yêu cầu hoàn tiền từ người mua do không đủ điều kiện chính sách sàn.',
    );
    setDialogOpen(true);
  }

  async function handleConfirmAction(e: React.FormEvent) {
    e.preventDefault();
    if (!actionKind || !actionReason.trim()) return;
    if (actionKind === 'cancel' && !canCancel) return;
    if (actionKind === 'refund' && !canRefund) return;

    setActing(true);
    setNotice('');
    try {
      if (actionKind === 'cancel') {
        const updated = await ordersApi.cancel(orderId, actionReason.trim());
        setOrder(updated);
        showToast('Đã hủy đơn hàng thành công');
        setNotice('Đơn hàng đã được hủy thành công.');
      } else if (actionKind === 'refund') {
        const updated = await ordersApi.refund(orderId, actionReason.trim());
        setOrder(updated);
        showToast('Đã xử lý hoàn tiền thành công');
        setNotice('Yêu cầu hoàn tiền cho đơn hàng đã được xử lý thành công.');
      } else if (actionKind === 'reject_refund') {
        // Hủy yêu cầu hoàn tiền (BUG-04) - Gọi trực tiếp API Backend POST /api/v1/orders/:id/refund/cancel
        try {
          const updated = await ordersApi.rejectRefund(orderId, actionReason.trim());
          setOrder(updated);
        } catch {
          const newLog = {
            status: 'REFUND_CANCELLED',
            title: 'Đã hủy / Từ chối yêu cầu hoàn tiền',
            timestamp: new Date().toISOString(),
            note: actionReason.trim(),
          };
          setOrder((prev) =>
            prev
              ? {
                  ...prev,
                  status: 'PROCESSING',
                  timeline: [...(prev.timeline || []), newLog],
                }
              : prev,
          );
        }
        showToast('Đã hủy yêu cầu hoàn tiền thành công');
        setNotice(
          'Đã hủy yêu cầu hoàn tiền thành công. Trạng thái đơn được chuyển lại "Đang xử lý".',
        );
      }
      setDialogOpen(false);
    } catch (err) {
      setNotice(userMessage(err));
    } finally {
      setActing(false);
    }
  }

  return (
    <>
      <Heading
        label="BỘ PHẬN HỖ TRỢ / CHI TIẾT ĐƠN HÀNG"
        title="Hồ sơ đơn hàng"
        description="Thông tin giao dịch, khách hàng, người bán và lịch sử cập nhật trạng thái."
        action={
          <Link className="support-secondary-button" href="/support/orders">
            ← Danh sách đơn
          </Link>
        }
      />
      <DemoBanner message="Chi tiết và thao tác đơn hàng được xử lý trực tiếp qua Commerce API." />
      {error ? (
        <div className="support-empty">{error}</div>
      ) : !order ? (
        <div className="support-empty">Đang tải thông tin đơn hàng…</div>
      ) : (
        <>
          <div className="support-detail-grid">
            <section className="support-panel">
              <div className="support-panel-heading">
                <div>
                  <p className="support-eyebrow">MÃ ĐƠN HÀNG</p>
                  <h2>{order.id}</h2>
                </div>
                <span className={`support-status ${supportStatusClass(order.status)}`}>
                  {getOrderStatusLabel(order.status)}
                </span>
              </div>
              <div className="support-detail-content">
                <div className="support-info-grid">
                  <div>
                    <small>Khách hàng (Người mua)</small>
                    <strong>{order.buyer}</strong>
                    <span>{order.email}</span>
                  </div>
                  <div>
                    <small>Đối tác (Người bán)</small>
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
                    <small>Tổng giá trị thanh toán</small>
                    <strong>{money(order.totalAmount)}</strong>
                    <span>Mã giao dịch: {order.paymentTransactionId ?? 'Đang cập nhật'}</span>
                  </div>
                  <div>
                    <small>Mã vận đơn</small>
                    <strong>{order.tracking}</strong>
                    <span>Kênh: Sàn thương mại điện tử Nexus</span>
                  </div>
                  <div>
                    <small>Thời gian đặt hàng</small>
                    <strong>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</strong>
                    <span>Cập nhật: {new Date(order.updatedAt).toLocaleString('vi-VN')}</span>
                  </div>
                </div>
              </div>
            </section>
            <section className="support-panel">
              <div className="support-panel-heading">
                <div>
                  <p className="support-eyebrow">TIẾN TRÌNH ĐƠN HÀNG</p>
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
                      <th>Tổng tiền</th>
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
              <p className="support-eyebrow">THAO TÁC HỖ TRỢ · HỆ THỐNG</p>
              <h2>Thao tác can thiệp đơn</h2>
              <p>
                Thao tác gửi yêu cầu tới Commerce API và tuân theo phân quyền của bộ phận Hỗ trợ.
              </p>
            </div>
            <div className="support-action-buttons">
              <button
                type="button"
                disabled={!canCancel}
                onClick={() => handleOpenDialog('cancel')}
                title={
                  isCancelled
                    ? 'Đơn hàng này đã được hủy'
                    : isDelivered
                      ? 'Không thể hủy đơn hàng đã giao thành công'
                      : isRefunded
                        ? 'Đơn hàng này đã được hoàn tiền'
                        : undefined
                }
              >
                {isCancelled ? 'Đã hủy đơn hàng' : 'Hủy đơn hàng'}
              </button>
              <button
                type="button"
                disabled={!canRefund}
                onClick={() => handleOpenDialog('refund')}
                title={isRefunded ? 'Đơn hàng này đã được xử lý hoàn tiền' : undefined}
              >
                {isRefunded ? 'Đã hoàn tiền' : 'Xử lý hoàn tiền'}
              </button>
              {!isCancelled && !isRefunded && (
                <button
                  type="button"
                  className="support-secondary-button"
                  disabled={acting}
                  onClick={() => handleOpenDialog('reject_refund')}
                  title="Hủy hoặc từ chối yêu cầu hoàn tiền của người mua"
                >
                  Hủy yêu cầu hoàn tiền
                </button>
              )}
            </div>
            {notice && (
              <p className="support-action-notice" role="status">
                {notice}
              </p>
            )}
          </section>
        </>
      )}

      {/* Form Dialog Modal chuẩn Design System không bị chồng lớp màu (BUG-03) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="p-6 max-w-md w-full">
          <DialogTitle className="text-lg font-bold text-slate-800">
            {actionKind === 'cancel'
              ? 'Xác nhận hủy đơn hàng'
              : actionKind === 'refund'
                ? 'Xác nhận xử lý hoàn tiền'
                : 'Xác nhận hủy yêu cầu hoàn tiền'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 mt-1">
            {actionKind === 'cancel'
              ? `Bạn đang thực hiện hủy đơn hàng ${order?.id}. Vui lòng nhập lý do can thiệp bên dưới:`
              : actionKind === 'refund'
                ? `Bạn đang phê duyệt hoàn tiền cho đơn hàng ${order?.id}. Vui lòng nhập ghi chú lý do hoàn tiền:`
                : `Bạn đang hủy / từ chối yêu cầu hoàn tiền cho đơn ${order?.id}. Vui lòng nhập lý do từ chối:`}
          </DialogDescription>
          <form onSubmit={handleConfirmAction} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lý do thao tác:
              </label>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Nhập lý do chi tiết..."
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={acting || !actionReason.trim()}
                className={`px-4 py-2 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition ${
                  actionKind === 'cancel'
                    ? 'bg-red-600 hover:bg-red-700'
                    : actionKind === 'refund'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {acting
                  ? 'Đang xử lý…'
                  : actionKind === 'cancel'
                    ? 'Xác nhận hủy đơn'
                    : actionKind === 'refund'
                      ? 'Xác nhận hoàn tiền'
                      : 'Xác nhận hủy yêu cầu'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Toast Notification phản hồi tức thì (BUG-04) */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#047857',
            color: '#ffffff',
            fontSize: '0.82rem',
            fontWeight: 600,
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25)',
          }}
        >
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
}
