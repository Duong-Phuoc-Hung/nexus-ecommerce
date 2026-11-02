'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@/modules/auth/hooks/use-session';
import { ordersApi, type OrderListItem, type OrderDetail } from '@/modules/commerce/api/orders.api';
import { userMessage } from '@/lib/axios/http';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  currency,
  statusClass,
  PageHeading,
  DemoNote,
  OrdersTable,
} from '../components/seller-shared';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export function getSellerOrderStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'Chờ xử lý';
    case 'PROCESSING':
      return 'Đang xử lý';
    case 'SHIPPED':
      return 'Đang giao hàng';
    case 'DELIVERED':
      return 'Đã giao hàng';
    case 'CANCELLED':
      return 'Đã hủy';
    default:
      return status;
  }
}

export function SellerOrdersPage() {
  const { user } = useSession();
  const [items, setItems] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const search = useDebouncedValue(query, 500);

  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [cancelActing, setCancelActing] = useState(false);
  const [actionNotice, setActionNotice] = useState('');
  const [actionError, setActionError] = useState('');

  // Dialog state for order cancellation modal
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('Người bán hết hàng hoặc thay đổi thỏa thuận');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    ordersApi
      .list(
        {
          sellerId: user?.id,
          q: search.trim() || undefined,
          status: status !== 'ALL' ? status : undefined,
          limit: 50,
        },
        controller.signal,
      )
      .then((page) => setItems(page.items))
      .catch((err) => !controller.signal.aborted && setError(userMessage(err)))
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [user?.id, search, status]);

  async function handleViewDetail(orderId: string) {
    setDetailLoading(true);
    setActionNotice('');
    setActionError('');
    try {
      const detail = await ordersApi.getById(orderId);
      setSelectedOrder(detail);
    } catch (err) {
      setActionError(userMessage(err));
    } finally {
      setDetailLoading(false);
    }
  }

  function handleOpenCancelModal(orderId: string) {
    setCancelTargetId(orderId);
    setCancelReason('Người bán hết hàng hoặc thỏa thuận với người mua.');
    setCancelDialogOpen(true);
  }

  async function handleConfirmCancel(e: React.FormEvent) {
    e.preventDefault();
    if (!cancelTargetId || !cancelReason.trim()) return;

    setCancelActing(true);
    setActionNotice('');
    setActionError('');
    try {
      const updated = await ordersApi.cancel(cancelTargetId, cancelReason.trim());
      setSelectedOrder(updated);
      setItems((prev) =>
        prev.map((item) => (item.id === updated.id ? { ...item, status: updated.status } : item)),
      );
      setActionNotice('Đơn hàng đã được hủy thành công.');
      setCancelDialogOpen(false);
    } catch (err) {
      setActionError(userMessage(err));
    } finally {
      setCancelActing(false);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="KHÔNG GIAN NGƯỜI BÁN / ĐƠN HÀNG"
        title="Quản lý đơn hàng"
        description="Quản lý và tra cứu đơn hàng của gian hàng từ Commerce API."
      />
      <DemoNote message="Dữ liệu đơn hàng và chi tiết kết nối trực tiếp với Commerce Service." />

      <section className="seller-panel">
        <div className="seller-panel-heading">
          <div>
            <p className="seller-eyebrow">ĐƠN HÀNG CỦA SHOP</p>
            <h2>Danh sách đơn hàng</h2>
          </div>
          <span className="seller-muted">{loading ? 'Đang tải…' : `${items.length} đơn hàng`}</span>
        </div>

        <div className="seller-toolbar">
          <label className="seller-search">
            <span>⌕</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo mã đơn, sản phẩm hoặc người mua"
              aria-label="Tìm đơn hàng"
            />
          </label>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.75rem',
              color: '#687386',
            }}
          >
            <span>Trạng thái:</span>
            <div style={{ minWidth: 175 }}>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger aria-label="Lọc theo trạng thái đơn hàng">
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                  <SelectItem value="PENDING">Chờ xử lý</SelectItem>
                  <SelectItem value="PROCESSING">Đang xử lý</SelectItem>
                  <SelectItem value="SHIPPED">Đang giao hàng</SelectItem>
                  <SelectItem value="DELIVERED">Đã giao hàng</SelectItem>
                  <SelectItem value="CANCELLED">Đã hủy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <span className="seller-result-count">
            {loading ? 'Đang lọc…' : `${items.length} kết quả`}
          </span>
        </div>

        {loading ? (
          <p className="seller-readonly-note" style={{ padding: '20px' }}>
            Đang tải đơn hàng…
          </p>
        ) : error ? (
          <p className="seller-readonly-note" style={{ padding: '20px', color: '#c51c25' }}>
            {error}
          </p>
        ) : (
          <OrdersTable items={items} onViewDetail={handleViewDetail} />
        )}
      </section>

      {detailLoading && (
        <section className="seller-panel" style={{ padding: '20px' }}>
          <p className="seller-readonly-note">Đang tải chi tiết đơn hàng…</p>
        </section>
      )}

      {selectedOrder && (
        <section className="seller-panel" style={{ padding: '20px' }}>
          <div
            className="seller-panel-heading"
            style={{ margin: '-20px -20px 20px', borderBottom: '1px solid #edf0f3' }}
          >
            <div>
              <p className="seller-eyebrow">CHI TIẾT ĐƠN HÀNG · HỆ THỐNG</p>
              <h2>Mã đơn: {selectedOrder.id}</h2>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span className={`seller-status ${statusClass(selectedOrder.status)}`}>
                {getSellerOrderStatusLabel(selectedOrder.status)}
              </span>
              <button
                type="button"
                className="seller-button seller-button-quiet"
                onClick={() => setSelectedOrder(null)}
              >
                Đóng
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '15px',
              marginBottom: '20px',
              fontSize: '0.75rem',
            }}
          >
            <div>
              <p style={{ color: '#7e8a9c', margin: '0 0 4px' }}>Khách hàng (Người mua):</p>
              <strong>{selectedOrder.buyer}</strong>
              <div style={{ color: '#556477' }}>{selectedOrder.email}</div>
            </div>
            <div>
              <p style={{ color: '#7e8a9c', margin: '0 0 4px' }}>Tổng thanh toán:</p>
              <strong style={{ color: '#0f8a55', fontSize: '0.9rem' }}>
                {currency(selectedOrder.totalAmount)}
              </strong>
            </div>
            <div>
              <p style={{ color: '#7e8a9c', margin: '0 0 4px' }}>Mã vận đơn liên kết:</p>
              <code>{selectedOrder.tracking}</code>
            </div>
            <div>
              <p style={{ color: '#7e8a9c', margin: '0 0 4px' }}>Ngày tạo đơn:</p>
              <span>{new Date(selectedOrder.createdAt).toLocaleDateString('vi-VN')}</span>
            </div>
          </div>

          <div className="seller-table-wrap" style={{ marginBottom: '20px' }}>
            <table className="seller-table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Mã SKU</th>
                  <th>Số lượng</th>
                  <th>Đơn giá</th>
                  <th>Tổng</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrder.items.map((item, idx) => (
                  <tr key={`${item.productId}-${idx}`}>
                    <td>
                      <strong>{item.productName || item.productId}</strong>
                    </td>
                    <td>{item.productId}</td>
                    <td>{item.quantity}</td>
                    <td>{currency(item.unitPrice)}</td>
                    <td>{currency(item.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedOrder.timeline && selectedOrder.timeline.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '0.85rem', marginBottom: '10px', color: '#263247' }}>
                Diễn biến đơn hàng:
              </h3>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: '20px',
                  fontSize: '0.72rem',
                  color: '#596579',
                  display: 'grid',
                  gap: '6px',
                }}
              >
                {selectedOrder.timeline.map((step, idx) => (
                  <li key={idx}>
                    <strong>{step.title}</strong> —{' '}
                    {new Date(step.timestamp).toLocaleString('vi-VN')}
                    {step.note ? ` (${step.note})` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              borderTop: '1px solid #edf0f3',
              paddingTop: '15px',
            }}
          >
            {selectedOrder.status !== 'CANCELLED' && selectedOrder.status !== 'DELIVERED' && (
              <button
                type="button"
                className="seller-button-danger"
                disabled={cancelActing}
                onClick={() => handleOpenCancelModal(selectedOrder.id)}
              >
                {cancelActing ? 'Đang xử lý…' : 'Hủy đơn hàng'}
              </button>
            )}
            {actionNotice && (
              <span style={{ color: '#24784f', fontSize: '0.75rem', fontWeight: 600 }}>
                {actionNotice}
              </span>
            )}
            {actionError && (
              <span style={{ color: '#b32029', fontSize: '0.75rem', fontWeight: 600 }}>
                {actionError}
              </span>
            )}
          </div>
        </section>
      )}

      {/* Form Dialog Modal xác nhận hủy đơn hàng thay thế window.prompt */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="p-6 max-w-md w-full">
          <DialogTitle className="text-lg font-bold text-slate-800">
            Xác nhận hủy đơn hàng
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 mt-1">
            Bạn đang yêu cầu hủy đơn hàng <strong>{cancelTargetId}</strong>. Vui lòng cung cấp lý do
            hủy để thông báo cho khách hàng:
          </DialogDescription>
          <form onSubmit={handleConfirmCancel} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lý do hủy đơn hàng:
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 outline-none focus:outline-none focus:border-sky-400 focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:border-sky-400 transition-colors resize-none"
                placeholder="Nhập lý do hủy..."
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelDialogOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={cancelActing || !cancelReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 disabled:opacity-50 transition"
              >
                {cancelActing ? 'Đang hủy…' : 'Xác nhận hủy đơn'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
